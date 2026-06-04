from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/kumbhad_samaj"

    @field_validator("database_url", mode="before")
    @classmethod
    def ensure_psycopg_driver(cls, v: str) -> str:
        if v:
            if v.startswith("postgres://"):
                return v.replace("postgres://", "postgresql+psycopg://", 1)
            elif v.startswith("postgresql://"):
                return v.replace("postgresql://", "postgresql+psycopg://", 1)
        return v
    jwt_access_secret: str
    jwt_refresh_secret: str
    frontend_base_url: str = "http://localhost:5173"
    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""
    google_oauth_redirect_url: str = "http://localhost:8000/api/v1/auth/google/callback"
    admin_email: str = "admin@example.com"
    admin_password_hash: str = ""
    admin_2fa_secret: str = ""
    admin_2fa_enabled: bool = True
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = "no-reply@kumbhadsamaj.org"
    smtp_from_name: str = "Kumbhad Samaj Trust"
    refresh_cookie_secure: bool = False
    auth_rate_limit_max_failures: int = 5
    auth_rate_limit_window_minutes: int = 15
    auth_audit_enabled: bool = True
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""
    razorpay_currency: str = "INR"
    membership_number_prefix: str = "TRUST"
    membership_number_width: int = 6
    membership_validity_days: int = 365
    renewal_window_days: int = 60
    receipt_number_prefix: str = "RCT"
    receipt_number_width: int = 6


settings = Settings()
