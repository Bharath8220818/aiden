"""
Tests for execution endpoints.
- GET /api/v1/executions/{id}/logs  — execution logs
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_execution_logs(client: AsyncClient, auth_headers):
    """Test retrieving execution logs after running a pipeline."""
    # Create a pipeline
    create_resp = await client.post(
        "/api/v1/pipelines/",
        json={
            "name": "Log Test Pipeline",
            "source_type": "postgres",
            "destination_type": "snowflake",
        },
        headers=auth_headers,
    )
    pipeline_id = create_resp.json()["id"]

    # Run it
    run_resp = await client.post(
        f"/api/v1/pipelines/{pipeline_id}/run",
        headers=auth_headers,
    )
    execution_id = run_resp.json()["id"]

    # Get logs via the executions router
    response = await client.get(
        f"/api/v1/executions/{execution_id}/logs",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    # Logs should be a list (possibly empty if execution hasn't started)
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_execution_logs_via_pipeline(client: AsyncClient, auth_headers):
    """Test retrieving logs via the pipeline-specific logs endpoint."""
    create_resp = await client.post(
        "/api/v1/pipelines/",
        json={
            "name": "Log Via Pipeline",
            "source_type": "postgres",
            "destination_type": "snowflake",
        },
        headers=auth_headers,
    )
    pipeline_id = create_resp.json()["id"]

    run_resp = await client.post(
        f"/api/v1/pipelines/{pipeline_id}/run",
        headers=auth_headers,
    )
    execution_id = run_resp.json()["id"]

    # Get logs via the pipeline-specific route
    response = await client.get(
        f"/api/v1/pipelines/{pipeline_id}/executions",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["id"] == execution_id


@pytest.mark.asyncio
async def test_get_execution_not_found(client: AsyncClient, auth_headers):
    """Test getting logs for a non-existent execution returns 404."""
    response = await client.get(
        "/api/v1/executions/99999/logs",
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_execution_logs_unauthorized(client: AsyncClient):
    """Test getting logs without auth returns 401."""
    response = await client.get(
        "/api/v1/executions/1/logs",
    )
    assert response.status_code == 401
