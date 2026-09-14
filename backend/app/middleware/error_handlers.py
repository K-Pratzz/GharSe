import logging
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pymongo.errors import DuplicateKeyError

logger = logging.getLogger(__name__)

async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.detail}
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Extract first error message or concatenate
    errors = exc.errors()
    if errors:
        first_err = errors[0]
        field = first_err.get("loc", ["field"])[-1]
        msg = first_err.get("msg", "Invalid value")
        detail_msg = f"{field}: {msg}"
    else:
        detail_msg = "Invalid request payload."
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"message": detail_msg}
    )

async def duplicate_key_exception_handler(request: Request, exc: DuplicateKeyError):
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"message": "An account or record with this value already exists."}
    )

async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"message": "Something went wrong. Please try again."}
    )
