from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    totp_code: str | None = Field(default=None, min_length=6, max_length=8)


class LdapLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class YandexCallbackRequest(BaseModel):
    code: str
    state: str | None = None


class VkCallbackRequest(BaseModel):
    code: str
    state: str | None = None


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class RefreshRequest(BaseModel):
    refresh_token: str


class TOTPSetupResponse(BaseModel):
    secret: str
    provisioning_uri: str


class TOTPVerifyRequest(BaseModel):
    code: str = Field(min_length=6, max_length=8)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=10, max_length=128)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=1, max_length=128)


class PasswordPolicyRead(BaseModel):
    min_length: int
    require_uppercase: bool
    require_lowercase: bool
    require_digit: bool
    require_special: bool
    max_age_days: int
    history_depth: int
    updated_at: datetime

    model_config = {"from_attributes": True}


class PasswordPolicyUpdate(BaseModel):
    min_length: int | None = Field(default=None, ge=6, le=128)
    require_uppercase: bool | None = None
    require_lowercase: bool | None = None
    require_digit: bool | None = None
    require_special: bool | None = None
    max_age_days: int | None = Field(default=None, ge=0, le=3650)
    history_depth: int | None = Field(default=None, ge=0, le=24)
