from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

Gender = Literal["male", "female", "other", "prefer_not_to_say"]


class FamilyMemberInput(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    date_of_birth: date
    gender: Gender
    relationship: str = Field(min_length=2, max_length=50)

    @field_validator("date_of_birth")
    @classmethod
    def date_of_birth_not_in_future(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("date_of_birth must not be in the future")
        return value


class RegistrationDraftRequest(BaseModel):
    head_name: str = Field(min_length=2, max_length=100)
    phone: str = Field(pattern=r"^\+?[1-9][0-9]{9,14}$")
    email: Annotated[EmailStr, Field(max_length=254)]
    address: str = Field(min_length=10, max_length=500)
    family_members: list[FamilyMemberInput] = Field(max_length=25)
    consent_version: str = Field(min_length=1, max_length=50)
    consent_terms: bool = Field(default=False)
    consent_privacy: bool = Field(default=False)

    @field_validator("consent_terms", "consent_privacy")
    @classmethod
    def validate_consents(cls, value: bool) -> bool:
        if not value:
            raise ValueError("Must consent to terms and privacy policy")
        return value

    @field_validator("email")
    @classmethod
    def email_max_length(cls, value: EmailStr) -> EmailStr:
        if len(str(value)) > 254:
            raise ValueError("email must not exceed 254 characters")
        return value


class PaymentSummary(BaseModel):
    payment_id: str
    provider_order_id: str
    amount: Decimal
    currency: str
    checkout_key_id: str

    model_config = ConfigDict(from_attributes=True)


class RegistrationDraftResponseData(BaseModel):
    membership_id: str
    membership_number: str
    status: str
    payment: PaymentSummary


class ApiResponse(BaseModel):
    success: bool = True
    data: dict
    meta: dict = Field(default_factory=dict)


class RegistrationStatusPayment(BaseModel):
    payment_id: str
    status: str
    amount: Decimal
    currency: str


class RegistrationStatusMembership(BaseModel):
    membership_id: str
    membership_number: str
    status: str
    expiry_date: date | None


class RegistrationStatusResponseData(BaseModel):
    payment: RegistrationStatusPayment
    membership: RegistrationStatusMembership


class AddFamilyMemberRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    date_of_birth: date
    gender: Gender
    relationship: str = Field(min_length=2, max_length=50)

    @field_validator("date_of_birth")
    @classmethod
    def date_of_birth_not_in_future(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("date_of_birth must not be in the future")
        return value


class UpdateFamilyMemberRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    date_of_birth: date | None = None
    gender: Gender | None = None
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


class FamilyMemberResponse(BaseModel):
    id: str
    family_id: str
    name: str
    date_of_birth: date
    gender: str
    relationship: str

    model_config = ConfigDict(from_attributes=True)


class FamilyMemberActionResponse(BaseModel):
    family_member_id: str
    created: bool | None = None
    updated: bool | None = None
