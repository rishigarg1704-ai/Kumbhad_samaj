from pydantic import BaseModel


class AuthUser(BaseModel):
    user_id: str
    role: str
    email: str
    full_name: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUser


class StartLoginResponse(BaseModel):
    auth_url: str


class AdminLoginRequest(BaseModel):
    email: str
    password: str


class Admin2FAVerifyRequest(BaseModel):
    challenge_id: str
    code: str


class AdminLoginResponse(BaseModel):
    two_factor_required: bool
    challenge_id: str | None = None
    access_token: str | None = None
    user: AuthUser | None = None


class AdminForgotPasswordRequest(BaseModel):
    email: str


class AdminResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class AdminChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
