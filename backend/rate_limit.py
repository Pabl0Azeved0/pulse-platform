"""In-process sliding-window rate limiter, keyed by client IP.

Sufficient for a single-process deployment. For a multi-replica deployment
this should be backed by the Redis instance already in the stack (see
events.py) so the window is shared across workers.
"""

import time
from collections import defaultdict, deque
from threading import Lock
from typing import Optional


class SlidingWindowRateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque] = defaultdict(deque)
        self._lock = Lock()

    def is_allowed(self, key: str, limit: int, window_seconds: int) -> bool:
        """Record a hit for `key`; return False if it exceeds `limit`
        within the trailing `window_seconds`."""
        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            hits = self._hits[key]
            while hits and hits[0] <= cutoff:
                hits.popleft()
            if len(hits) >= limit:
                return False
            hits.append(now)
            return True

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


rate_limiter = SlidingWindowRateLimiter()


def client_ip(request: Optional[object]) -> str:
    """Best-effort client IP for rate-limit keying."""
    if request is None:
        return "unknown"
    client = getattr(request, "client", None)
    if client and getattr(client, "host", None):
        return client.host
    headers = getattr(request, "headers", None)
    if headers:
        forwarded = headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return "unknown"
