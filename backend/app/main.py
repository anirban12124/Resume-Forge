from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db, close_db
from app.redis import redis_client
from app.common.exceptions import register_exception_handlers

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("app.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages startup and shutdown lifecycles of database pool, redis client, and other dependencies.
    """
    logger.info("Starting up ResumeForge backend...")
    # Initialize asyncpg database pool
    await init_db()
    logger.info("Neon PostgreSQL connection pool initialized.")
    
    # Verify Upstash Redis connectivity
    try:
        await redis_client.get("startup_ping")
        logger.info("Upstash Redis connection validated successfully.")
    except Exception as e:
        logger.error(f"Failed to verify Upstash Redis connection: {e}")

    yield

    logger.info("Shutting down ResumeForge backend...")
    # Close database pool and redis HTTP client
    await close_db()
    await redis_client.close()
    logger.info("Connections closed. Shutdown complete.")

app = FastAPI(
    title="ResumeForge API",
    description="Backend API foundation for ResumeForge ATS optimizer.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register custom exception handlers
register_exception_handlers(app)

from app.auth import auth_router
from app.vaults import vaults_router
from app.projects import projects_router
from app.internships import internships_router

app.include_router(auth_router)
app.include_router(vaults_router, prefix="/vaults")
app.include_router(projects_router)
app.include_router(internships_router)


@app.get("/health", tags=["Health"])
async def health_check():
    """
    API sanity health check endpoint.
    """
    return {"status": "healthy", "service": "ResumeForge Backend"}
