from fastapi import Request, FastAPI
from fastapi.responses import JSONResponse

class ResumeForgeException(Exception):
    """Base exception class for ResumeForge app."""
    def __init__(self, detail: str):
        self.detail = detail

class NotFound(ResumeForgeException):
    """Exception raised when a resource is not found."""
    pass

class Forbidden(ResumeForgeException):
    """Exception raised when access is denied."""
    pass

class ValidationError(ResumeForgeException):
    """Exception raised when data validation fails."""
    pass

class BudgetExceeded(ResumeForgeException):
    """Exception raised when monthly LLM token budget is exceeded."""
    pass

def register_exception_handlers(app: FastAPI) -> None:
    """
    Registers custom exception handlers with the FastAPI application.
    """
    @app.exception_handler(NotFound)
    async def not_found_handler(request: Request, exc: NotFound):
        return JSONResponse(
            status_code=404,
            content={"detail": exc.detail, "error_code": "NOT_FOUND"},
        )

    @app.exception_handler(Forbidden)
    async def forbidden_handler(request: Request, exc: Forbidden):
        return JSONResponse(
            status_code=403,
            content={"detail": exc.detail, "error_code": "FORBIDDEN"},
        )

    @app.exception_handler(ValidationError)
    async def validation_handler(request: Request, exc: ValidationError):
        return JSONResponse(
            status_code=422,
            content={"detail": exc.detail, "error_code": "VALIDATION_ERROR"},
        )

    @app.exception_handler(BudgetExceeded)
    async def budget_exceeded_handler(request: Request, exc: BudgetExceeded):
        return JSONResponse(
            status_code=429,  # Use 429 Too Many Requests to represent budget exhaustion
            content={"detail": exc.detail, "error_code": "BUDGET_EXCEEDED"},
        )
