"""
Tests for pipeline endpoints.
- POST   /api/v1/pipelines/               — create
- GET    /api/v1/pipelines/               — list
- GET    /api/v1/pipelines/{id}           — get by ID
- PUT    /api/v1/pipelines/{id}           — update
- DELETE /api/v1/pipelines/{id}           — soft-delete
- POST   /api/v1/pipelines/from-prompt    — create from NL prompt
- POST   /api/v1/pipelines/{id}/run       — execute
"""

import asyncio
import time

import pytest
from httpx import AsyncClient


async def _wait_for_execution(
    client: AsyncClient,
    auth_headers: dict,
    pipeline_id: int,
    execution_id: int,
    timeout: float = 15.0,
):
    """Poll execution status until it reaches a terminal state.

    The run endpoint spawns a background task (PipelineExecutor) that
    writes to the same test DB session. We wait for it to finish so the
    fixture teardown doesn't race the executor's transactions.
    """
    deadline = time.time() + timeout
    while time.time() < deadline:
        resp = await client.get(
            f"/api/v1/pipelines/{pipeline_id}/executions",
            headers=auth_headers,
        )
        if resp.status_code == 200:
            for ex in resp.json():
                if ex["id"] == execution_id and ex["status"] in ("success", "failed", "cancelled"):
                    return ex
        await asyncio.sleep(0.3)
    return None


@pytest.mark.asyncio
async def test_create_pipeline_success(client: AsyncClient, auth_headers):
    """Test creating a pipeline with valid data."""
    response = await client.post(
        "/api/v1/pipelines/",
        json={
            "name": "Test Pipeline",
            "description": "A test pipeline",
            "source_type": "postgres",
            "destination_type": "snowflake",
            "schedule": "0 6 * * *",
            "config": {"table": "sales"},
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Pipeline"
    assert data["source_type"] == "postgres"
    assert data["destination_type"] == "snowflake"
    assert "id" in data
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_create_pipeline_unauthorized(client: AsyncClient):
    """Test creating a pipeline without authentication."""
    response = await client.post(
        "/api/v1/pipelines/",
        json={
            "name": "Test Pipeline",
            "source_type": "postgres",
            "destination_type": "snowflake",
        },
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_pipelines(client: AsyncClient, auth_headers):
    """Test listing pipelines for authenticated user."""
    # Create a pipeline first
    await client.post(
        "/api/v1/pipelines/",
        json={
            "name": "List Test Pipeline",
            "source_type": "postgres",
            "destination_type": "snowflake",
        },
        headers=auth_headers,
    )

    response = await client.get(
        "/api/v1/pipelines/",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    # Verify the pipeline we created is in the list
    names = [p["name"] for p in data]
    assert "List Test Pipeline" in names


@pytest.mark.asyncio
async def test_list_pipelines_empty(client: AsyncClient, auth_headers):
    """Test listing pipelines when none exist."""
    response = await client.get(
        "/api/v1/pipelines/",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_pipeline_by_id(client: AsyncClient, auth_headers):
    """Test getting a single pipeline by ID."""
    create_resp = await client.post(
        "/api/v1/pipelines/",
        json={
            "name": "Get Test Pipeline",
            "source_type": "mysql",
            "destination_type": "bigquery",
        },
        headers=auth_headers,
    )
    pipeline_id = create_resp.json()["id"]

    response = await client.get(
        f"/api/v1/pipelines/{pipeline_id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Get Test Pipeline"
    assert data["source_type"] == "mysql"
    assert data["destination_type"] == "bigquery"


@pytest.mark.asyncio
async def test_get_pipeline_not_found(client: AsyncClient, auth_headers):
    """Test getting a non-existent pipeline returns 404."""
    response = await client.get(
        "/api/v1/pipelines/99999",
        headers=auth_headers,
    )
    assert response.status_code == 404
    assert "not found" in response.text.lower()


@pytest.mark.asyncio
async def test_update_pipeline(client: AsyncClient, auth_headers):
    """Test updating a pipeline's name."""
    create_resp = await client.post(
        "/api/v1/pipelines/",
        json={
            "name": "Update Test Pipeline",
            "source_type": "postgres",
            "destination_type": "snowflake",
        },
        headers=auth_headers,
    )
    pipeline_id = create_resp.json()["id"]

    response = await client.put(
        f"/api/v1/pipelines/{pipeline_id}",
        json={"name": "Updated Pipeline Name"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Pipeline Name"


@pytest.mark.asyncio
async def test_delete_pipeline(client: AsyncClient, auth_headers):
    """Test soft-deleting a pipeline (sets is_active=False)."""
    create_resp = await client.post(
        "/api/v1/pipelines/",
        json={
            "name": "Delete Test Pipeline",
            "source_type": "postgres",
            "destination_type": "snowflake",
        },
        headers=auth_headers,
    )
    pipeline_id = create_resp.json()["id"]

    response = await client.delete(
        f"/api/v1/pipelines/{pipeline_id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    # The endpoint returns {"status": "deleted", "pipeline_id": ...}
    assert data["status"] == "deleted"
    assert data["pipeline_id"] == pipeline_id

    # Verify it's no longer in the list (soft-deleted)
    list_resp = await client.get("/api/v1/pipelines/", headers=auth_headers)
    names = [p["name"] for p in list_resp.json()]
    assert "Delete Test Pipeline" not in names


@pytest.mark.asyncio
async def test_from_prompt_success(client: AsyncClient, auth_headers):
    """Test creating a pipeline from a natural language prompt.

    Note: The from-prompt endpoint accepts a JSON body with a 'prompt' field
    (PromptRequest schema), not query parameters.
    """
    response = await client.post(
        "/api/v1/pipelines/from-prompt",
        json={"prompt": "Build a daily sales pipeline from PostgreSQL to Snowflake"},
        headers=auth_headers,
    )
    # This may fail if HuggingFace dependencies aren't loaded,
    # but should still return 200 with rule-based fallback
    assert response.status_code == 200
    data = response.json()
    assert data["name"] is not None
    # Rule-based parser will detect postgres and snowflake
    assert data["source_type"] in ("postgres", "unknown")
    assert data["destination_type"] in ("snowflake", "unknown")


@pytest.mark.asyncio
async def test_from_prompt_empty(client: AsyncClient, auth_headers):
    """Test from-prompt with empty prompt returns 400."""
    response = await client.post(
        "/api/v1/pipelines/from-prompt",
        json={"prompt": ""},
        headers=auth_headers,
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_run_pipeline_success(client: AsyncClient, auth_headers):
    """Test running a pipeline.

    The run endpoint creates an execution record and returns it directly,
    with the execution object having an 'id' field.
    """
    # Create a pipeline first
    create_resp = await client.post(
        "/api/v1/pipelines/",
        json={
            "name": "Run Test Pipeline",
            "source_type": "postgres",
            "destination_type": "snowflake",
        },
        headers=auth_headers,
    )
    pipeline_id = create_resp.json()["id"]

    response = await client.post(
        f"/api/v1/pipelines/{pipeline_id}/run",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "id" in data  # execution ID
    assert data["status"] in ("pending", "running")
    assert data["pipeline_id"] == pipeline_id

    # Let the background executor finish before teardown
    final = await _wait_for_execution(client, auth_headers, pipeline_id, data["id"])
    assert final is not None, "execution did not reach a terminal state"
    assert final["status"] == "success"


@pytest.mark.asyncio
async def test_run_pipeline_not_found(client: AsyncClient, auth_headers):
    """Test running a non-existent pipeline returns 404."""
    response = await client.post(
        "/api/v1/pipelines/99999/run",
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_run_pipeline_unauthorized(client: AsyncClient):
    """Test running a pipeline without auth returns 401."""
    response = await client.post(
        "/api/v1/pipelines/1/run",
    )
    assert response.status_code == 401
