from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

T = TypeVar("T")


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int


class AdminApiResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T
    meta: dict[str, Any] = Field(default_factory=dict)


# --- Members & Family Schemas ---

class AdminMemberListItem(BaseModel):
    user_id: str
    family_id: str | None
    membership_id: str | None
    full_name: str
    email: str
    mobile_number: str | None
    membership_number: str | None
    status: str
    expiry_date: date | None

    model_config = ConfigDict(from_attributes=True)


class AdminMemberListData(BaseModel):
    items: list[AdminMemberListItem]


class FamilyMemberInput(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    date_of_birth: date
    gender: Literal["male", "female", "other", "prefer_not_to_say"]
    relationship: str = Field(min_length=2, max_length=50)

    @field_validator("date_of_birth")
    @classmethod
    def date_of_birth_not_in_future(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("date_of_birth must not be in the future")
        return value


class AdminCreateMemberRequest(BaseModel):
    head_name: str = Field(min_length=2, max_length=100)
    phone: str = Field(pattern=r"^\+?[1-9][0-9]{9,14}$")
    email: EmailStr
    address: str = Field(min_length=10, max_length=500)
    membership_status: Literal["pending_payment", "active", "expired", "suspended", "cancelled"] = Field(default="active")
    start_date: date | None = None
    expiry_date: date | None = None
    family_members: list[FamilyMemberInput] = Field(default_factory=list, max_length=25)

    @model_validator(mode="after")
    def validate_dates_if_active(self):
        if self.membership_status == "active":
            if not self.start_date or not self.expiry_date:
                raise ValueError("start_date and expiry_date are required when status is active")
            if self.expiry_date <= self.start_date:
                raise ValueError("expiry_date must be after start_date")
        return self


class AdminCreateMemberResponseData(BaseModel):
    user_id: str
    family_id: str
    membership_id: str
    membership_number: str
    status: str


class AdminUpdateMemberRequest(BaseModel):
    head_name: str | None = Field(default=None, min_length=2, max_length=100)
    phone: str | None = Field(default=None, pattern=r"^\+?[1-9][0-9]{9,14}$")
    email: EmailStr | None = None
    address: str | None = Field(default=None, min_length=10, max_length=500)
    status: Literal["pending_payment", "active", "expired", "suspended", "cancelled"] | None = None

    @model_validator(mode="after")
    def validate_any_mutable_field(self):
        if not any([self.head_name, self.phone, self.email, self.address, self.status]):
            raise ValueError("At least one mutable field must be provided")
        return self


class AdminDeleteMemberRequest(BaseModel):
    reason: str = Field(min_length=5, max_length=500)


class AdminFamilyMemberInput(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    date_of_birth: date
    gender: Literal["male", "female", "other", "prefer_not_to_say"]
    relationship: str = Field(min_length=2, max_length=50)

    @field_validator("date_of_birth")
    @classmethod
    def date_of_birth_not_in_future(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("date_of_birth must not be in the future")
        return value


class AdminUpdateFamilyMemberRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    date_of_birth: date | None = None
    gender: Literal["male", "female", "other", "prefer_not_to_say"] | None = None
    relationship: str | None = Field(default=None, min_length=2, max_length=50)

    @model_validator(mode="after")
    def validate_any_mutable_field(self):
        if not any([self.name, self.date_of_birth, self.gender, self.relationship]):
            raise ValueError("At least one field must be provided")
        return self

    @field_validator("date_of_birth")
    @classmethod
    def date_of_birth_not_in_future(cls, value: date | None) -> date | None:
        if value and value > date.today():
            raise ValueError("date_of_birth must not be in the future")
        return value


class AdminRemoveFamilyMemberRequest(BaseModel):
    reason: str = Field(min_length=5, max_length=500)


# --- Member Detail ---

class AdminUserDetail(BaseModel):
    id: str
    email: str
    full_name: str
    profile_picture_url: str | None
    status: str
    last_login_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminFamilyDetail(BaseModel):
    id: str
    address: str
    mobile_number: str
    email: str
    status: str

    model_config = ConfigDict(from_attributes=True)


class AdminMembershipDetail(BaseModel):
    id: str
    membership_number: str
    status: str
    start_date: date | None
    expiry_date: date | None

    model_config = ConfigDict(from_attributes=True)


class AdminFamilyMemberDetail(BaseModel):
    id: str
    name: str
    date_of_birth: date
    gender: str
    relationship: str

    model_config = ConfigDict(from_attributes=True)


class AdminPaymentSummary(BaseModel):
    total_paid: Decimal
    last_payment_at: datetime | None


class AdminMemberDetailData(BaseModel):
    user: AdminUserDetail
    family: AdminFamilyDetail
    membership: AdminMembershipDetail
    family_members: list[AdminFamilyMemberDetail]
    payment_summary: AdminPaymentSummary


# --- Fees Schemas ---

class AdminActiveFeeResponseData(BaseModel):
    id: str
    membership_fee_amount: Decimal
    renewal_fee_amount: Decimal
    effective_from: date
    effective_to: date | None

    model_config = ConfigDict(from_attributes=True)


class AdminFeeHistoryListItem(BaseModel):
    id: str
    membership_fee_amount: Decimal
    renewal_fee_amount: Decimal
    effective_from: date
    effective_to: date | None

    model_config = ConfigDict(from_attributes=True)


class AdminFeeHistoryListData(BaseModel):
    items: list[AdminFeeHistoryListItem]


class AdminCreateFeeRequest(BaseModel):
    membership_fee_amount: Decimal = Field(ge=0, le=9999999999.99)
    renewal_fee_amount: Decimal = Field(ge=0, le=9999999999.99)
    effective_from: date


# --- Payment Schemas ---

class AdminPaymentListItem(BaseModel):
    id: str
    membership_number: str
    payment_type: str
    status: str
    amount: Decimal
    currency: str
    paid_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class AdminPaymentListData(BaseModel):
    items: list[AdminPaymentListItem]


class AdminPaymentDetail(BaseModel):
    id: str
    payment_type: str
    provider: str
    provider_order_id: str
    provider_payment_id: str | None
    status: str
    amount: Decimal
    currency: str
    paid_at: datetime | None
    receipt_number: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminPaymentDetailData(BaseModel):
    payment: AdminPaymentDetail
    member: AdminUserDetail
    membership: AdminMembershipDetail
    status_transitions: list[dict[str, Any]] = Field(default_factory=list)


# --- Event Schemas ---

class AdminEventListItem(BaseModel):
    id: str
    title: str
    slug: str
    status: str
    event_date: datetime | None

    model_config = ConfigDict(from_attributes=True)


class AdminEventListData(BaseModel):
    items: list[AdminEventListItem]


class AdminEventDetail(BaseModel):
    id: str
    title: str
    slug: str
    description: str
    event_date: datetime | None
    location: str | None
    status: str
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminCreateEventRequest(BaseModel):
    title: str = Field(min_length=3, max_length=150)
    slug: str = Field(min_length=3, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    description: str = Field(min_length=10, max_length=10000)
    event_date: datetime | None = None
    location: str | None = Field(default=None, max_length=200)
    status: Literal["draft", "published", "archived"] = Field(default="draft")


class AdminUpdateEventRequest(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=150)
    description: str | None = Field(default=None, min_length=10, max_length=10000)
    event_date: datetime | None = None
    location: str | None = Field(default=None, max_length=200)
    status: Literal["draft", "published", "archived"] | None = None

    @model_validator(mode="after")
    def validate_any_mutable_field(self):
        if not any([self.title is not None, self.description is not None, self.event_date is not None, self.location is not None, self.status is not None]):
            raise ValueError("At least one mutable field must be provided")
        return self


class AdminDeleteEventRequest(BaseModel):
    reason: str = Field(min_length=5, max_length=500)


# --- Gallery Schemas ---

class AdminAlbumListItem(BaseModel):
    id: str
    title: str
    slug: str
    status: str
    photo_count: int

    model_config = ConfigDict(from_attributes=True)


class AdminAlbumListData(BaseModel):
    items: list[AdminAlbumListItem]


class AdminCreateAlbumRequest(BaseModel):
    title: str = Field(min_length=3, max_length=150)
    slug: str = Field(min_length=3, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    description: str | None = Field(default=None, max_length=1000)
    status: Literal["draft", "published", "archived"] = Field(default="draft")


class AdminUpdateAlbumRequest(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=150)
    description: str | None = Field(default=None, max_length=1000)
    status: Literal["draft", "published", "archived"] | None = None

    @model_validator(mode="after")
    def validate_any_mutable_field(self):
        if not any([self.title is not None, self.description is not None, self.status is not None]):
            raise ValueError("At least one mutable field must be provided")
        return self


class AdminDeleteAlbumRequest(BaseModel):
    reason: str = Field(min_length=5, max_length=500)


class AdminPhotoListItem(BaseModel):
    id: str
    album_id: str
    title: str | None
    filepath: str
    public_url: str
    sort_order: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminAlbumPhotosListData(BaseModel):
    id: str
    title: str
    slug: str
    description: str | None
    status: str
    photos: list[AdminPhotoListItem]

    model_config = ConfigDict(from_attributes=True)


class AdminUploadPhotoResponseData(BaseModel):
    photo_id: str
    public_url: str
    uploaded: bool


class AdminDeletePhotoRequest(BaseModel):
    reason: str = Field(min_length=5, max_length=500)


# --- Reports Schemas ---

class AdminActiveMembersReportItem(BaseModel):
    membership_number: str
    full_name: str
    email: str
    mobile_number: str | None
    status: str
    expiry_date: date | None


class AdminActiveMembersReportData(BaseModel):
    items: list[AdminActiveMembersReportItem]


class AdminExpiringMembersReportItem(BaseModel):
    membership_number: str
    full_name: str
    email: str
    mobile_number: str | None
    status: str
    expiry_date: date | None


class AdminExpiringMembersReportData(BaseModel):
    items: list[AdminExpiringMembersReportItem]


class AdminBirthdayReportItem(BaseModel):
    name: str
    date_of_birth: date
    relationship: str
    family_email: str
    family_mobile: str | None


class AdminBirthdayReportData(BaseModel):
    items: list[AdminBirthdayReportItem]


class AdminPaymentReportItem(BaseModel):
    payment_id: str
    membership_number: str
    full_name: str
    payment_type: str
    status: str
    amount: Decimal
    paid_at: datetime | None


class AdminPaymentReportSummary(BaseModel):
    total_amount: Decimal
    payment_count: int


class AdminPaymentReportData(BaseModel):
    items: list[AdminPaymentReportItem]
    summary: AdminPaymentReportSummary


# --- System Settings & Audit Logs ---

class AdminSystemSettingsData(BaseModel):
    trust_name: str
    contact_details: dict[str, Any] = Field(default_factory=dict)
    social_links: list[dict[str, Any]] = Field(default_factory=list)
    receipt_settings: dict[str, Any] = Field(default_factory=dict)


class AdminUpdateSettingRequest(BaseModel):
    value: Any


class AdminAuditLogListItem(BaseModel):
    id: str
    actor_admin_id: str | None
    actor_admin_email: str | None
    actor_type: str
    action: str
    entity_type: str
    entity_id: str | None
    before_state: str | None
    after_state: str | None
    ip_address: str | None
    user_agent: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminAuditLogListData(BaseModel):
    items: list[AdminAuditLogListItem]
