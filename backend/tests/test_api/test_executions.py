"""
Tests for execution endpoints.
- GET /api/v1/executions/{id}/logs  — execution logs
- GET /api/v1/pipelines/{id}/executions — pipeline execution history
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
    assert run_resp.status_code == 200
    execution_id = run_resp.json()["id"]

    # Let the background executor finish before teardown
    final = await _wait_for_execution(client, auth_headers, pipeline_id, execution_id)
    assert final is not None, "execution did not reach a terminal state"
    assert final["status"] == "success"

    # Get logs via the executions router (returns {"execution_id", "logs"})
    response = await client.get(
        f"/api/v1/executions/{execution_id}/logs",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    assert "logs" in data
    assert isinstance(data["logs"], (list, dict))


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
    assert run_resp.status_code == 200
    execution_id = run_resp.json()["id"]

    # Let the background executor finish before teardown
    final = await _wait_for_execution(client, auth_headers, pipeline_id, execution_id)
    assert final is not None, "execution did not reach a terminal state"

    # Get execution history via the pipeline-specific route
    response = await client.get(
        f"/api/v1/pipelines/{pipeline_id}/executions",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["id"] == execution_id
    assert data[0]["status"] == "success"


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
