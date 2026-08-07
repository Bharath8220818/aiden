import pytest
from app.services.nfl_prediction_service import NFLPredictionService


@pytest.mark.skipif(
    not NFLPredictionService().is_available(),
    reason="NFL prediction model artifact is not available in this environment",
)
def test_nfl_prediction_service_loads_model():
    service = NFLPredictionService()
    assert service.is_available()
    assert service.model is not None
    assert service.expected_features


@pytest.mark.skipif(
    not NFLPredictionService().is_available(),
    reason="NFL prediction model artifact is not available in this environment",
)
def test_nfl_prediction_service_predicts_with_required_columns():
    service = NFLPredictionService()
    assert service.is_available()
    sample_row = {name: 0 for name in service.expected_features}
    predictions = service.predict([sample_row])
    assert isinstance(predictions, list)
    assert len(predictions) == 1


@pytest.mark.asyncio
async def test_nfl_prediction_endpoint_requires_auth(client):
    response = await client.post(
        "/api/v1/predictions/nfl",
        json={"rows": [{"features": {}}]},
    )
    assert response.status_code == 401
