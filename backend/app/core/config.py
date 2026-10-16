"""Configurações da aplicação EduTrack AI."""

from urllib.parse import urlsplit

from pydantic import EmailStr, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL


class Settings(BaseSettings):
    """Configurações carregadas do arquivo .env."""

    PROJECT_NAME: str = "EduTrack AI API"
    API_V1_PREFIX: str = "/api/v1"

    # Segurança
    SECRET_KEY: str = Field(repr=False)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    RESET_TOKEN_EXPIRE_MINUTES: int = Field(default=30, ge=1, le=1440)

    # Recuperação de senha. O link nunca é montado a partir do Host da requisição.
    FRONTEND_URL: str = "http://localhost:5173"
    SMTP_HOST: str | None = None
    SMTP_PORT: int = Field(default=587, ge=1, le=65535)
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: str | None = Field(default=None, repr=False)
    SMTP_TLS: bool = True
    SMTP_SSL: bool = False
    SMTP_TIMEOUT_SECONDS: float = Field(default=10, gt=0, le=30)
    EMAILS_FROM_EMAIL: EmailStr | None = None
    EMAILS_FROM_NAME: str = "EduTrack"
    RESET_REQUEST_COOLDOWN_SECONDS: int = Field(default=60, ge=1)
    RESET_REQUEST_WINDOW_SECONDS: int = Field(default=900, ge=60)
    RESET_REQUEST_EMAIL_LIMIT: int = Field(default=3, ge=1)
    RESET_REQUEST_IP_LIMIT: int = Field(default=30, ge=1)

    @field_validator("FRONTEND_URL")
    @classmethod
    def validate_frontend_origin(cls, value: str) -> str:
        origin = urlsplit(value)
        if (origin.scheme not in {"http", "https"} or not origin.hostname
                or origin.username is not None or origin.password is not None
                or origin.query or origin.fragment or origin.path not in {"", "/"}):
            raise ValueError("FRONTEND_URL deve ser uma origem HTTP(S), sem caminho ou credenciais.")
        # Também valida portas inválidas antes de qualquer envio.
        _ = origin.port
        return value.rstrip("/")

    @model_validator(mode="after")
    def validate_email_transport(self):
        if self.SMTP_TLS and self.SMTP_SSL:
            raise ValueError("Use SMTP_TLS (STARTTLS) ou SMTP_SSL, nunca ambos.")
        if bool(self.SMTP_USERNAME) != bool(self.SMTP_PASSWORD):
            raise ValueError("Configure SMTP_USERNAME e SMTP_PASSWORD juntos.")
        if self.SMTP_USERNAME and not self.SMTP_TLS and not self.SMTP_SSL:
            raise ValueError("Autenticação SMTP exige SMTP_TLS ou SMTP_SSL.")
        if "\r" in self.EMAILS_FROM_NAME or "\n" in self.EMAILS_FROM_NAME:
            raise ValueError("EMAILS_FROM_NAME não pode conter quebras de linha.")
        return self

    # Banco de dados
    # DB_ENGINE = "sqlite" (padrão, zero configuração) ou "mssql" (SQL Server)
    DB_ENGINE: str = "sqlite"
    SQLITE_PATH: str = "edutrack.db"

    # Configurações usadas apenas quando DB_ENGINE="mssql"
    DB_SERVER: str = "localhost\\SQLEXPRESS"
    DB_NAME: str = "EduTrackDB"
    DB_DRIVER: str = "ODBC Driver 18 for SQL Server"

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    @property
    def DATABASE_URL(self) -> URL | str:
        """Constrói a URL de conexão com o banco de dados configurado."""
        if self.DB_ENGINE == "mssql":
            return URL.create(
                drivername="mssql+pyodbc",
                host=self.DB_SERVER,
                database=self.DB_NAME,
                query={
                    "driver": self.DB_DRIVER,
                    "TrustServerCertificate": "yes",
                    "Trusted_Connection": "yes",
                },
            )
        # SQLite: arquivo local, não exige nenhuma instalação
        return f"sqlite:///{self.SQLITE_PATH}"

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
