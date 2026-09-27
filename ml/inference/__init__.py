"""AIDEN inference paths.

Three serving paths, one interface (dicts in, dicts out):

    local/          Ollama on the dev machine / compose stack (base models)
    huggingface/    HF Inference for fine-tuned adapters (HF_TOKEN server-side)
    transformers/   in-process base+LoRA loading for evaluation on GPU

Selection mirrors the backend factory: the contract's `serving_provider`
decides; Ollama stays the local/dev default, HF takes over in production
for adapters marked trained. The frontend never sees HF_TOKEN — the FastAPI
backend owns it.
"""
