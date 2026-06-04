from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers.auth import router as auth_router
from app.routers.member import router as member_router
from app.routers.memberships import admin_router as membership_admin_router
from app.routers.memberships import router as membership_router
from app.routers.health import router as health_router
from app.routers.payments import router as payments_router

from app.routers.admin_members import router as admin_members_router
from app.routers.admin_finance import router as admin_finance_router
from app.routers.admin_content import router as admin_content_router
from app.routers.admin_system import router as admin_system_router

app = FastAPI(title="Kumbhad Samaj Trust API")

@app.on_event("startup")
def on_startup():
    from app.db.session import SessionLocal
    from app.db.models import AdminUser
    from app.core.config import settings
    
    db = SessionLocal()
    try:
        admin = db.query(AdminUser).first()
        if not admin:
            if settings.admin_email and settings.admin_password_hash:
                db_admin = AdminUser(
                    email=settings.admin_email.strip().lower(),
                    full_name="Trust Admin",
                    password_hash=settings.admin_password_hash,
                    two_factor_secret=settings.admin_2fa_secret or None,
                    two_factor_enabled=True
                )
                db.add(db_admin)
                db.commit()
    finally:
        db.close()

# Mount uploads static files
import os
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

from app.core.config import settings

origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
if settings.frontend_base_url:
    origins.append(settings.frontend_base_url.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(membership_router, prefix="/api/v1")
app.include_router(membership_admin_router, prefix="/api/v1")
app.include_router(payments_router, prefix="/api/v1")
app.include_router(member_router, prefix="/api/v1")

app.include_router(admin_members_router, prefix="/api/v1")
app.include_router(admin_finance_router, prefix="/api/v1")
app.include_router(admin_content_router, prefix="/api/v1")
app.include_router(admin_system_router, prefix="/api/v1")
