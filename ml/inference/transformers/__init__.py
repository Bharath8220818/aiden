"""In-process transformers + PEFT loading (evaluation path on GPU).

Loads a base model once, then swaps LoRA adapters per agent for batch
evaluation against the golden test set:

    model = AutoModelForCausalLM.from_pretrained(base, quantization_config=...)
    model = PeftModel.from_pretrained(model, ml/adapters/<agent>/)

Not used by the backend serving path (FastAPI goes through the provider
factory) — this exists so `run_baseline.py --use-model` and post-training
evaluation run against the *same* weights that get pushed to the Hub.
"""
