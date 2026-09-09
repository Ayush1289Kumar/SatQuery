from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import get_settings
from .deps import get_request_id
from .routers import analyses, jobs, results, sessions, uploads
from .schemas import ApiError, problem

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Backend API for PrithviQ satellite imagery analysis.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def response_data(data: object, request_id: str = "local") -> dict[str, object]:
    return {"data": data, "request_id": request_id}


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    """Stamp every request with a request id (envelope + X-Request-ID header)."""
    request.state.request_id = f"req_{uuid4().hex[:12]}"
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    return response


@app.exception_handler(ApiError)
async def api_error_handler(request: Request, exc: ApiError) -> JSONResponse:
    """Contract errors (404/409/413/415/422 ...) as RFC 7807-style problem bodies."""
    return JSONResponse(
        status_code=exc.status,
        content=problem(
            request_id=get_request_id(request),
            status=exc.status,
            code=exc.code,
            title=exc.title,
            detail=exc.detail,
            field_errors=exc.field_errors,
        ),
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    titles = {401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 405: "Method Not Allowed"}
    codes = {401: "UNAUTHORIZED", 403: "FORBIDDEN", 404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED"}
    return JSONResponse(
        status_code=exc.status_code,
        content=problem(
            request_id=get_request_id(request),
            status=exc.status_code,
            code=codes.get(exc.status_code, "HTTP_ERROR"),
            title=titles.get(exc.status_code, "Request failed"),
            detail=str(exc.detail),
        ),
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    field_errors = [
        {
            "field": ".".join(str(part) for part in error.get("loc", [])[1:]) or "body",
            "message": str(error.get("msg", "invalid value")),
        }
        for error in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content=problem(
            request_id=get_request_id(request),
            status=422,
            code="VALIDATION_ERROR",
            title="Validation failed",
            detail="The request body failed schema validation.",
            field_errors=field_errors,
        ),
    )


@app.get("/health", tags=["health"])
def health() -> dict[str, object]:
    return response_data({"status": "ok", "service": settings.app_name})


@app.get("/health/ready", tags=["health"])
def readiness() -> JSONResponse:
    dependencies = {
        "api": "ok",
        "auth": "configured" if settings.jwt_secret else "not_configured",
        "database": "configured" if settings.database_url else "not_configured",
        "redis": "configured" if settings.redis_url else "not_configured",
        "object_storage": (
            "configured"
            if settings.object_storage_endpoint
            and settings.object_storage_access_key
            and settings.object_storage_secret_key
            else "not_configured"
        ),
        "worker": "not_configured",
    }
    ready = all(value == "ok" or value == "configured" for value in dependencies.values())
    return JSONResponse(
        status_code=200 if ready else 503,
        content=response_data({"status": "ready" if ready else "not_ready", **dependencies}),
    )


@app.get(f"{settings.api_prefix}/health", tags=["health"])
def versioned_health() -> dict[str, object]:
    return health()


@app.get(f"{settings.api_prefix}/health/ready", tags=["health"])
def versioned_readiness() -> JSONResponse:
    return readiness()


# --- Demo-critical analysis lifecycle (api.md sections 2-5) ------------------
# Uploads -> sessions -> analyses -> jobs -> results. The worker behind these
# routers is the deterministic in-process mock described in worker.py.

app.include_router(uploads.router, prefix=settings.api_prefix, tags=["uploads"])
app.include_router(sessions.router, prefix=settings.api_prefix, tags=["sessions"])
app.include_router(analyses.router, prefix=settings.api_prefix, tags=["analyses"])
app.include_router(jobs.router, prefix=settings.api_prefix, tags=["jobs"])
app.include_router(results.router, prefix=settings.api_prefix, tags=["results"])

