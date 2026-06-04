from __future__ import annotations

import os
import unittest
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import patch, MagicMock

os.environ.setdefault("JWT_ACCESS_SECRET", "test-access-secret")
os.environ.setdefault("JWT_REFRESH_SECRET", "test-refresh-secret")

from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.db.models import Family, User, MembershipFeeHistory
from app.schemas.membership import RegistrationDraftRequest, FamilyMemberInput
from app.services.membership import create_registration_draft


class Phase8ConsentTests(unittest.TestCase):
    def setUp(self) -> None:
        # Create an in-memory SQLite database for testing
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        self.TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = self.TestingSessionLocal()

        # Seed active fee history
        self.fee = MembershipFeeHistory(
            membership_fee_amount=Decimal("1000.00"),
            renewal_fee_amount=Decimal("800.00"),
            effective_from=datetime.now(timezone.utc).date(),
        )
        self.db.add(self.fee)
        self.db.commit()

    def tearDown(self) -> None:
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_schema_requires_consent_to_terms_and_privacy(self) -> None:
        # 1. Successful validation when both terms and privacy are True
        valid_payload = {
            "head_name": "Test User",
            "phone": "9876543210",
            "email": "test@example.com",
            "address": "123, Test Street, Test City",
            "family_members": [
                {
                    "name": "Test User",
                    "date_of_birth": "1990-01-01",
                    "gender": "male",
                    "relationship": "Self"
                }
            ],
            "consent_version": "v1.0",
            "consent_terms": True,
            "consent_privacy": True
        }
        req = RegistrationDraftRequest(**valid_payload)
        self.assertEqual(req.consent_version, "v1.0")
        self.assertTrue(req.consent_terms)
        self.assertTrue(req.consent_privacy)

        # 2. ValidationError when consent_terms is False
        invalid_terms = valid_payload.copy()
        invalid_terms["consent_terms"] = False
        with self.assertRaises(ValidationError) as ctx:
            RegistrationDraftRequest(**invalid_terms)
        self.assertIn("Must consent to terms and privacy policy", str(ctx.exception))

        # 3. ValidationError when consent_privacy is False
        invalid_privacy = valid_payload.copy()
        invalid_privacy["consent_privacy"] = False
        with self.assertRaises(ValidationError) as ctx:
            RegistrationDraftRequest(**invalid_privacy)
        self.assertIn("Must consent to terms and privacy policy", str(ctx.exception))

        # 4. ValidationError when consent_version is missing/empty
        invalid_version = valid_payload.copy()
        invalid_version["consent_version"] = ""
        with self.assertRaises(ValidationError) as ctx:
            RegistrationDraftRequest(**invalid_version)

    @patch("app.services.membership._lock_membership_number_generation")
    @patch("app.services.membership.create_razorpay_order")
    def test_create_registration_draft_saves_consent_to_db(self, mock_create_order: MagicMock, mock_lock: MagicMock) -> None:
        # Mock Razorpay order creation to return a fake order ID
        mock_create_order.return_value = {"id": "order_mocked_123"}

        payload = RegistrationDraftRequest(
            head_name="John Doe",
            phone="9876543210",
            email="john@example.com",
            address="123, Main Road, Rajkot",
            family_members=[
                FamilyMemberInput(
                    name="John Doe",
                    date_of_birth="1980-05-15",
                    gender="male",
                    relationship="Self"
                )
            ],
            consent_version="v1.0",
            consent_terms=True,
            consent_privacy=True
        )

        ip_address = "192.168.1.1"
        user_agent = "Mozilla/5.0"

        # Execute draft creation
        result = create_registration_draft(
            self.db,
            payload,
            ip_address=ip_address,
            user_agent=user_agent
        )

        # Verify response structure
        self.assertIn("membership", result)
        self.assertIn("payment", result)

        # Query database to check if Family record contains the consent details
        family = self.db.query(Family).filter(Family.email == "john@example.com").first()
        self.assertIsNotNone(family)
        self.assertEqual(family.consent_version, "v1.0")
        self.assertEqual(family.consent_ip, ip_address)
        self.assertIsNotNone(family.consent_timestamp)


if __name__ == "__main__":
    unittest.main()
