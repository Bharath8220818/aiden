"""
Tests for authentication endpoints.
- POST /api/v1/auth/signup  (returns 201)
- POST /api/v1/auth/login   (returns JWT)
- GET  /api/v1/auth/me      (returns current user)
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_signup_success(client: AsyncClient):
    """Test successful user registration — returns 201."""
    response = await client.post(
        "/api/v1/auth/signup",
        json={
            "username": "newuser",
            "email": "new@example.com",
            "full_name": "New User",
            "password": "SecurePass123",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "newuser"
    assert data["email"] == "new@example.com"
    assert data["full_name"] == "New User"
    assert "id" in data
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_signup_duplicate_email(client: AsyncClient):
    """Test signup with an already registered email."""
    await client.post(
        "/api/v1/auth/signup",
        json={
            "username": "user1",
            "email": "duplicate@example.com",
            "full_name": "User One",
            "password": "SecurePass123",
        },
    )
    response = await client.post(
        "/api/v1/auth/signup",
        json={
            "username": "user2",
            "email": "duplicate@example.com",
            "full_name": "User Two",
            "password": "SecurePass456",
        },
    )
    assert response.status_code == 400
    assert "already registered" in response.text.lower()


@pytest.mark.asyncio
async def test_signup_duplicate_username(client: AsyncClient):
    """Test signup with an already taken username."""
    await client.post(
        "/api/v1/auth/signup",
        json={
            "username": "takenuser",
            "email": "first@example.com",
            "full_name": "First User",
            "password": "SecurePass123",
        },
    )
    response = await client.post(
        "/api/v1/auth/signup",
        json={
            "username": "takenuser",
            "email": "second@example.com",
            "full_name": "Second User",
            "password": "SecurePass456",
        },
    )
    assert response.status_code == 400
    assert "username already taken" in response.text.lower()


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    """Test successful login — returns JWT token."""
    # Create a user first
    await client.post(
        "/api/v1/auth/signup",
        json={
            "username": "loginuser",
            "email": "login@example.com",
            "full_name": "Login User",
            "password": "SecurePass123",
        },
    )
    # Login with form data (OAuth2 password flow)
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "loginuser", "password": "SecurePass123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_with_email(client: AsyncClient):
    """Test login using email instead of username."""
    await client.post(
        "/api/v1/auth/signup",
        json={
            "username": "emaillogin",
            "email": "emaillogin@example.com",
            "full_name": "Email Login",
            "password": "SecurePass123",
        },
    )
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "emaillogin@example.com", "password": "SecurePass123"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient):
    """Test login with incorrect password."""
    await client.post(
        "/api/v1/auth/signup",
        json={
            "username": "badpassuser",
            "email": "badpass@example.com",
            "full_name": "Bad Pass User",
            "password": "SecurePass123",
        },
    )
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "badpassuser", "password": "WrongPassword"},
    )
    assert response.status_code == 401
    assert "incorrect" in response.text.lower()


@pytest.mark.asyncio
async def test_login_user_not_found(client: AsyncClient):
    """Test login with non-existent user."""
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "nonexistent", "password": "anything"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_success(client: AsyncClient, test_user):
    """Test getting current user with valid token."""
    # Login to get a fresh token using the dynamically created test_user
    login_resp = await client.post(
        "/api/v1/auth/login",
        data={"username": test_user.username, "password": "SecurePass123"},
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]

    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == test_user.username
    assert data["email"] == test_user.email
    assert data["full_name"] == test_user.full_name
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_me_unauthorized(client: AsyncClient):
    """Test /me without token returns 401."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_invalid_token(client: AsyncClient):
    """Test /me with garbage token returns 401."""
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer this.is.not.a.valid.jwt"},
    )
    assert response.status_code == 401
