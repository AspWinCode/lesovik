"""Password policy validator."""
import re


class PasswordPolicyError(ValueError):
    pass


def validate_password(password: str, *, min_length: int = 10) -> None:
    """Raise PasswordPolicyError if the password does not meet policy."""
    if len(password) < min_length:
        raise PasswordPolicyError(
            f"Пароль должен содержать минимум {min_length} символов."
        )
    if not re.search(r"[A-ZА-ЯЁ]", password):
        raise PasswordPolicyError(
            "Пароль должен содержать хотя бы одну заглавную букву."
        )
    if not re.search(r"[a-zа-яё]", password):
        raise PasswordPolicyError(
            "Пароль должен содержать хотя бы одну строчную букву."
        )
    if not re.search(r"\d", password):
        raise PasswordPolicyError(
            "Пароль должен содержать хотя бы одну цифру."
        )
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?`~]", password):
        raise PasswordPolicyError(
            "Пароль должен содержать хотя бы один специальный символ."
        )
