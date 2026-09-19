"""Shared FastAPI dependencies: request-id extraction and the demo auth bypass."""
from __future__ import annotations

from dataclasses import dataclass

from fastapi import Request

from .config import get_settings
from .schemas import ApiError


def get_request_id(request: Request) -> str:
    """Read the request id stamped by the middleware (falls back to 'local')."""
    return getattr(request.state, "request_id", "local")


@dataclass(frozen=True)
class DemoUser:
    user_id: str
    email: str
    role: str


def get_current_user(request: Request) -> DemoUser:
    """Demo authentication boundary for protected endpoints.

    The contract requires ``Authorization: Bearer <access_token>`` on protected
    endpoints. Until real JWT authentication is implemented (a later stage),
    ``DEMO_MODE=true`` (the default) accepts any or no bearer token and stamps a
    fixed demo identity. With ``DEMO_MODE=false`` a bearer token is required but
    still treated as an opaque demo identity. Replace this dependency with real
    JWT verification when the authentication stage lands.
    """
    settings = get_settings()
    auth = request.headers.get("authorization")
    if auth is not None and not auth.lower().startswith("bearer "):
        raise ApiError(
            status=401,
            code="INVALID_AUTH_HEADER",
            title="Invalid authorization header",
            detail="Use 'Authorization: Bearer <access_token>'.",
        )
    if not settings.demo_mode and auth is None:
        raise ApiError(
            status=401,
            code="UNAUTHORIZED",
            title="Authentication required",
            detail=(
                "This endpoint requires 'Authorization: Bearer <access_token>'. "
                "Set DEMO_MODE=true for the demo bypass."
            ),
        )
    return DemoUser(
        user_id=settings.demo_user_id,
        email=settings.demo_user_email,
        role=settings.demo_user_role,
    )
