from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings

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
