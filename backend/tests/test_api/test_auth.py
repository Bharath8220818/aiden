"""
Tests for authentication endpoints.
- POST /api/v1/auth/signup  — user registration
- POST /api/v1/auth/login   — user login (returns JWT)
- GET  /api/v1/auth/me      — current user profile
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_signup_success(client: AsyncClient):
    """Test signing up with valid credentials."""
    response = await client.post(
        "/api/v1/auth/signup",
        json={
            "username": "newuser",
            "email": "newuser@example.com",
            "full_name": "New User",
            "password": "SecurePass123",
        },
    )
    assert response.status_code in (200, 201)
    data = response.json()
    assert data["username"] == "newuser"
    assert data["email"] == "newuser@example.com"
    assert data["full_name"] == "New User"
    assert "id" in data
    # Password hash should never be returned
    assert "hashed_password" not in data
    assert "password" not in data


@pytest.mark.asyncio
async def test_signup_duplicate_username(client: AsyncClient):
    """Test signing up with an already-taken username."""
    # Create first user
    await client.post(
        "/api/v1/auth/signup",
        json={
            "username": "dupeuser",
            "email": "dupe1@example.com",
            "full_name": "Duplicate User",
            "password": "SecurePass123",
        },
    )
    # Try creating with same username
    response = await client.post(
        "/api/v1/auth/signup",
        json={
            "username": "dupeuser",
            "email": "dupe2@example.com",
            "full_name": "Duplicate User 2",
            "password": "SecurePass123",
        },
    )
    assert response.status_code == 400
    assert "already" in response.text.lower()


@pytest.mark.asyncio
async def test_signup_duplicate_email(client: AsyncClient):
    """Test signing up with an already-taken email."""
    await client.post(
        "/api/v1/auth/signup",
        json={
            "username": "emaildupe1",
            "email": "shared@example.com",
            "full_name": "Email Dupe 1",
            "password": "SecurePass123",
        },
    )
    response = await client.post(
        "/api/v1/auth/signup",
        json={
            "username": "emaildupe2",
            "email": "shared@example.com",
            "full_name": "Email Dupe 2",
            "password": "SecurePass123",
        },
    )
    assert response.status_code == 400
    assert "already" in response.text.lower()


@pytest.mark.asyncio
async def test_signup_weak_password(client: AsyncClient):
    """Test signing up with a weak password returns error."""
    response = await client.post(
        "/api/v1/auth/signup",
        json={
            "username": "weakpwuser",
            "email": "weakpw@example.com",
            "full_name": "Weak Password User",
            "password": "123",
        },
    )
    assert response.status_code in (400, 422)
    assert "password" in response.text.lower() or "validation" in response.text.lower()


@pytest.mark.asyncio
async def test_signup_invalid_email(client: AsyncClient):
    """Test signing up with an invalid email returns 422."""
    response = await client.post(
        "/api/v1/auth/signup",
        json={
            "username": "bademail",
            "email": "not-an-email",
            "full_name": "Bad Email",
            "password": "SecurePass123",
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    """Test logging in with valid credentials returns JWT token."""
    # Signup first
    await client.post(
        "/api/v1/auth/signup",
        json={
            "username": "loginuser",
            "email": "loginuser@example.com",
            "full_name": "Login User",
            "password": "SecurePass123",
        },
    )
    # Login
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "loginuser", "password": "SecurePass123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    # Token should be a non-empty string
    assert len(data["access_token"]) > 20


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    """Test login with wrong password returns 401."""
    await client.post(
        "/api/v1/auth/signup",
        json={
            "username": "wrongpwuser",
            "email": "wrongpw@example.com",
            "full_name": "Wrong PW User",
            "password": "SecurePass123",
        },
    )
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "wrongpwuser", "password": "WrongPassword123"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    """Test login with a user that doesn't exist returns 401."""
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "nonexistent_user_xyz", "password": "SomePass123"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_invalid_form(client: AsyncClient):
    """Test login with missing fields returns 422."""
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "testuser"},  # Missing password
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_me_success(client: AsyncClient):
    """Test getting current user profile with valid token."""
    # Signup
    await client.post(
        "/api/v1/auth/signup",
        json={
            "username": "meuser",
            "email": "meuser@example.com",
            "full_name": "Me User",
            "password": "SecurePass123",
        },
    )
    # Login to get token
    login_resp = await client.post(
        "/api/v1/auth/login",
        data={"username": "meuser", "password": "SecurePass123"},
    )
    token = login_resp.json()["access_token"]

    # Get profile
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "meuser"
    assert data["email"] == "meuser@example.com"
    assert data["full_name"] == "Me User"


@pytest.mark.asyncio
async def test_me_unauthorized(client: AsyncClient):
    """Test getting profile without token returns 401."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_invalid_token(client: AsyncClient):
    """Test getting profile with garbage token returns 401."""
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer this-is-not-a-valid-jwt-token"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_expired_token(client: AsyncClient):
    """Test getting profile with a token that looks valid but is expired."""
    # This is a JWT with an 'exp' claim in the past
    # We test by setting a very short expire time if possible,
    # or just verify the auth middleware rejects bad tokens
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"},
    )
    assert response.status_code == 401
