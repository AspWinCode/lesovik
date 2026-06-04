import structlog
from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthDep, DbDep
from app.core.rate_limit import limiter
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    RefreshRequest,
    TOTPSetupResponse,
    TOTPVerifyRequest,
    TokenPair,
)
from app.services.auth import AuthError, AuthService

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


def _svc(db: AsyncSession) -> AuthService:
    return AuthService(db)


def _map_auth_error(exc: AuthError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=exc.detail)


@router.post("/login", response_model=TokenPair, summary="Password login (+ optional TOTP)")
@limiter.limit("10/minute")
async def login(req: LoginRequest, request: Request, db: DbDep) -> TokenPair:
    try:
        return await _svc(db).login(
            req,
            user_agent=request.headers.get("user-agent"),
            ip=request.client.host if request.client else None,
        )
    except AuthError as exc:
        raise _map_auth_error(exc) from exc


@router.post("/refresh", response_model=TokenPair, summary="Rotate refresh token")
@limiter.limit("30/minute")
async def refresh(req: RefreshRequest, request: Request, db: DbDep) -> TokenPair:
    try:
        return await _svc(db).refresh(req.refresh_token)
    except AuthError as exc:
        raise _map_auth_error(exc) from exc


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Revoke refresh token")
async def logout(req: RefreshRequest, db: DbDep) -> None:
    await _svc(db).logout(req.refresh_token)


@router.post(
    "/logout-all",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke all sessions for current user",
)
async def logout_all(current_user: AuthDep, db: DbDep) -> None:
    await _svc(db).logout_all(current_user.user_id)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    req: ChangePasswordRequest, current_user: AuthDep, db: DbDep
) -> None:
    try:
        await _svc(db).change_password(current_user.user_id, req)
    except AuthError as exc:
        raise _map_auth_error(exc) from exc


# ---- TOTP ----

@router.post("/totp/setup", response_model=TOTPSetupResponse, summary="Get TOTP provisioning URI")
async def totp_setup(current_user: AuthDep, db: DbDep) -> TOTPSetupResponse:
    from sqlalchemy import select
    from app.models.identity import User

    result = await db.execute(select(User).where(User.id == current_user.user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        return await _svc(db).totp_setup(user)
    except AuthError as exc:
        raise _map_auth_error(exc) from exc


@router.post(
    "/totp/enable",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Confirm TOTP code and enable 2FA",
)
async def totp_enable(req: TOTPVerifyRequest, current_user: AuthDep, db: DbDep) -> None:
    from sqlalchemy import select
    from app.models.identity import User

    result = await db.execute(select(User).where(User.id == current_user.user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        await _svc(db).totp_enable(user, req.code)
    except AuthError as exc:
        raise _map_auth_error(exc) from exc


@router.post(
    "/totp/disable",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Disable 2FA (requires valid TOTP code)",
)
async def totp_disable(req: TOTPVerifyRequest, current_user: AuthDep, db: DbDep) -> None:
    from sqlalchemy import select
    from app.models.identity import User

    result = await db.execute(select(User).where(User.id == current_user.user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        await _svc(db).totp_disable(user, req.code)
    except AuthError as exc:
        raise _map_auth_error(exc) from exc
