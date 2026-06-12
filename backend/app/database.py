import ssl
import urllib.parse
import asyncpg
from typing import Optional
from app.config import settings

# Global connection pool reference
pool: Optional[asyncpg.Pool] = None

def get_ssl_context() -> ssl.SSLContext:
    """
    Creates an explicit SSL context configured to handle Neon connection flags
    without handshaking or certificate verification errors.
    """
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

def clean_dsn(dsn: str) -> str:
    """
    Strips query parameters like sslmode from the DSN to prevent conflicts
    with the explicitly provided SSL context in asyncpg.
    """
    parsed = urllib.parse.urlparse(dsn)
    return urllib.parse.urlunparse((
        parsed.scheme,
        parsed.netloc,
        parsed.path,
        "",
        "",
        ""
    ))

async def init_db() -> None:
    """
    Initializes the asyncpg connection pool.
    """
    global pool
    if pool is not None:
        return

    ssl_context = get_ssl_context()
    cleaned_dsn = clean_dsn(settings.DATABASE_URL)

    pool = await asyncpg.create_pool(
        dsn=cleaned_dsn,
        ssl=ssl_context,
        min_size=2,
        max_size=10,
    )

async def close_db() -> None:
    """
    Closes the asyncpg connection pool.
    """
    global pool
    if pool is not None:
        await pool.close()
        pool = None
