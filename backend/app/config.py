from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    REDIS_TOKEN: str
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    S3_BUCKET_NAME: str
    S3_REGION: str = "ap-southeast-2"
    GITHUB_CLIENT_ID: str
    GITHUB_CLIENT_SECRET: str
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GEMINI_API_KEY: str
    JWT_SECRET_KEY: str
    AES_ENCRYPTION_KEY: str
    LLAMA_CLOUD_API_KEY: str
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"
    MONTHLY_TOKEN_BUDGET: int = 5000000
    SENTRY_DSN: str = ""
    SENTRY_ENVIRONMENT: str = "development"

    # Look for the .env file in the current directory and also the parent directory.
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
