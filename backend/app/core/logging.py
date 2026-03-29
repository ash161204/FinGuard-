import json
import logging
import time
from datetime import datetime, UTC
from typing import Any
from uuid import uuid4

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class StructuredLogger(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:
        log_entry = {
            "timestamp": datetime.fromtimestamp(record.created, UTC).isoformat(),
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage(),
        }
        if hasattr(record, "request_id"):
            log_entry["request_id"] = str(record.request_id)
        if hasattr(record, "job_id"):
            log_entry["job_id"] = str(record.job_id)
        
        if record.exc_info:
            log_entry["exception"] = logging.Formatter().formatException(record.exc_info)

        def json_serial(obj):
            if isinstance(obj, UUID):
                return str(obj)
            raise TypeError(f"Type {type(obj)} not serializable")

        print(json.dumps(log_entry, default=json_serial))


def configure_logging(level: str = "INFO") -> None:
    root = logging.getLogger()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))
    
    # Remove existing handlers
    for handler in root.handlers[:]:
        root.removeHandler(handler)
        
    handler = StructuredLogger()
    root.addHandler(handler)


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Any) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid4()))
        request.state.request_id = request_id
        
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        
        logging.info(
            f"Handled {request.method} {request.url.path} - {response.status_code}",
            extra={"request_id": request_id, "duration_ms": int(process_time * 1000)}
        )
        
        response.headers["X-Request-ID"] = request_id
        return response
