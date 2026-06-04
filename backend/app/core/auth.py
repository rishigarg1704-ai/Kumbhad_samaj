from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import json
import logging
import secrets
from typing import Literal
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from uuid import uuid4

import jwt
import pyotp
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
logger = logging.getLogger(__name__)

AccessRole = Literal["member", "admin"]


@dataclass(slots=True)
class UserProfile:
    user_id: str
    role: AccessRole
    email: str
    full_name: str
    google_user_id: str | None = None
    is_suspended: bool = False


@dataclass(slots=True)
class SessionRecord:
    session_id: str
    user: UserProfile
    refresh_token: str
    expires_at: datetime


@dataclass(slots=True)
class AdminLoginChallenge:
    challenge_id: str
    admin_email: str
    created_at: datetime


@dataclass(slots=True)
class AuthAuditEntry:
    event_type: str
    actor_email: str
    role: str
    success: bool
    detail: str
    ip_address: str | None
    created_at: datetime


_sessions: dict[str, SessionRecord] = {}
_refresh_index: dict[str, str] = {}
_oauth_states: dict[str, datetime] = {}
_admin_challenges: dict[str, AdminLoginChallenge] = {}
_auth_audit_log: list[AuthAuditEntry] = []
_login_failures: dict[str, list[datetime]] = {}
_suspended_user_ids: set[str] = set()

ACCESS_TOKEN_TTL_MINUTES = 15
REFRESH_TOKEN_TTL_DAYS = 30
CHALLENGE_TTL_MINUTES = 10
GOOGLE_STATE_TTL_MINUTES = 10
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clean_attempts(key: str) -> list[datetime]:
    window = timedelta(minutes=settings.auth_rate_limit_window_minutes)
    attempts = [stamp for stamp in _login_failures.get(key, []) if stamp >= _utcnow() - window]
    _login_failures[key] = attempts
    return attempts


def _to_sha256_key(value: str) -> str:
    return sha256(value.strip().lower().encode("utf-8")).hexdigest()


def record_audit_event(
    event_type: str,
    actor_email: str,
    role: str,
    success: bool,
    detail: str,
    ip_address: str | None,
) -> None:
    entry = AuthAuditEntry(
        event_type=event_type,
        actor_email=actor_email,
        role=role,
        success=success,
        detail=detail,
        ip_address=ip_address,
        created_at=_utcnow(),
    )
    _auth_audit_log.append(entry)
    if settings.auth_audit_enabled:
        logger.info(
            "auth_event=%s actor=%s role=%s success=%s detail=%s ip=%s",
            event_type,
            actor_email,
            role,
            success,
            detail,
            ip_address,
        )


def record_login_failure(key: str) -> None:
    attempts = _clean_attempts(key)
    attempts.append(_utcnow())
    _login_failures[key] = attempts


def clear_login_failures(key: str) -> None:
    _login_failures.pop(key, None)


def is_login_locked(key: str) -> bool:
    attempts = _clean_attempts(key)
    return len(attempts) >= settings.auth_rate_limit_max_failures


def _google_client_id() -> str:
    if not settings.google_oauth_client_id:
        raise ValueError("GOOGLE_OAUTH_CLIENT_ID is required")
    return settings.google_oauth_client_id


def _google_client_secret() -> str:
    if not settings.google_oauth_client_secret:
        raise ValueError("GOOGLE_OAUTH_CLIENT_SECRET is required")
    return settings.google_oauth_client_secret


def _admin_password_hash() -> str:
    if not settings.admin_password_hash:
        raise ValueError("ADMIN_PASSWORD_HASH is required")
    return settings.admin_password_hash


def _admin_2fa_secret() -> str:
    if not settings.admin_2fa_secret:
        raise ValueError("ADMIN_2FA_SECRET is required")
    return settings.admin_2fa_secret


def build_admin_user() -> UserProfile:
    return UserProfile(
        user_id="admin:configured",
        role="admin",
        email=settings.admin_email.strip().lower(),
        full_name="Trust Admin",
    )


def create_access_token(user: UserProfile, session_id: str) -> str:
    now = _utcnow()
    payload = {
        "sub": user.user_id,
        "role": user.role,
        "email": user.email,
        "name": user.full_name,
        "sid": session_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=ACCESS_TOKEN_TTL_MINUTES)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_access_secret, algorithm="HS256")


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_access_secret, algorithms=["HS256"])


def create_session(user: UserProfile) -> tuple[str, str]:
    session_id = str(uuid4())
    refresh_token = secrets.token_urlsafe(48)
    expires_at = _utcnow() + timedelta(days=REFRESH_TOKEN_TTL_DAYS)
    _sessions[session_id] = SessionRecord(
        session_id=session_id,
        user=user,
        refresh_token=refresh_token,
        expires_at=expires_at,
    )
    _refresh_index[refresh_token] = session_id
    return session_id, refresh_token


def rotate_refresh_token(refresh_token: str) -> tuple[UserProfile, str, str] | None:
    session_id = _refresh_index.get(refresh_token)
    if not session_id:
        return None
    session = _sessions.get(session_id)
    if not session or session.expires_at <= _utcnow():
        revoke_session(session_id)
        return None
    new_refresh_token = secrets.token_urlsafe(48)
    session.refresh_token = new_refresh_token
    session.expires_at = _utcnow() + timedelta(days=REFRESH_TOKEN_TTL_DAYS)
    _refresh_index.pop(refresh_token, None)
    _refresh_index[new_refresh_token] = session_id
    return session.user, session.session_id, new_refresh_token


def revoke_session(session_id: str) -> None:
    session = _sessions.pop(session_id, None)
    if session:
        _refresh_index.pop(session.refresh_token, None)


def revoke_session_by_refresh_token(refresh_token: str) -> None:
    session_id = _refresh_index.get(refresh_token)
    if session_id:
        revoke_session(session_id)


def get_session_by_access_token(token: str) -> SessionRecord | None:
    try:
        payload = decode_access_token(token)
    except jwt.PyJWTError:
        return None
    session_id = payload.get("sid")
    if not session_id:
        return None
    return _sessions.get(session_id)


def store_oauth_state() -> str:
    state = secrets.token_urlsafe(24)
    _oauth_states[state] = _utcnow() + timedelta(minutes=GOOGLE_STATE_TTL_MINUTES)
    return state


def verify_oauth_state(state: str) -> bool:
    expires_at = _oauth_states.get(state)
    if not expires_at:
        return False
    if expires_at <= _utcnow():
        _oauth_states.pop(state, None)
        return False
    _oauth_states.pop(state, None)
    return True


def build_google_login_url() -> str:
    state = store_oauth_state()
    query = urlencode(
        {
            "client_id": _google_client_id(),
            "redirect_uri": settings.google_oauth_redirect_url,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "prompt": "consent",
            "include_granted_scopes": "true",
            "state": state,
        }
    )
    return f"https://accounts.google.com/o/oauth2/v2/auth?{query}"


def exchange_google_code_for_user(code: str) -> UserProfile:
    token_payload = urlencode(
        {
            "code": code,
            "client_id": _google_client_id(),
            "client_secret": _google_client_secret(),
            "redirect_uri": settings.google_oauth_redirect_url,
            "grant_type": "authorization_code",
        }
    ).encode("utf-8")
    token_request = Request(
        GOOGLE_TOKEN_URL,
        data=token_payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with urlopen(token_request, timeout=10) as response:
        token_data = json.loads(response.read().decode("utf-8"))

    access_token = token_data.get("access_token")
    if not access_token:
        raise ValueError("Google did not return an access token")

    userinfo_request = Request(
        GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
    )
    with urlopen(userinfo_request, timeout=10) as response:
        userinfo = json.loads(response.read().decode("utf-8"))

    if not userinfo.get("email_verified"):
        raise ValueError("Google email is not verified")

    user_id = f"google:{userinfo['sub']}"
    return UserProfile(
        user_id=user_id,
        role="member",
        email=userinfo["email"],
        full_name=userinfo.get("name") or userinfo["email"],
        google_user_id=userinfo["sub"],
        is_suspended=user_id in _suspended_user_ids,
    )


def issue_auth_payload(user: UserProfile) -> tuple[str, str, SessionRecord]:
    session_id, refresh_token = create_session(user)
    access_token = create_access_token(user, session_id)
    return access_token, refresh_token, _sessions[session_id]


def refresh_access_token(refresh_token: str) -> tuple[str, str, UserProfile] | None:
    rotated = rotate_refresh_token(refresh_token)
    if not rotated:
        return None
    user, session_id, new_refresh_token = rotated
    return create_access_token(user, session_id), new_refresh_token, user


def session_user_from_token(token: str) -> UserProfile | None:
    session = get_session_by_access_token(token)
    return session.user if session else None


def verify_admin_password(password: str) -> bool:
    try:
        return pwd_context.verify(password, _admin_password_hash())
    except ValueError:
        return False


def verify_admin_totp(code: str) -> bool:
    return pyotp.TOTP(_admin_2fa_secret()).verify(code, valid_window=1)


def create_admin_challenge(admin_email: str) -> str:
    challenge_id = secrets.token_urlsafe(24)
    _admin_challenges[challenge_id] = AdminLoginChallenge(
        challenge_id=challenge_id,
        admin_email=admin_email,
        created_at=_utcnow(),
    )
    return challenge_id


def get_admin_challenge(challenge_id: str) -> AdminLoginChallenge | None:
    challenge = _admin_challenges.get(challenge_id)
    if not challenge:
        return None
    if challenge.created_at + timedelta(minutes=CHALLENGE_TTL_MINUTES) <= _utcnow():
        _admin_challenges.pop(challenge_id, None)
        return None
    return challenge


def clear_admin_challenge(challenge_id: str) -> None:
    _admin_challenges.pop(challenge_id, None)


def is_member_suspended(user_id: str) -> bool:
    return user_id in _suspended_user_ids


def set_member_suspended(user_id: str, suspended: bool) -> None:
    if suspended:
        _suspended_user_ids.add(user_id)
    else:
        _suspended_user_ids.discard(user_id)


def normalize_email(email: str) -> str:
    return email.strip().lower()
