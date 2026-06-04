from __future__ import annotations

import hashlib
import hmac
import json
import os
import unittest
from decimal import Decimal
from types import SimpleNamespace


os.environ.setdefault("JWT_ACCESS_SECRET", "test-access-secret")
os.environ.setdefault("JWT_REFRESH_SECRET", "test-refresh-secret")
os.environ.setdefault("RAZORPAY_WEBHOOK_SECRET", "test-webhook-secret")

from fastapi import HTTPException

from app.services import payments


class Phase4PaymentTests(unittest.TestCase):
    def test_webhook_signature_accepts_valid_digest(self) -> None:
        raw_body = json.dumps({"event": "payment.captured"}).encode("utf-8")
        signature = hmac.new(
            payments.settings.razorpay_webhook_secret.encode("utf-8"),
            raw_body,
            hashlib.sha256,
        ).hexdigest()

        payments._verify_webhook_signature(raw_body, signature)

    def test_webhook_signature_rejects_invalid_digest(self) -> None:
        with self.assertRaises(HTTPException) as raised:
            payments._verify_webhook_signature(b"{}", "bad-signature")

        self.assertEqual(raised.exception.status_code, 400)

    def test_target_status_maps_captured_and_failed_events(self) -> None:
        self.assertEqual(payments._target_status("payment.captured", {"status": "captured"}), "success")
        self.assertEqual(payments._target_status("payment.failed", {"status": "failed"}), "failed")

    def test_payment_match_rejects_wrong_amount(self) -> None:
        payment = SimpleNamespace(
            provider_order_id="order_internal",
            amount=Decimal("500.00"),
            currency="INR",
            provider_payment_id=None,
        )

        with self.assertRaises(payments.WebhookValidationError):
            payments._validate_payment_match(
                payment,
                {
                    "order_id": "order_internal",
                    "amount": 49900,
                    "currency": "INR",
                },
                "pay_test",
            )

    def test_receipt_html_escapes_member_supplied_values(self) -> None:
        payment = SimpleNamespace(
            receipt_number="RCT-000001",
            id="payment-id",
            payment_type="registration",
            paid_at=None,
            currency="INR",
            amount=Decimal("1000.00"),
            provider_order_id="order_test",
            provider_payment_id="pay_test",
            membership=SimpleNamespace(membership_number="TRUST-000001"),
            user=SimpleNamespace(full_name="<Member Name>"),
            family=SimpleNamespace(email="member@example.org"),
        )

        receipt = payments.render_receipt_html(payment)

        self.assertIn("RCT-000001", receipt)
        self.assertIn("&lt;Member Name&gt;", receipt)
        self.assertNotIn("<Member Name>", receipt)


if __name__ == "__main__":
    unittest.main()
