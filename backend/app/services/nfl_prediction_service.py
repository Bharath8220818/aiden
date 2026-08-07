import logging
import pickle
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)

MODEL_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "data-set"
MODEL_FILE = MODEL_DIR / "model_nfl_2026.pkl"


class NFLPredictionService:
    def __init__(self):
        self.model = None
        self.expected_features: List[str] = []
        self._loaded = False
        self._load_model()

    def _load_model(self) -> None:
        if not MODEL_FILE.exists():
            logger.warning("NFL model artifact not found: %s", MODEL_FILE)
            return

        try:
            import catboost  # noqa: F401
        except ImportError as exc:
            logger.warning("CatBoost is not installed; NFL prediction disabled: %s", exc)
            return

        try:
            with open(MODEL_FILE, "rb") as f:
                self.model = pickle.load(f)

            if hasattr(self.model, "feature_names_"):
                self.expected_features = list(self.model.feature_names_)

            self._loaded = True
            logger.info("NFL prediction model loaded from %s", MODEL_FILE)
        except Exception as exc:
            logger.exception("Failed to load NFL prediction model: %s", exc)
            self.model = None
            self.expected_features = []
            self._loaded = False

    def is_available(self) -> bool:
        return self._loaded and self.model is not None

    def predict(self, features: List[Dict[str, Any]]) -> List[float]:
        if not self.is_available():
            raise RuntimeError("NFL prediction model is unavailable")

        if not features:
            return []

        try:
            import pandas as pd
        except ImportError as exc:
            raise RuntimeError("pandas is required for NFL prediction input processing") from exc

        df = pd.DataFrame(features)

        if self.expected_features:
            missing_features = [name for name in self.expected_features if name not in df.columns]
            if missing_features:
                raise ValueError(
                    "Missing required feature(s) for NFL prediction: "
                    + ", ".join(missing_features)
                )
            df = df[self.expected_features]

        try:
            predictions = self.model.predict(df)
            result = np.asarray(predictions)
            if result.ndim == 0:
                return [float(result)]
            return result.ravel().tolist()
        except Exception as exc:
            logger.exception("NFL prediction failed: %s", exc)
            raise


nfl_prediction_service = NFLPredictionService()
