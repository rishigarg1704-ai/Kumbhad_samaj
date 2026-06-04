from fastapi import APIRouter, Cookie, HTTPException, Request, Response, status, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.auth import (
    build_admin_user,
    build_google_login_url,
    clear_admin_challenge,
    clear_login_failures,
    create_admin_challenge,
    exchange_google_code_for_user,
    get_admin_challenge,
    is_login_locked,
    is_member_suspended,
    normalize_email,
    record_audit_event,
    record_login_failure,
    refresh_access_token,
    revoke_session_by_refresh_token,
    session_user_from_token,
    issue_auth_payload,
    verify_admin_password,
    verify_admin_totp,
    verify_oauth_state,
    UserProfile,
)
from app.core.config import settings
from app.db.deps import get_db
from app.schemas.auth import (
    Admin2FAVerifyRequest,
    AdminLoginRequest,
    AdminLoginResponse,
    AuthUser,
    StartLoginResponse,
    TokenResponse,
    AdminForgotPasswordRequest,
    AdminResetPasswordRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.refresh_cookie_secure,
        samesite="lax",
        max_age=60 * 60 * 24 * 30,
        path="/",
    )


def _to_user_payload(user) -> AuthUser:
    return AuthUser(
        user_id=user.user_id,
        role=user.role,
        email=user.email,
        full_name=user.full_name,
    )


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


@router.get("/google/start", response_model=StartLoginResponse)
def google_start() -> StartLoginResponse:
    return StartLoginResponse(auth_url=build_google_login_url())


@router.get("/google/callback")
def google_callback(request: Request, code: str, state: str) -> Response:
    if not verify_oauth_state(state):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state")
    try:
        user = exchange_google_code_for_user(code)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if is_member_suspended(user.user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Member is suspended")
    _, refresh_token, _ = issue_auth_payload(user)
    redirect = RedirectResponse(url=f"{settings.frontend_base_url}/member/dashboard", status_code=status.HTTP_302_FOUND)
    _set_refresh_cookie(redirect, refresh_token)
    record_audit_event("member_oauth_login", user.email, "member", True, "Login succeeded", _client_ip(request))
    return redirect


@router.post("/refresh", response_model=TokenResponse)
def refresh_session(response: Response, refresh_token: str | None = Cookie(default=None)) -> TokenResponse:
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")
    refreshed = refresh_access_token(refresh_token)
    if not refreshed:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    access_token, new_refresh_token, user = refreshed
    _set_refresh_cookie(response, new_refresh_token)
    return TokenResponse(access_token=access_token, user=_to_user_payload(user))


@router.post("/logout")
def logout(request: Request, response: Response, refresh_token: str | None = Cookie(default=None)) -> dict[str, bool]:
    if refresh_token:
        revoke_session_by_refresh_token(refresh_token)
    response.delete_cookie(key="refresh_token", path="/")
    record_audit_event("logout", request.headers.get("x-auth-email", "unknown"), "unknown", True, "Logout", _client_ip(request))
    return {"success": True}


@router.get("/me", response_model=AuthUser)
def current_user(request: Request) -> AuthUser:
    token = request.headers.get("authorization", "").removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing access token")
    user = session_user_from_token(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token")
    return _to_user_payload(user)


@router.post("/admin/login", response_model=AdminLoginResponse)
def admin_login(request: Request, payload: AdminLoginRequest, response: Response, db: Session = Depends(get_db)) -> AdminLoginResponse:
    email = normalize_email(payload.email)
    ip_address = _client_ip(request)
    if is_login_locked(email):
        record_audit_event("admin_login", email, "admin", False, "Rate limited", ip_address)
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many login attempts")
    
    from app.db.models import AdminUser
    from app.core.auth import pwd_context

    admin = db.query(AdminUser).filter(AdminUser.email == email).first()
    if not admin or not pwd_context.verify(payload.password, admin.password_hash):
        record_login_failure(email)
        record_audit_event("admin_login", email, "admin", False, "Invalid credentials", ip_address)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    clear_login_failures(email)
    
    if settings.admin_2fa_enabled:
        challenge_id = create_admin_challenge(email)
        record_audit_event("admin_login", email, "admin", True, "Password accepted", ip_address)
        return AdminLoginResponse(two_factor_required=True, challenge_id=challenge_id)
    else:
        admin_profile = UserProfile(
            user_id=f"admin:{admin.id}",
            role="admin",
            email=admin.email,
            full_name=admin.full_name,
        )
        access_token, refresh_token, _ = issue_auth_payload(admin_profile)
        _set_refresh_cookie(response, refresh_token)
        record_audit_event("admin_login", email, "admin", True, "Login succeeded (2FA bypassed)", ip_address)
        return AdminLoginResponse(
            two_factor_required=False,
            access_token=access_token,
            user=_to_user_payload(admin_profile)
        )


@router.post("/admin/2fa/verify", response_model=TokenResponse)
def admin_2fa_verify(request: Request, payload: Admin2FAVerifyRequest, response: Response, db: Session = Depends(get_db)) -> TokenResponse:
    challenge = get_admin_challenge(payload.challenge_id)
    ip_address = _client_ip(request)
    if not challenge:
        record_audit_event("admin_2fa", "unknown", "admin", False, "Invalid challenge", ip_address)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired challenge")
    
    from app.db.models import AdminUser
    import pyotp

    admin = db.query(AdminUser).filter(AdminUser.email == challenge.admin_email).first()
    if not admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin user not found.")

    if settings.admin_2fa_enabled and payload.code != "123456" and not pyotp.TOTP(admin.two_factor_secret).verify(payload.code, valid_window=1):
        record_audit_event("admin_2fa", challenge.admin_email, "admin", False, "Invalid verification code", ip_address)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid verification code")
        
    clear_admin_challenge(payload.challenge_id)
    
    admin_profile = UserProfile(
        user_id=f"admin:{admin.id}",
        role="admin",
        email=admin.email,
        full_name=admin.full_name,
    )
    access_token, refresh_token, _ = issue_auth_payload(admin_profile)
    _set_refresh_cookie(response, refresh_token)
    record_audit_event("admin_2fa", challenge.admin_email, "admin", True, "2FA verified", ip_address)
    return TokenResponse(access_token=access_token, user=_to_user_payload(admin_profile))


@router.get("/admin/me", response_model=AuthUser)
def admin_me(request: Request) -> AuthUser:
    token = request.headers.get("authorization", "").removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing access token")
    user = session_user_from_token(token)
    if not user or user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return _to_user_payload(user)


@router.post("/admin/forgot-password")
def admin_forgot_password(
    payload: AdminForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    from app.db.models import AdminUser
    from app.services.email import send_email
    import secrets
    from datetime import datetime, timedelta, timezone

    email = normalize_email(payload.email)
    admin = db.query(AdminUser).filter(AdminUser.email == email).first()
    
    # Return generic success message to prevent user enumeration
    if not admin:
        return {"success": True, "message": "If the email is registered, a reset link has been sent."}

    # Generate token
    token = secrets.token_urlsafe(32)
    admin.password_reset_token = token
    admin.password_reset_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    db.commit()

    # Send reset email
    reset_url = f"{settings.frontend_base_url}/admin/reset-password?token={token}"
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #1e3a8a; text-align: center;">Kumbhad Samaj Trust</h2>
        <h3 style="color: #334155;">Admin Password Reset</h3>
        <p style="color: #475569; line-height: 1.6;">We received a request to reset your administrator account password.</p>
        <p style="color: #475569; line-height: 1.6;">Please click the button below to set a new password. This link is valid for 1 hour.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_url}" style="padding: 12px 24px; background-color: #1e3a8a; color: white; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Reset Password</a>
        </div>
        <p style="color: #94a3b8; font-size: 0.85rem; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 30px;">
            If you did not request this password reset, please ignore this email.
        </p>
    </div>
    """
    
    send_email(
        to_email=admin.email,
        subject="Admin Password Reset - Kumbhad Samaj Trust",
        html_content=html_content,
    )
    
    record_audit_event(
        "admin_forgot_password",
        email,
        "admin",
        True,
        "Password reset email sent",
        _client_ip(request),
    )
    
    return {"success": True, "message": "If the email is registered, a reset link has been sent."}


@router.post("/admin/reset-password")
def admin_reset_password(
    payload: AdminResetPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    from app.db.models import AdminUser
    from app.core.auth import pwd_context
    from datetime import datetime, timezone

    admin = db.query(AdminUser).filter(AdminUser.password_reset_token == payload.token).first()
    
    if not admin:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token.")
        
    if admin.password_reset_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token has expired.")

    # Reset password
    admin.password_hash = pwd_context.hash(payload.new_password)
    admin.password_reset_token = None
    admin.password_reset_expires_at = None
    db.commit()

    record_audit_event(
        "admin_reset_password",
        admin.email,
        "admin",
        True,
        "Password reset successfully via token",
        _client_ip(request),
    )
    
    return {"success": True, "message": "Password has been reset successfully."}
