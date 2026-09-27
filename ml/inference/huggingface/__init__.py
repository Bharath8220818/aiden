"""Hugging Face inference for fine-tuned AIDEN adapters.

Serving path for adapters that passed the promotion gate:

    Agent -> Model Registry -> HuggingFaceProvider -> <org>/AIDEN-<agent>-agent

`push_adapter.py` is the Phase-10 upload tool (run only on the training
machine / Colab, where HF_TOKEN is available). The backend talks to the Hub
through `backend/app/ai/providers/huggingface_provider.py` with HF_TOKEN
read from the backend env — never shipped to the frontend.
"""
