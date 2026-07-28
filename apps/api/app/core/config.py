from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import ConfigDict
from pathlib import Path

env_path = Path(__file__).resolve().parent.parent.parent / ".env"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=env_path,
        env_file_encoding="utf-8",
        extra="ignore"
    )

    DATABASE_URL: str
    REDIS_URL: str
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8000
    GEMINI_API_KEY: str
    LLM_PROVIDER: str = "gemini"
    GROK_API_KEY: str = ""
    GROK_MODEL: str = "grok-2-1212"
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15

settings = Settings()
