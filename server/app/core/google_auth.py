"""Google OAuth ID token verification."""

from fastapi import HTTPException
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.config import settings


def verify_google_id_token(token: str) -> dict:
    """Verify a Google ID token and return the payload.

    Returns dict with: sub, email, name, picture, email_verified
    """
    if not settings.google_client_id:
        raise HTTPException(status_code=501, detail="Google sign-in is not configured")

    try:
        payload = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            audience=settings.google_client_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {e}")

    if not payload.get("email_verified"):
        raise HTTPException(status_code=400, detail="Google email is not verified")

    return payload
