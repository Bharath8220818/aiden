"""Local Ollama inference — mirrors backend/app/ai/providers/ollama_provider.py.

Used by ml evaluation to score the *base* model exactly the way the backend
serves it in local development. Requires a reachable Ollama with the agent's
base tag pulled (e.g. `ollama pull qwen3:8b`).
"""
