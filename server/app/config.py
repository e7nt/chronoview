from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://timelines:timelines@db:5432/timelines"
    database_url_sync: str = "postgresql://timelines:timelines@db:5432/timelines"
    cors_origins: str = "http://localhost:5173"

    # JWT Auth
    secret_key: str = "dev-secret-key-change-in-production"
    # When true, unauthenticated requests fall back to a seeded dev user.
    # Default is false so a stock checkout deployed anywhere is safe — opt in via .env locally.
    dev_mode: bool = False
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours

    # Google OAuth (optional)
    google_client_id: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    model_config = {"env_file": ".env"}


settings = Settings()
