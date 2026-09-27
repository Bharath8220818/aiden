"""AIDEN ML — package marker.

The ml workspace is standalone tooling (contracts, datasets, preprocessing,
training, evaluation). It imports the backend `app` package via
`ml.sync_guard` when available; nothing in `backend/app` imports back into
`ml` (the sync guard lives in backend/tests instead).
"""

__version__ = "0.1.0"
