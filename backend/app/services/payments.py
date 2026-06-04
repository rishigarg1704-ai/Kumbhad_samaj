from __future__ import annotations

import base64
import hashlib
import hmac
import html
import json
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import HTTPException, status
from sqlalchemy import and_, desc, func, or_, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth import UserProfile
from app.core.config import settings
from app.db.models import AuditLog, Family, Membership, MembershipFeeHistory, Payment, PaymentWebhookEvent, User

RECEIPT_NUMBER_LOCK_KEY = 920232


class WebhookValidationError(ValueError):
    pass


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _today() -> date:
    return _utcnow().date()


def _money_to_paise(amount: Decimal) -> int:
    return int((Decimal(amount) * Decimal("100")).quantize(Decimal("1")))


def create_razorpay_order(amount: Decimal, receipt: str, notes: dict[str, str] | None = None) -> dict:
    if not settings.razorpay_key_id or not settings.razorpay_key_secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Razorpay is not configured")
    payload = json.dumps(
        {
            "amount": _money_to_paise(amount),
            "currency": settings.razorpay_currency,
            "receipt": receipt,
            "payment_capture": 1,
            "notes": notes or {},
        }
    ).encode("utf-8")
    token = base64.b64encode(f"{settings.razorpay_key_id}:{settings.razorpay_key_secret}".encode("utf-8")).decode("ascii")
    request = Request(
        "https://api.razorpay.com/v1/orders",
        data=payload,
        headers={
            "Authorization": f"Basic {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=15) as response:
            order = json.loads(response.read().decode("utf-8"))
    except (HTTPError, TimeoutError, URLError) as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Razorpay order creation failed") from exc

    if not order.get("id"):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Razorpay order response was invalid")
    return order


def _active_fee_query():
    today = _today()
    return (
        select(MembershipFeeHistory)
        .where(
            MembershipFeeHistory.deleted_at.is_(None),
            MembershipFeeHistory.effective_from <= today,
            or_(MembershipFeeHistory.effective_to.is_(None), MembershipFeeHistory.effective_to >= today),
        )
        .order_by(desc(MembershipFeeHistory.effective_from))
        .limit(1)
    )


def _get_active_fee(db: Session) -> MembershipFeeHistory:
    fee = db.execute(_active_fee_query()).scalar_one_or_none()
    if not fee:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Active membership fee is not configured")
    return fee


def _create_audit_log(
    db: Session,
    *,
    actor_type: str,
    action: str,
    entity_type: str,
    entity_id: str | None,
    before_state: dict | None,
    after_state: dict | None,
    ip_address: str | None,
    user_agent: str | None,
) -> None:
    db.add(
        AuditLog(
            actor_type=actor_type,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            before_state=json.dumps(before_state) if before_state is not None else None,
            after_state=json.dumps(after_state) if after_state is not None else None,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    )


def _verify_webhook_signature(raw_body: bytes, signature: str | None) -> None:
    if not settings.razorpay_webhook_secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Razorpay webhook secret is not configured")
    if not signature:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Razorpay signature is required")
    digest = hmac.new(settings.razorpay_webhook_secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(digest, signature):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Razorpay signature verification failed")


def _extract_payment_entity(payload: dict) -> dict:
    entity = payload.get("payload", {}).get("payment", {}).get("entity")
    if not isinstance(entity, dict):
        raise WebhookValidationError("Razorpay payment entity is missing")
    return entity


def _target_status(event_type: str, entity: dict) -> str:
    provider_status = entity.get("status")
    if event_type == "payment.captured" and provider_status == "captured":
        return "success"
    if event_type == "payment.failed" or provider_status == "failed":
        return "failed"
    raise WebhookValidationError(f"Unsupported Razorpay payment event: {event_type}")


def _paid_at_from_entity(entity: dict) -> datetime:
    created_at = entity.get("created_at")
    if isinstance(created_at, int):
        return datetime.fromtimestamp(created_at, tz=timezone.utc)
    return _utcnow()


def _generate_receipt_number(db: Session) -> str:
    db.execute(text("SELECT pg_advisory_xact_lock(:lock_key)"), {"lock_key": RECEIPT_NUMBER_LOCK_KEY})
    prefix = settings.receipt_number_prefix.strip().upper()
    width = settings.receipt_number_width
    latest = db.execute(
        select(Payment.receipt_number)
        .where(Payment.receipt_number.is_not(None), Payment.receipt_number.like(f"{prefix}-%"))
        .order_by(Payment.receipt_number.desc())
        .limit(1)
    ).scalar_one_or_none()
    next_number = 1
    if latest:
        try:
            next_number = int(latest.split("-")[-1]) + 1
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Invalid receipt number state") from exc
    return f"{prefix}-{next_number:0{width}d}"


def _ensure_success_receipt(db: Session, payment: Payment) -> None:
    if payment.receipt_number:
        return
    payment.receipt_number = _generate_receipt_number(db)
    payment.receipt_generated_at = _utcnow()


def _validate_provider_payment_identity(db: Session, payment: Payment, provider_payment_id: str | None) -> None:
    if not provider_payment_id:
        raise WebhookValidationError("Razorpay payment ID is missing")
    existing = db.execute(
        select(Payment).where(
            Payment.provider_payment_id == provider_payment_id,
            Payment.id != payment.id,
        )
    ).scalar_one_or_none()
    if existing:
        raise WebhookValidationError("Razorpay payment ID is already linked to another payment")


def _validate_payment_match(payment: Payment, entity: dict, provider_payment_id: str | None) -> None:
    if entity.get("order_id") != payment.provider_order_id:
        raise WebhookValidationError("Razorpay order ID does not match internal payment record")
    if int(entity.get("amount", -1)) != _money_to_paise(payment.amount):
        raise WebhookValidationError("Razorpay amount does not match internal payment record")
    if entity.get("currency") != payment.currency:
        raise WebhookValidationError("Razorpay currency does not match internal payment record")
    if payment.provider_payment_id and provider_payment_id and payment.provider_payment_id != provider_payment_id:
        raise WebhookValidationError("Razorpay payment ID does not match existing internal payment record")


def _activate_membership(payment: Payment, membership: Membership) -> None:
    today = _today()
    membership.status = "active"
    if not membership.start_date:
        membership.start_date = today
    membership.expiry_date = today + timedelta(days=settings.membership_validity_days)
    payment.user.status = "active"


def _renew_membership(payment: Payment, membership: Membership) -> None:
    today = _today()
    base_date = membership.expiry_date if membership.expiry_date and membership.expiry_date > today else today
    membership.status = "active"
    if not membership.start_date:
        membership.start_date = today
    membership.expiry_date = base_date + timedelta(days=settings.membership_validity_days)
    payment.user.status = "active"


def _mark_webhook_failed(
    db: Session,
    event: PaymentWebhookEvent,
    message: str,
    *,
    ip_address: str | None,
    user_agent: str | None,
) -> None:
    event.error_message = message
    _create_audit_log(
        db,
        actor_type="system",
        action="razorpay_webhook_failed",
        entity_type="payment_webhook_event",
        entity_id=event.id,
        before_state=None,
        after_state={
            "provider_event_id": event.provider_event_id,
            "event_type": event.event_type,
            "error": message,
        },
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.commit()


def process_razorpay_webhook(
    db: Session,
    *,
    raw_body: bytes,
    signature: str | None,
    event_id: str | None,
    ip_address: str | None,
    user_agent: str | None,
) -> dict:
    _verify_webhook_signature(raw_body, signature)
    if not event_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Razorpay event ID is required")
    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Razorpay payload is invalid JSON") from exc

    existing_event = db.execute(
        select(PaymentWebhookEvent).where(PaymentWebhookEvent.provider_event_id == event_id)
    ).scalar_one_or_none()
    if existing_event:
        existing_event.replay_count += 1
        db.commit()
        return {"processed": existing_event.processed, "idempotent": True}

    event_type = payload.get("event")
    if not isinstance(event_type, str):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Razorpay event type is required")

    try:
        entity = _extract_payment_entity(payload)
    except WebhookValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    provider_order_id = entity.get("order_id")
    provider_payment_id = entity.get("id")
    webhook_event = PaymentWebhookEvent(
        provider="razorpay",
        provider_event_id=event_id,
        event_type=event_type,
        provider_order_id=provider_order_id,
        provider_payment_id=provider_payment_id,
        raw_payload_hash=hashlib.sha256(raw_body).hexdigest(),
    )
    db.add(webhook_event)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        existing_event = db.execute(
            select(PaymentWebhookEvent).where(PaymentWebhookEvent.provider_event_id == event_id)
        ).scalar_one_or_none()
        if existing_event:
            existing_event.replay_count += 1
            db.commit()
            return {"processed": existing_event.processed, "idempotent": True}
        raise

    try:
        target_status = _target_status(event_type, entity)
        if not provider_order_id:
            raise WebhookValidationError("Razorpay order ID is missing")
        payment = db.execute(
            select(Payment)
            .where(Payment.provider == "razorpay", Payment.provider_order_id == provider_order_id)
            .with_for_update()
        ).scalar_one_or_none()
        if not payment:
            raise WebhookValidationError("Internal payment record was not found")
        _validate_provider_payment_identity(db, payment, provider_payment_id)
        _validate_payment_match(payment, entity, provider_payment_id)

        membership = db.execute(
            select(Membership).where(Membership.id == payment.membership_id).with_for_update()
        ).scalar_one_or_none()
        if not membership:
            raise WebhookValidationError("Internal membership record was not found")

        before_state = {
            "payment_status": payment.status,
            "membership_status": membership.status,
            "membership_expiry_date": str(membership.expiry_date) if membership.expiry_date else None,
        }

        if payment.status in {"success", "failed", "refunded"}:
            if payment.status != target_status:
                raise WebhookValidationError("Webhook conflicts with terminal internal payment status")
            if payment.status == "success":
                _ensure_success_receipt(db, payment)
            webhook_event.processed = True
            webhook_event.processed_at = _utcnow()
            db.commit()
            return {"processed": True, "idempotent": False}

        payment.provider_payment_id = provider_payment_id
        if target_status == "success":
            payment.status = "success"
            payment.paid_at = _paid_at_from_entity(entity)
            _ensure_success_receipt(db, payment)
            if payment.payment_type == "registration":
                _activate_membership(payment, membership)
            elif payment.payment_type == "renewal":
                _renew_membership(payment, membership)
            else:
                raise WebhookValidationError("Internal payment type is unsupported")
        elif target_status == "failed":
            payment.status = "failed"
        else:
            raise WebhookValidationError("Internal target status is unsupported")

        webhook_event.processed = True
        webhook_event.processed_at = _utcnow()
        _create_audit_log(
            db,
            actor_type="system",
            action="razorpay_webhook_processed",
            entity_type="payment",
            entity_id=payment.id,
            before_state=before_state,
            after_state={
                "payment_status": payment.status,
                "provider_order_id": payment.provider_order_id,
                "provider_payment_id": payment.provider_payment_id,
                "membership_status": membership.status,
                "membership_expiry_date": str(membership.expiry_date) if membership.expiry_date else None,
                "receipt_number": payment.receipt_number,
            },
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.commit()
        return {"processed": True, "idempotent": False}
    except WebhookValidationError as exc:
        _mark_webhook_failed(db, webhook_event, str(exc), ip_address=ip_address, user_agent=user_agent)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


def _member_db_user(db: Session, profile: UserProfile) -> User:
    if profile.role != "member":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    user = db.execute(
        select(User).where(
            User.email == profile.email.strip().lower(),
            User.deleted_at.is_(None),
        )
    ).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member record not found")
    if user.status == "suspended" or profile.is_suspended:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Member is suspended")
    return user


def _membership_belongs_to_user(db: Session, user: User, membership_id: str) -> Membership:
    membership = db.execute(
        select(Membership)
        .join(Family, Membership.family_id == Family.id)
        .where(
            Membership.id == membership_id,
            Family.head_user_id == user.id,
            Membership.deleted_at.is_(None),
            Family.deleted_at.is_(None),
        )
    ).scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found")
    return membership


def _ensure_renewal_eligible(membership: Membership) -> None:
    if membership.status not in {"active", "expired"}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Membership is not eligible for renewal")
    if membership.status == "active" and membership.expiry_date:
        renewal_start = _today() + timedelta(days=settings.renewal_window_days)
        if membership.expiry_date > renewal_start:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Membership is not yet eligible for renewal")


def create_renewal_order(
    db: Session,
    profile: UserProfile,
    membership_id: str,
    *,
    ip_address: str | None,
    user_agent: str | None,
) -> Payment:
    user = _member_db_user(db, profile)
    membership = _membership_belongs_to_user(db, user, membership_id)
    _ensure_renewal_eligible(membership)
    existing_pending = db.execute(
        select(Payment).where(
            Payment.membership_id == membership.id,
            Payment.payment_type == "renewal",
            Payment.status == "pending",
        )
    ).scalar_one_or_none()
    if existing_pending:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A pending renewal payment already exists")
    fee = _get_active_fee(db)
    receipt = f"ren-{membership.membership_number.lower()}-{_utcnow().strftime('%Y%m%d%H%M%S')}"
    order = create_razorpay_order(
        Decimal(fee.renewal_fee_amount),
        receipt[:40],
        notes={
            "payment_type": "renewal",
            "membership_id": membership.id,
            "membership_number": membership.membership_number,
        },
    )
    payment = Payment(
        user_id=user.id,
        family_id=membership.family_id,
        membership_id=membership.id,
        fee_history_id=fee.id,
        payment_type="renewal",
        provider="razorpay",
        provider_order_id=order["id"],
        status="pending",
        amount=fee.renewal_fee_amount,
        currency=settings.razorpay_currency,
    )
    db.add(payment)
    db.flush()
    _create_audit_log(
        db,
        actor_type="member",
        action="renewal_order_created",
        entity_type="payment",
        entity_id=payment.id,
        before_state=None,
        after_state={
            "payment_id": payment.id,
            "membership_id": membership.id,
            "provider_order_id": payment.provider_order_id,
            "amount": str(payment.amount),
            "currency": payment.currency,
        },
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.commit()
    db.refresh(payment)
    return payment


def list_member_payments(
    db: Session,
    profile: UserProfile,
    *,
    page: int,
    page_size: int,
    sort_by: str,
    sort_order: str,
    payment_status: str | None,
    start_date: date | None,
    end_date: date | None,
) -> tuple[list[Payment], int]:
    user = _member_db_user(db, profile)
    filters = [Payment.user_id == user.id]
    if payment_status:
        filters.append(Payment.status == payment_status)
    if start_date:
        filters.append(func.date(Payment.created_at) >= start_date)
    if end_date:
        filters.append(func.date(Payment.created_at) <= end_date)
    query = select(Payment).where(and_(*filters))
    total = db.execute(select(func.count()).select_from(query.subquery())).scalar_one()
    sort_column = {
        "created_at": Payment.created_at,
        "paid_at": Payment.paid_at,
        "amount": Payment.amount,
        "status": Payment.status,
    }[sort_by]
    if sort_order == "desc":
        sort_column = sort_column.desc()
    items = db.execute(query.order_by(sort_column).offset((page - 1) * page_size).limit(page_size)).scalars().all()
    return list(items), int(total)


def get_member_payment(db: Session, profile: UserProfile, payment_id: str) -> Payment:
    user = _member_db_user(db, profile)
    payment = db.execute(select(Payment).where(Payment.id == payment_id, Payment.user_id == user.id)).scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    return payment


def get_successful_member_payment(db: Session, profile: UserProfile, payment_id: str) -> Payment:
    payment = get_member_payment(db, profile, payment_id)
    if payment.status != "success":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Receipt is available only for successful payments")
    if not payment.paid_at:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Successful payment is missing paid timestamp")
    if not payment.receipt_number:
        _ensure_success_receipt(db, payment)
        db.commit()
        db.refresh(payment)
    return payment


def render_receipt_html(payment: Payment) -> str:
    membership = payment.membership
    family = payment.family
    user = payment.user
    paid_at = payment.paid_at.isoformat() if payment.paid_at else ""
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>{html.escape(payment.receipt_number or "Receipt")}</title>
  <style>
    body {{ font-family: Arial, sans-serif; color: #111827; margin: 32px; }}
    .receipt {{ max-width: 760px; margin: 0 auto; border: 1px solid #d1d5db; padding: 28px; }}
    h1 {{ margin: 0 0 8px; font-size: 28px; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 24px; }}
    th, td {{ text-align: left; padding: 10px 8px; border-bottom: 1px solid #e5e7eb; }}
    th {{ width: 32%; color: #4b5563; font-weight: 600; }}
  </style>
</head>
<body>
  <section class="receipt">
    <h1>Kumbhad Samaj Trust</h1>
    <p>Membership Payment Receipt</p>
    <table>
      <tr><th>Receipt number</th><td>{html.escape(payment.receipt_number or "")}</td></tr>
      <tr><th>Payment ID</th><td>{html.escape(payment.id)}</td></tr>
      <tr><th>Payment type</th><td>{html.escape(payment.payment_type.title())}</td></tr>
      <tr><th>Paid at</th><td>{html.escape(paid_at)}</td></tr>
      <tr><th>Amount</th><td>{html.escape(payment.currency)} {html.escape(str(payment.amount))}</td></tr>
      <tr><th>Membership number</th><td>{html.escape(membership.membership_number)}</td></tr>
      <tr><th>Member</th><td>{html.escape(user.full_name)}</td></tr>
      <tr><th>Family email</th><td>{html.escape(family.email)}</td></tr>
      <tr><th>Razorpay order</th><td>{html.escape(payment.provider_order_id)}</td></tr>
      <tr><th>Razorpay payment</th><td>{html.escape(payment.provider_payment_id or "")}</td></tr>
    </table>
  </section>
</body>
</html>"""
