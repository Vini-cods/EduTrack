import logging
import time
import uuid

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api import deps
from app.api.v1.router import api_router
from app.core.config import settings
from app.models.recovery_delivery import RecoveryDelivery

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=None if settings.ENVIRONMENT == "production" else f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=None if settings.ENVIRONMENT == "production" else "/docs",
    redoc_url=None if settings.ENVIRONMENT == "production" else "/redoc",
)

if settings.ENVIRONMENT == "production":
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.TRUSTED_HOSTS)


@app.middleware("http")
async def request_observability(request, call_next):
    request_id = uuid.uuid4().hex
    started = time.monotonic()
    try:
        response = await call_next(request)
    except Exception:
        # Exceções de SQL/SMTP podem carregar PII e tokens. Correlacionamos a
        # falha sem serializar exceção, body, query string, IP ou credenciais.
        logger.error("request_failed id=%s", request_id)
        response = JSONResponse(status_code=500, content={"detail": "Erro interno. Tente novamente.", "request_id": request_id})
    route = request.scope.get("route")
    logger.info("request id=%s method=%s route=%s status=%s duration_ms=%s",
                request_id, request.method, getattr(route, "path", "unmatched"),
                response.status_code, round((time.monotonic() - started) * 1000))
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Frame-Options"] = "DENY"
    if settings.ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000"
    return response

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health/live", include_in_schema=False)
def liveness():
    return {"status": "alive"}


@app.get("/health/ready", include_in_schema=False)
def readiness(db: Session = Depends(deps.get_db)):
    try:
        db.execute(text("SELECT 1"))
        # Também detecta banco sem a migration operacional, não só conectividade.
        db.execute(select(RecoveryDelivery.id).limit(1))
    except SQLAlchemyError:
        db.rollback()
        return JSONResponse(status_code=503, content={"status": "unavailable"})
    return {"status": "ready"}

@app.get("/")
def root():
    return {"message": "EduTrack API is running!"}
