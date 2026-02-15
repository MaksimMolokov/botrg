from __future__ import annotations

import os
from typing import Any, Dict, List

from ..config_store import ConfigStore


def get_public_web_url() -> str | None:
    """Возвращает публичный URL веб-панели или None, если он невалиден.

    Источники:
    1) env WEB_APP_PUBLIC_URL
    2) JSON APP_CONFIG_JSON -> WEB_APP_PUBLIC_URL
    """
    try:
        url = os.environ.get("WEB_APP_PUBLIC_URL", "").strip()
        if not url:
            store_path = os.environ.get("APP_CONFIG_JSON", "/app/data/app-config.json")
            cfg = ConfigStore(store_path).load()
            url = str(cfg.get("WEB_APP_PUBLIC_URL", "") or "").strip()
        if not url:
            return None
        from urllib.parse import urlparse
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return None
        if not parsed.netloc:
            return None
        return url
    except Exception:
        return None


def parse_allowed_users(raw: str | None) -> List[int]:
    """Парсит список разрешенных пользователей из строки с ID через запятую."""
    if not raw:
        return []
    result: List[int] = []
    for part in raw.split(","):
        p = (part or "").strip()
        if not p:
            continue
        try:
            result.append(int(p))
        except Exception:
            continue
    return result


def load_allowed_users_from_store() -> List[int]:
    """Загружает белый список пользователей из JSON-конфига."""
    try:
        store_path = os.environ.get("APP_CONFIG_JSON", "/app/data/app-config.json")
        cfg: Dict[str, Any] = ConfigStore(store_path).load()
        return parse_allowed_users(str(cfg.get("ALLOWED_USERS", "") or ""))
    except Exception:
        return []


def parse_history_limit(val: Any) -> int:
    """Парсит лимит истории из произвольного значения (0..50)."""
    try:
        x = int(val)
    except Exception:
        return 10
    if x < 0:
        x = 0
    if x > 50:
        x = 50
    return x


def load_history_limit_from_store(default: int = 10) -> int:
    """Загружает лимит истории из JSON-конфига с валидацией."""
    try:
        store_path = os.environ.get("APP_CONFIG_JSON", "/app/data/app-config.json")
        cfg: Dict[str, Any] = ConfigStore(store_path).load()
        if "HISTORY_MAX_PAIRS" not in cfg:
            return default
        return parse_history_limit(cfg.get("HISTORY_MAX_PAIRS"))
    except Exception:
        return default


def is_admin(user_id: int, admins: List[int]) -> bool:
    """Проверяет, является ли пользователь администратором."""
    return user_id in admins


def is_regular_user(user_id: int, users: List[int]) -> bool:
    """Проверяет, является ли пользователь обычным пользователем."""
    return user_id in users and not is_admin(user_id, users)


def load_admin_users_from_store() -> List[int]:
    """Загружает список администраторов из JSON-конфига."""
    try:
        store_path = os.environ.get("APP_CONFIG_JSON", "/app/data/app-config.json")
        cfg: Dict[str, Any] = ConfigStore(store_path).load()
        admin_str = str(cfg.get("ALLOWED_ADMIN_IDS", "") or "")
        return parse_allowed_users(admin_str)
    except Exception:
        return []


def load_regular_users_from_store() -> List[int]:
    """Загружает список обычных пользователей из JSON-конфига."""
    try:
        store_path = os.environ.get("APP_CONFIG_JSON", "/app/data/app-config.json")
        cfg: Dict[str, Any] = ConfigStore(store_path).load()
        user_str = str(cfg.get("ALLOWED_USER_IDS", "") or "")
        return parse_allowed_users(user_str)
    except Exception:
        return []


def load_admin_id_from_store() -> Optional[int]:
    """Загружает ID первичного администратора из JSON-конфига."""
    try:
        store_path = os.environ.get("APP_CONFIG_JSON", "/app/data/app-config.json")
        cfg: Dict[str, Any] = ConfigStore(store_path).load()
        admin_id = cfg.get("ADMIN_ID")
        if admin_id is not None:
            return int(admin_id)
        return None
    except Exception:
        return None


def load_all_admins_from_store() -> List[int]:
    """Загружает список всех администраторов (первичный + дополнительные) из JSON-конфига."""
    try:
        store_path = os.environ.get("APP_CONFIG_JSON", "/app/data/app-config.json")
        cfg: Dict[str, Any] = ConfigStore(store_path).load()
        admins = []
        
        # Добавляем первичного администратора
        primary = cfg.get("ADMIN_ID")
        if primary is not None:
            admins.append(int(primary))
        
        # Добавляем дополнительных администраторов
        additional_str = str(cfg.get("ADDITIONAL_ADMIN_IDS", "") or "")
        admins.extend(parse_allowed_users(additional_str))
        
        # Для обратной совместимости: читаем ALLOWED_ADMIN_IDS
        legacy_str = str(cfg.get("ALLOWED_ADMIN_IDS", "") or "")
        legacy_admins = parse_allowed_users(legacy_str)
        for admin in legacy_admins:
            if admin not in admins:
                admins.append(admin)
        
        return admins
    except Exception:
        return []


def load_all_users_from_store() -> List[int]:
    """Загружает список всех пользователей (админы + обычные) из JSON-конфига."""
    admins = load_all_admins_from_store()
    users = []
    
    try:
        store_path = os.environ.get("APP_CONFIG_JSON", "/app/data/app-config.json")
        cfg: Dict[str, Any] = ConfigStore(store_path).load()
        
        # Добавляем первичных пользователей
        initial_str = str(cfg.get("INITIAL_USER_IDS", "") or "")
        users.extend(parse_allowed_users(initial_str))
        
        # Для обратной совместимости: читаем ALLOWED_USER_IDS
        legacy_str = str(cfg.get("ALLOWED_USER_IDS", "") or "")
        legacy_users = parse_allowed_users(legacy_str)
        for user in legacy_users:
            if user not in users:
                users.append(user)
        
        # Объединяем с администраторами (без дубликатов)
        all_users = admins.copy()
        for user in users:
            if user not in all_users:
                all_users.append(user)
        
        return all_users
    except Exception:
        return admins


