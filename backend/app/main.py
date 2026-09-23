"""AIDEN Backend application entry point."""

from __future__ import annotations

import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1.router import api_router
from app.api.v1.ws import ws_endpoint
from app.core.config import get_settings
from app.core.database import engine
from app.core.exceptions import AppError, error_envelope
from app.core.logging import get_logger, log_request, setup_logging
from app.models import Base  # noqa: F401  (imports register all mappers)

logger = get_logger("aiden.main")
settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    setup_logging()
    logger.info(
        "Starting %s v%s (%s)",
        settings.APP_NAME,
        settings.APP_VERSION,
        settings.ENVIRONMENT,
    )
    yield
    logger.info("Shutting down %s", settings.APP_NAME)
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Autonomous Data Engineering platform — Phase 0 + Phase 1 backend.",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
    lifespan=lifespan,
)

# --------------------------------------------------------------------------- #
# CORS
# --------------------------------------------------------------------------- #
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

# Per-IP rate limiting (60 req/min default) — registered AFTER CORS so CORS
# headers still wrap 429 responses.
from app.core.rate_limit import RateLimitMiddleware  # noqa: E402

app.add_middleware(RateLimitMiddleware)


# --------------------------------------------------------------------------- #
# Exception handlers — standardized error envelope
# --------------------------------------------------------------------------- #
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=exc.status_code,
        content=error_envelope(exc.code, exc.message, request_id),
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    if exc.status_code == 404:
        code, message = "NOT_FOUND", "The requested resource was not found"
    elif exc.status_code == 405:
        code, message = "METHOD_NOT_ALLOWED", str(exc.detail) or "Method not allowed"
    else:
        code = f"HTTP_{exc.status_code}"
        message = str(exc.detail) if exc.detail else "Request failed"
    return JSONResponse(
        status_code=exc.status_code,
        content=error_envelope(code, message, request_id),
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    errors = exc.errors()
    first = errors[0] if errors else {}
    field = ".".join(str(part) for part in first.get("loc", []) if part != "body")
    message = f"{field}: {first.get('msg', 'invalid request')}" if field else "invalid request"
    return JSONResponse(
        status_code=422,
        content=error_envelope("VALIDATION_ERROR", message, request_id),
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content=error_envelope(
            "INTERNAL_ERROR",
            "An unexpected error occurred",
            request_id,
        ),
    )


# --------------------------------------------------------------------------- #
# Request middleware — request_id + structured access logging
# --------------------------------------------------------------------------- #
@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = request_id
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        # ExceptionMiddleware re-raises after the handler — log and re-raise so
        # the standardized handlers above produce the response.
        raise
    duration_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Request-ID"] = request_id
    log_request(
        logger,
        request_id=request_id,
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=duration_ms,
        user_id=getattr(request.state, "user_id", None),
    )
    return response


# --------------------------------------------------------------------------- #
# Routes
# --------------------------------------------------------------------------- #
app.include_router(api_router, prefix=settings.API_PREFIX)


# WebSocket realtime channel (token via ?token= query param — the browser
# WebSocket API cannot set Authorization headers).
app.add_api_websocket_route(f"{settings.API_PREFIX}/ws", ws_endpoint)
app.add_api_websocket_route("/ws", ws_endpoint)


@app.get("/", tags=["meta"])
async def root() -> dict:
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": f"{settings.API_PREFIX}/health/healthz",
    }
