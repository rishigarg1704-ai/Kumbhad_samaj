from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.auth import session_user_from_token
from app.core.config import settings
from app.db.deps import get_db
from app.schemas.membership import (
    AddFamilyMemberRequest,
    RegistrationDraftRequest,
    UpdateFamilyMemberRequest,
    FamilyMemberActionResponse,
)
from app.services.membership import (
    add_family_member,
    create_registration_draft,
    delete_family_member,
    get_registration_status,
    update_family_member,
)

router = APIRouter(prefix="/memberships", tags=["memberships"])
admin_router = APIRouter(prefix="/admin/families", tags=["memberships"])


def _require_admin(authorization: str | None):
    token = (authorization or "").removeprefix("Bearer ").strip()
    user = session_user_from_token(token)
    if not user or user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return user


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


@router.post("/register")
def create_registration(
    payload: RegistrationDraftRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    result = create_registration_draft(
        db,
        payload,
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    membership = result["membership"]
    payment = result["payment"]
    return {
        "success": True,
        "data": {
            "membership_id": membership.id,
            "membership_number": membership.membership_number,
            "status": membership.status,
            "payment": {
                "payment_id": payment.id,
                "provider_order_id": payment.provider_order_id,
                "amount": payment.amount,
                "currency": payment.currency,
                "checkout_key_id": settings.razorpay_key_id,
            },
        },
        "meta": {},
    }


@router.get("/register/{payment_id}/status")
def registration_status(payment_id: UUID, db: Session = Depends(get_db)):
    result = get_registration_status(db, str(payment_id))
    payment = result["payment"]
    membership = result["membership"]
    return {
        "success": True,
        "data": {
            "payment": {
                "payment_id": payment.id,
                "status": payment.status,
                "amount": payment.amount,
                "currency": payment.currency,
            },
            "membership": {
                "membership_id": membership.id,
                "membership_number": membership.membership_number,
                "status": membership.status,
                "expiry_date": membership.expiry_date,
            },
        },
        "meta": {},
    }


@admin_router.post("/{family_id}/members")
def create_family_member(
    family_id: UUID,
    payload: AddFamilyMemberRequest,
    request: Request,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    _require_admin(authorization)
    member = add_family_member(
        db,
        str(family_id),
        payload,
        actor_type="admin",
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return {"success": True, "data": {"family_member_id": member.id, "created": True}, "meta": {}}


@admin_router.patch("/{family_id}/members/{family_member_id}")
def patch_family_member(
    family_id: UUID,
    family_member_id: UUID,
    payload: UpdateFamilyMemberRequest,
    request: Request,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    _require_admin(authorization)
    member = update_family_member(
        db,
        str(family_id),
        str(family_member_id),
        payload,
        actor_type="admin",
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return {"success": True, "data": {"family_member_id": member.id, "updated": True}, "meta": {}}


@admin_router.delete("/{family_id}/members/{family_member_id}")
def remove_family_member(
    family_id: UUID,
    family_member_id: UUID,
    request: Request,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    _require_admin(authorization)
    delete_family_member(
        db,
        str(family_id),
        str(family_member_id),
        actor_type="admin",
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return {"success": True, "data": {"family_member_id": family_member_id, "updated": True}, "meta": {}}
