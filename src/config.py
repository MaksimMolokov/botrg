from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """Настройки приложения, получаемые из окружения или файла .env."""

    telegram_token: str = Field(alias="TELEGRAM_TOKEN")
    openai_api_key: Optional[str] = Field(default=None, alias="OPENAI_API_KEY")
    openai_base_url: Optional[str] = Field(default=None, alias="OPENAI_BASE_URL")
    openai_organization: Optional[str] = Field(default=None, alias="OPENAI_ORGANIZATION")
    openai_response_model: Optional[str] = Field(default=None, alias="OPENAI_RESPONSE_MODEL")
    vector_store_path: str = Field(default="/data/chroma", alias="VECTOR_STORE_PATH")
    chunk_size: int = Field(default=800, alias="CHUNK_SIZE")
    chunk_overlap: int = Field(default=200, alias="CHUNK_OVERLAP")
    retrieval_top_k: int = Field(default=4, alias="RETRIEVAL_TOP_K")
    embeddings_provider: Optional[str] = Field(default=None, alias="EMBEDDINGS_PROVIDER")
    embeddings_endpoint: Optional[str] = Field(default=None, alias="EMBEDDINGS_ENDPOINT")
    embeddings_model: Optional[str] = Field(default=None, alias="EMBEDDINGS_MODEL")
    # Новые параметры для управления правами доступа
    admin_id: Optional[int] = Field(default=None, alias="ADMIN_ID")
    additional_admin_ids: Optional[str] = Field(default=None, alias="ADDITIONAL_ADMIN_IDS")
    initial_user_ids: Optional[str] = Field(default=None, alias="INITIAL_USER_IDS")
    
    # Устаревшие параметры (для обратной совместимости)
    allowed_users: Optional[str] = Field(default=None, alias="ALLOWED_USERS")
    admin_users: Optional[str] = Field(default=None, alias="ALLOWED_ADMIN_IDS")
    regular_users: Optional[str] = Field(default=None, alias="ALLOWED_USER_IDS")
    role: Optional[str] = Field(default=None, alias="USER_ROLE")

    model_config = SettingsConfigDict(
        env_file=(".env",),
        env_file_encoding="utf-8",
        env_nested_delimiter="__",
    )

