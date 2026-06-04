from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

PaymentStatus = Literal["pending", "success", "failed", "refunded"]
PaymentType = Literal["registration", "renewal"]


class RenewalOrderRequest(BaseModel):
    membership_id: str = Field(min_length=36, max_length=36)


class PaymentListItem(BaseModel):
    id: str
    payment_type: PaymentType
    status: PaymentStatus
    amount: Decimal
    currency: str
    paid_at: datetime | None
    receipt_number: str | None


class ReceiptPayment(BaseModel):
    id: str
    amount: Decimal
    currency: str
    paid_at: datetime


class ReceiptResponseData(BaseModel):
    receipt_id: str
    receipt_number: str
    download_url: str
    payment: ReceiptPayment
