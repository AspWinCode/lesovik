"""
Outbound HTTP client for webhook delivery.

Features:
  - Sync httpx (safe inside Celery workers that use asyncio.run for DB only)
  - HMAC-SHA256 request signing
  - Standard Lesovik headers injected automatically
  - Configurable timeout per subscription
"""
from __future__ import annotations

import hashlib
import hmac
import json
import secrets
import time
import uuid
from typing import Any

import httpx


# ------------------------------------------------------------------
# HMAC signing
# ------------------------------------------------------------------

def compute_signature(secret: str, body: bytes) -> str:
    """Return 'sha256=<hex>' HMAC signature over the raw request body."""
    mac = hmac.new(secret.encode(), body, hashlib.sha256)
    return f"sha256={mac.hexdigest()}"


def generate_secret() -> str:
    """Generate a new random 32-byte hex webhook signing secret."""
    return secrets.token_hex(32)


# ------------------------------------------------------------------
# Event pattern matching
# ------------------------------------------------------------------

def matches_event(pattern: str, event_type: str) -> bool:
    """
    Check whether an event_type matches a subscription pattern.

      "*"           → matches everything
      "record.*"    → matches "record.created", "record.updated", …
      "record.created" → exact match only
    """
    if pattern == "*":
        return True
    if pattern.endswith(".*"):
        prefix = pattern[:-2]
        return event_type == prefix or event_type.startswith(f"{prefix}.")
    return pattern == event_type


def subscription_matches(events_filter: list[str], event_type: str) -> bool:
    """Return True if any pattern in the filter list matches event_type."""
    return any(matches_event(p, event_type) for p in events_filter)


# ------------------------------------------------------------------
# Delivery
# ------------------------------------------------------------------

class DeliveryResult:
    __slots__ = ("success", "status_code", "response_body", "error")

    def __init__(
        self,
        success: bool,
        status_code: int | None = None,
        response_body: str | None = None,
        error: str | None = None,
    ) -> None:
        self.success = success
        self.status_code = status_code
        self.response_body = response_body
        self.error = error


def deliver(
    *,
    target_url: str,
    payload: dict[str, Any],
    event_type: str,
    delivery_id: str,
    secret: str,
    custom_headers: dict[str, str] | None = None,
    timeout_seconds: int = 30,
) -> DeliveryResult:
    """
    Make a single synchronous HTTP POST delivery attempt.

    Standard headers sent:
      Content-Type: application/json
      X-Lesovik-Event: <event_type>
      X-Lesovik-Delivery: <delivery_id>
      X-Lesovik-Timestamp: <unix_ts>
      X-Lesovik-Signature: sha256=<hmac>

    A 2xx response is considered success.
    """
    body = json.dumps(payload, default=str).encode()
    timestamp = str(int(time.time()))

    headers: dict[str, str] = {
        "Content-Type": "application/json",
        "X-Lesovik-Event": event_type,
        "X-Lesovik-Delivery": delivery_id,
        "X-Lesovik-Timestamp": timestamp,
        "X-Lesovik-Signature": compute_signature(secret, body),
    }
    if custom_headers:
        headers.update(custom_headers)

    try:
        with httpx.Client(timeout=timeout_seconds) as client:
            resp = client.post(target_url, content=body, headers=headers)
        success = resp.is_success
        return DeliveryResult(
            success=success,
            status_code=resp.status_code,
            response_body=resp.text[:4096],
        )
    except httpx.TimeoutException as exc:
        return DeliveryResult(success=False, error=f"Timeout: {exc}")
    except httpx.RequestError as exc:
        return DeliveryResult(success=False, error=f"RequestError: {exc}")
