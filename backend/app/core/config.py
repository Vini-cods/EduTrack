"""Configurações da aplicação EduTrack AI."""

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL


class Settings(BaseSettings):
    """Configurações carregadas do arquivo .env."""

    PROJECT_NAME: str = "EduTrack AI API"
    API_V1_PREFIX: str = "/api/v1"

    # Segurança
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    RESET_TOKEN_EXPIRE_MINUTES: int = 30

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
