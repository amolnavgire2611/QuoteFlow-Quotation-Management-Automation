from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    SMTP_HOST: str = "smtp.gmail.com"

    SMTP_PORT: int = 587

    SMTP_USERNAME: str = ""

    SMTP_PASSWORD: str = ""

    SMTP_FROM_EMAIL: str = ""

    SMTP_FROM_NAME: str = "QuoteFlow"

    SMTP_USE_TLS: bool = True


    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()