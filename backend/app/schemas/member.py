from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class MemberProfileData(BaseModel):
    id: str
    email: str
    full_name: str
    profile_picture_url: str | None
    status: str

    model_config = ConfigDict(from_attributes=True)


class MemberFamilyData(BaseModel):
    id: str
    address: str
    mobile_number: str
    email: str

    model_config = ConfigDict(from_attributes=True)


class MemberMembershipData(BaseModel):
    id: str
    membership_number: str
    status: str
    start_date: date | None
    expiry_date: date | None

    model_config = ConfigDict(from_attributes=True)


class MemberMembershipResponseData(BaseModel):
    family: MemberFamilyData
    membership: MemberMembershipData


class FamilyMemberListItem(BaseModel):
    id: str
    name: str
    date_of_birth: date
    gender: str
    relationship: str

    model_config = ConfigDict(from_attributes=True)


class NotificationListItem(BaseModel):
    id: str
    title: str
    body: str
    status: str
    read_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationReadData(BaseModel):
    id: str
    status: str
    read_at: datetime
