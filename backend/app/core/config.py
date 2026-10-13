from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    SMTP_HOST: str = "smtp.gmail.com"

    SMTP_PORT: int = 587

    SMTP_USERNAME: str = ""

    SMTP_PASSWORD: str = ""

    SMTP_FROM_EMAIL: str = ""

    SMTP_FROM_NAME: str = "QuoteFlow"

    SMTP_USE_TLS: bool = True

    JWT_SECRET_KEY: str = "quotation-automation-secret-key"

    JWT_ALGORITHM: str = "HS256"

    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    ADMIN_USERNAME: str = "admin"

    ADMIN_PASSWORD: str = "admin123"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()