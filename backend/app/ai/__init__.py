"""AIDEN AI layer (spec §2) — RAG memory, independent from agent orchestration.

Agents never talk to Qdrant directly; they consume the stable `retrieve()`
service from `app.ai.rag`. The LLM client stays in `app.services.ai_client`
(one model gateway), while embeddings/chunking/retrieval live here.
"""
