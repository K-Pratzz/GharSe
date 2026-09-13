import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGO_URI: str = "mongodb://127.0.0.1:27017/gharse"
    JWT_SECRET: str = "gharse_super_secret_jwt_key_for_development_2026"
    JWT_EXPIRES_IN: str = "7d"
    PORT: int = 5000
    CLIENT_URL: str = "http://localhost:5173"
    DEFAULT_COMMISSION_PERCENT: int = 15

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
