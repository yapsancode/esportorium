from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request


def _client_ip(request: Request) -> str:
    """Best-effort real client IP for rate limiting.

    Cloud Run terminates the connection, so request.client.host is Google's
    front-end proxy — not the user. The real client is the first entry of
    X-Forwarded-For. Note: that header is client-spoofable, so this is good
    enough for casual brute-force throttling, not a hard security boundary.
    """
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=_client_ip)
