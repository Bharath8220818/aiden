"""
Supabase Auth endpoints — email signup/login, GitHub OAuth, and token exchange.

These endpoints integrate with Supabase Auth (https://whjstcclxklikppvvwfr.supabase.co)
to provide email and GitHub OAuth authentication while keeping the existing
JWT-based backend auth for protected routes.
"""

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
import logging

from app.config import settings
from app.services.supabase_service import _get_supabase

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Request / Response schemas ──────────────────────────────────────────────

class SupabaseSignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    full_name: Optional[str] = None


class SupabaseLoginRequest(BaseModel):
    email: EmailStr
    password: str


class SupabaseTokenRequest(BaseModel):
    """Exchange a Supabase access token for a backend JWT."""
    supabase_access_token: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Optional[dict] = None


# ── Helper: get Supabase client ─────────────────────────────────────────────

def _get_supabase_client():
    """Get the Supabase client from the supabase_service."""
    client = _get_supabase()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase service not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        )
    return client


# ── Email / Password Auth ──────────────────────────────────────────────────

@router.post("/signup", response_model=AuthResponse)
async def supabase_signup(data: SupabaseSignupRequest):
    """Sign up a new user via Supabase Auth (email + password)."""
    client = _get_supabase_client()

    try:
        result = client.auth.sign_up({
            "email": data.email,
            "password": data.password,
            "options": {
                "data": {
                    "full_name": data.full_name or "",
                }
            }
        })

        if result.user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Signup failed. Please try again.",
            )

        return AuthResponse(
            access_token=result.session.access_token if result.session else "",
            user={
                "id": result.user.id,
                "email": result.user.email,
                "full_name": data.full_name or "",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Supabase signup error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/login", response_model=AuthResponse)
async def supabase_login(data: SupabaseLoginRequest):
    """Log in an existing user via Supabase Auth (email + password)."""
    client = _get_supabase_client()

    try:
        result = client.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password,
        })

        if result.user is None or result.session is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        return AuthResponse(
            access_token=result.session.access_token,
            user={
                "id": result.user.id,
                "email": result.user.email,
                "full_name": result.user.user_metadata.get("full_name", ""),
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Supabase login error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )


# ── GitHub OAuth ────────────────────────────────────────────────────────────

@router.get("/github")
async def supabase_github_login():
    """
    Redirect to Supabase GitHub OAuth.

    The user is redirected to GitHub for authorization, then Supabase
    handles the callback and redirects back to the frontend with tokens.
    """
    client = _get_supabase_client()

    try:
        # Supabase generates the GitHub OAuth URL
        result = client.auth.sign_in_with_oauth({
            "provider": "github",
            "options": {
                "redirectTo": f"{settings.FRONTEND_URL or 'http://localhost:5173'}/auth/callback",
            }
        })

        if result.url:
            return RedirectResponse(url=result.url)
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate GitHub OAuth URL",
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Supabase GitHub OAuth error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GitHub OAuth failed. Please try again.",
        )


@router.post("/github/callback")
async def supabase_github_callback(request: Request):
    """
    Handle the GitHub OAuth callback from Supabase.

    After GitHub authorization, Supabase redirects to the frontend with
    tokens in the URL hash. The frontend exchanges them here.
    """
    try:
        body = await request.json()
        access_token = body.get("access_token")

        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing access_token in callback",
            )

        # Verify the token with Supabase
        client = _get_supabase_client()
        user = client.auth.get_user(access_token)

        if user and user.user:
            return AuthResponse(
                access_token=access_token,
                user={
                    "id": user.user.id,
                    "email": user.user.email,
                    "full_name": user.user.user_metadata.get("full_name", ""),
                    "avatar_url": user.user.user_metadata.get("avatar_url", ""),
                },
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid GitHub OAuth token",
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Supabase GitHub callback error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="GitHub OAuth callback failed",
        )


# ── Token Exchange ──────────────────────────────────────────────────────────

@router.post("/exchange-token", response_model=AuthResponse)
async def exchange_supabase_token(data: SupabaseTokenRequest):
    """
    Exchange a Supabase access token for a backend JWT.

    Use this when the frontend has a Supabase token and needs a
    backend JWT for protected API routes.
    """
    from app.core.security import create_access_token
    from app.models.user import User
    from app.database import AsyncSessionLocal
    from sqlalchemy import select

    client = _get_supabase_client()

    try:
        # Verify the Supabase token
        user_response = client.auth.get_user(data.supabase_access_token)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Supabase token",
            )

        sb_user = user_response.user

        # Find or create user in local database
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(User).where(User.email == sb_user.email)
            )
            db_user = result.scalar_one_or_none()

            if not db_user:
                # Create new user from Supabase data
                import uuid
                from app.core.security import get_password_hash
                username = sb_user.email.split("@")[0]
                db_user = User(
                    email=sb_user.email,
                    username=username,
                    full_name=sb_user.user_metadata.get("full_name", username),
                    hashed_password=get_password_hash(str(uuid.uuid4())),  # random — OAuth users login via Supabase, not local password
                    is_active=True,
                )
                session.add(db_user)
                await session.commit()
                await session.refresh(db_user)

            # Generate backend JWT
            backend_token = create_access_token(data={"sub": str(db_user.id)})

            return AuthResponse(
                access_token=backend_token,
                user={
                    "id": db_user.id,
                    "email": db_user.email,
                    "username": db_user.username,
                    "full_name": db_user.full_name,
                },
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Token exchange error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token exchange failed",
        )
