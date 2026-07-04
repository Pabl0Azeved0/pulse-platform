"""Centralized global constants, grouped by the module that uses them."""


class Schema:
    # Input length caps
    MAX_CONTENT_LENGTH = 5000
    MAX_BIO_LENGTH = 500
    MAX_AVATAR_LENGTH = 2048
    USERNAME_MAX_LENGTH = 50
    EMAIL_MAX_LENGTH = 254
    PASSWORD_MIN_LENGTH = 8
    PASSWORD_MAX_LENGTH = 128

    # Pagination and query-cost guards (mitigate alias/width amplification DoS)
    DEFAULT_PAGE_SIZE = 50
    MAX_PAGE_SIZE = 100
    MAX_ALIASES = 15
    MAX_QUERY_DEPTH = 12

    # Redis pub/sub channel for the new-post subscription
    NEW_POSTS_CHANNEL = "posts"


class RateLimit:
    # (max_requests, window_seconds) per IP
    LOGIN = (5, 60)
    REGISTER = (5, 60)
    UPLOAD = (20, 60)
    GLOBAL = (120, 60)


class Upload:
    DIR = "uploads"
    MAX_BYTES = 5 * 1024 * 1024  # 5 MB
    ALLOWED_IMAGE_TYPES = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
    }
