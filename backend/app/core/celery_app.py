"""AIDEN Celery application.

The canonical Celery instance. Import with::

    from app.core.celery_app import celery_app

Start a worker with::

    cd backend && venv\\Scripts\\celery.exe -A app.core.celery_app worker --loglevel=info
"""
from celery import Celery

from app.config import settings

celery_app = Celery(
    "aiden",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Don't keep results forever — the DB is the source of truth
    result_expires=3600,
    worker_prefetch_multiplier=1,  # fair scheduling for long pipeline tasks
)
