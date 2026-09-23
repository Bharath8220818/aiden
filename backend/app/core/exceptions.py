"""Domain exceptions + standardized error envelope.

Every handler returns:

    {
      "error": {"code": "...", "message": "...", "request_id": "..."},
      "message": "..."          # top-level alias for frontend parsers
    }
"""

from __future__ import annotations


class AppError(Exception):
    """Base class for all application-level errors."""

    status_code: int = 500
    code: str = "INTERNAL_ERROR"
    message: str = "An unexpected error occurred"

    def __init__(self, message: str | None = None, code: str | None = None) -> None:
        self.message = message or self.message
        if code:
            self.code = code
        super().__init__(self.message)


class NotFoundError(AppError):
    status_code = 404
    code = "NOT_FOUND"
    message = "The requested resource was not found"


class UnauthorizedError(AppError):
    status_code = 401
    code = "UNAUTHORIZED"
    message = "Authentication is required"


class InvalidCredentialsError(UnauthorizedError):
    code = "INVALID_CREDENTIALS"
    message = "Invalid email or password"


class ForbiddenError(AppError):
    status_code = 403
    code = "FORBIDDEN"
    message = "You do not have permission to perform this action"


class ValidationError(AppError):
    status_code = 400
    code = "VALIDATION_ERROR"
    message = "The request payload is invalid"


class ConflictError(AppError):
    status_code = 409
    code = "CONFLICT"
    message = "The request conflicts with the current state"


class DuplicateEmailError(ConflictError):
    code = "EMAIL_ALREADY_EXISTS"
    message = "A user with this email already exists"


class DuplicateSlugError(ConflictError):
    code = "SLUG_ALREADY_EXISTS"
    message = "A workspace with this slug already exists"


def error_envelope(code: str, message: str, request_id: str | None = None) -> dict:
    """Build the standard error envelope."""
    return {
        "error": {"code": code, "message": message, "request_id": request_id},
        "message": message,
    }
