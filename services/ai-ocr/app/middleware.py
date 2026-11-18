import logging
from typing import Callable, Set
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings

logger = logging.getLogger(__name__)


class InternalApiKeyMiddleware(BaseHTTPMiddleware):
    """Enforces shared internal secret key authentication on private microservice routes.

    Exempts OpenAPI documentation endpoints and lightweight container liveness probes.
    """

    EXEMPT_PATHS: Set[str] = {
        "/docs",
        "/redoc",
        "/openapi.json",
        "/healthz",
        "/ping",
    }

    async def dispatch(self, request: Request, call_next: Callable[[Request], Response]) -> Response:
        # Allow OPTIONS preflight requests for CORS
        if request.method == "OPTIONS":
            return await call_next(request)

        # Allow exempt routes
        path = request.url.path
        if path in self.EXEMPT_PATHS:
            return await call_next(request)

        api_key = request.headers.get(settings.INTERNAL_API_KEY_HEADER)

        if not api_key:
            logger.warning("Unauthorized access attempt to %s: missing internal API key", path)
            return JSONResponse(
                status_code=401,
                content={"detail": f"Missing {settings.INTERNAL_API_KEY_HEADER} header"},
            )

        if api_key != settings.INTERNAL_API_KEY:
            logger.warning("Forbidden access attempt to %s: invalid internal API key", path)
            return JSONResponse(
                status_code=403,
                content={"detail": "Invalid internal API key"},
            )

        return await call_next(request)
