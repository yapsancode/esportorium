"""Observability: structured logging, request tracing, and OpenTelemetry setup.

DEEPENING.md Item 4 — see it for the full spec. Three pieces:

  1. Structured JSON logs carrying a request_id (every request) and organiser_id
     (organiser-scoped routes only), via contextvars so callers don't have to
     thread them through every function signature.
  2. RequestContextMiddleware — generates the request_id, times the request,
     logs one line per request, and echoes the id back as a response header.
  3. OpenTelemetry: FastAPI auto-instrumentation for request tracing, console
     exporter for local dev, OTLP exporter when OTEL_EXPORTER_OTLP_ENDPOINT is
     set (deployed). This is the standard OTel env var — no custom flag needed.
"""
import contextvars
import json
import logging
import os
import sys
import time
import uuid
from typing import Optional

from starlette.types import ASGIApp, Receive, Scope, Send

# ─── Request-scoped context (read by the log formatter and ingest spans) ─────

request_id_var: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "request_id", default=None
)
organiser_id_var: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "organiser_id", default=None
)


# ─── Structured JSON logging ──────────────────────────────────────────────────

class _JsonFormatter(logging.Formatter):
    """One JSON object per log line, with request_id/organiser_id auto-attached
    from context so call sites never have to pass them explicitly."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        request_id = request_id_var.get()
        if request_id:
            payload["request_id"] = request_id
        organiser_id = organiser_id_var.get()
        if organiser_id:
            payload["organiser_id"] = organiser_id
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


def configure_logging() -> None:
    """Attach a JSON StreamHandler to the "app" logger namespace.

    Uvicorn only configures its own loggers (uvicorn.*); the root logger stays
    at WARNING, so app.* records are silently dropped otherwise. Guarded
    against duplicate handlers so `uvicorn --reload` doesn't double-log.
    """
    app_logger = logging.getLogger("app")
    if not app_logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(_JsonFormatter())
        app_logger.addHandler(handler)
    app_logger.setLevel(logging.INFO)
    app_logger.propagate = False


# ─── Request context middleware ───────────────────────────────────────────────

_access_logger = logging.getLogger("app.access")


class RequestContextMiddleware:
    """Assigns a request_id (reused from an incoming X-Request-ID if present),
    times the request, logs one structured line per response, and echoes the
    id back as a response header so it can be correlated client-side.

    Implemented as raw ASGI (not starlette.middleware.base.BaseHTTPMiddleware)
    on purpose: BaseHTTPMiddleware runs the downstream app in a spawned child
    task, and contextvars only flow *into* a child task at spawn time — a
    mutation made deeper in the stack (e.g. organiser_id_var.set() in
    require_organiser) never flows back *out* to the middleware once that
    child task finishes. That would make the access-log line below silently
    miss organiser_id even though every log line inside the request sees it
    correctly. Plain ASGI middleware has no such boundary — it's one
    sequential call stack in a single task — so mutations made downstream are
    visible here after `await self.app(...)` returns.
    """

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers") or [])
        incoming_id = headers.get(b"x-request-id")
        request_id = incoming_id.decode() if incoming_id else uuid.uuid4().hex[:16]
        token = request_id_var.set(request_id)

        status_code = 500

        async def send_wrapper(message: dict) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                message["headers"] = [
                    *message.get("headers", []),
                    (b"x-request-id", request_id.encode()),
                ]
            await send(message)

        method, path = scope.get("method", ""), scope.get("path", "")
        start = time.monotonic()
        try:
            await self.app(scope, receive, send_wrapper)
        except Exception:
            duration_ms = (time.monotonic() - start) * 1000
            _access_logger.exception("%s %s -> error (%.1fms)", method, path, duration_ms)
            raise
        else:
            duration_ms = (time.monotonic() - start) * 1000
            _access_logger.info(
                "%s %s -> %d (%.1fms)", method, path, status_code, duration_ms
            )
        finally:
            request_id_var.reset(token)


# ─── OpenTelemetry tracing ─────────────────────────────────────────────────────

def configure_tracing(app: ASGIApp) -> None:
    """Instrument FastAPI for request tracing.

    Exporter is chosen by environment, not a custom flag, mirroring the
    standard OTel SDK convention:
      - OTEL_EXPORTER_OTLP_ENDPOINT set  -> OTLP/HTTP exporter (Grafana Cloud,
        Honeycomb, etc. — set OTEL_EXPORTER_OTLP_HEADERS for auth).
      - unset (local dev)                -> console exporter, so traces are
        visible in the uvicorn terminal without standing up a collector.
      - unset + ENVIRONMENT=production   -> no exporter at all. The console
        exporter prints a large JSON block per span on every request, which
        would flood (and bill) Cloud Run logging. Structured request logs
        still cover production until an OTLP backend is configured.
    """
    from opentelemetry import trace
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.sdk.resources import SERVICE_NAME, Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import (
        BatchSpanProcessor,
        ConsoleSpanExporter,
        SimpleSpanProcessor,
    )

    service_name = os.getenv("OTEL_SERVICE_NAME", "esportorium-backend")
    resource = Resource.create({SERVICE_NAME: service_name})
    provider = TracerProvider(resource=resource)

    otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
    if otlp_endpoint:
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import (
            OTLPSpanExporter,
        )
        provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
    elif os.getenv("ENVIRONMENT", "development").lower() != "production":
        provider.add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter()))

    trace.set_tracer_provider(provider)
    FastAPIInstrumentor.instrument_app(app)


def get_tracer(name: str):
    from opentelemetry import trace
    return trace.get_tracer(name)
