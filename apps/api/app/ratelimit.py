"""In-memory sliding-window rate limits for the unauthenticated write routes (ruling B-22).

The demo path has no login (CLAUDE.md), and every assessment spends free-tier quota upstream, so the
routes that start work are limited per client address. State lives in the process: with several
instances each enforces its own window, which is still a useful brake. Behind Cloud Run the address
is taken from X-Forwarded-For (uvicorn runs with --proxy-headers).
"""

import time
from collections import defaultdict, deque
from collections.abc import Callable

from fastapi import Request

from app.errors import ApiError

_PRUNE_AT = 5000  # distinct clients held before expired entries are swept


class RateLimiter:
    def __init__(self, limit: int, window_s: float = 60.0) -> None:
        self.limit = limit
        self.window_s = window_s
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def hit(self, key: str, now: float | None = None) -> None:
        """Count one request from `key`; raise 429 with Retry-After when over the limit."""
        t = time.monotonic() if now is None else now
        recent = self._hits[key]
        while recent and recent[0] <= t - self.window_s:
            recent.popleft()
        if len(recent) >= self.limit:
            wait = max(1, int(recent[0] + self.window_s - t) + 1)
            raise ApiError(
                429,
                f"too many requests: limit is {self.limit} per {int(self.window_s)} s; "
                f"retry in {wait} s",
                headers={"Retry-After": str(wait)},
            )
        recent.append(t)
        if len(self._hits) > _PRUNE_AT:
            self._sweep(t)

    def _sweep(self, now: float) -> None:
        stale = [k for k, q in self._hits.items() if not q or q[-1] <= now - self.window_s]
        for k in stale:
            del self._hits[k]

    def reset(self) -> None:
        self._hits.clear()


_LIMITERS: list[RateLimiter] = []


def rate_limit(limit: int, window_s: float = 60.0) -> Callable[[Request], None]:
    """A FastAPI dependency with its own bucket: `dependencies=[Depends(rate_limit(10))]`."""
    limiter = RateLimiter(limit, window_s)
    _LIMITERS.append(limiter)

    def dependency(request: Request) -> None:
        limiter.hit(request.client.host if request.client else "unknown")

    return dependency


def reset_all() -> None:
    """Forget every client (tests)."""
    for limiter in _LIMITERS:
        limiter.reset()
