"""
Config + cliente R2 (boto3) para la CLI de assets (T9 del pipeline de imágenes).

Lee credenciales del entorno (.env.local). Separa los dos mundos de R2:
  - SUBIR (privado): R2_ENDPOINT (S3 API) + keys → boto3.
  - SERVIR (público): assets.cromiks.app → lo arma el resolver TS, NO se usa acá.

La CLI escribe en el YAML solo la `r2_key` (cromos/<album>/<card_id>.webp); la URL
servida se compone en runtime como ${NEXT_PUBLIC_R2_PUBLIC_BASE}/${r2_key}.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

# User-Agent con contacto (cortesía + requisito de varias fuentes, ej. Wikimedia).
USER_AGENT = "Cromiks-AssetBot/1.0 (+https://cromiks.app; contacto: bajas@cromiks.app)"

# Specs de imagen (docs/assets/photos.md): 3:4, >=800x1066, WebP, <200KB.
TARGET_W = 800
TARGET_H = 1066
MAX_KB = 200


class ConfigError(RuntimeError):
    pass


@dataclass(frozen=True)
class Settings:
    endpoint: str
    access_key_id: str
    secret_access_key: str
    bucket: str
    account_id: str | None


def _load_dotenv() -> None:
    """Carga .env.local si existe (mismo archivo que usa el seed)."""
    try:
        from dotenv import load_dotenv
    except ImportError as e:  # pragma: no cover
        raise ConfigError(
            "Falta python-dotenv. Instalá: pip install -r scripts/assets/requirements.txt"
        ) from e
    load_dotenv(REPO_ROOT / ".env.local")


def load_settings() -> Settings:
    """
    Settings de R2 desde el entorno. Falla con mensaje claro si falta algo.
    Nombres alineados a tu .env.local: R2_ENDPOINT / R2_ACCESS_KEY_ID /
    R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME / R2_ACCOUNT_ID.
    """
    _load_dotenv()

    endpoint = os.environ.get("R2_ENDPOINT") or os.environ.get("R2_PUBLIC_URL")
    access = os.environ.get("R2_ACCESS_KEY_ID")
    secret = os.environ.get("R2_SECRET_ACCESS_KEY")
    bucket = os.environ.get("R2_BUCKET_NAME") or os.environ.get("R2_BUCKET")
    account = os.environ.get("R2_ACCOUNT_ID")

    missing = [
        name
        for name, val in [
            ("R2_ENDPOINT", endpoint),
            ("R2_ACCESS_KEY_ID", access),
            ("R2_SECRET_ACCESS_KEY", secret),
            ("R2_BUCKET_NAME", bucket),
        ]
        if not val
    ]
    if missing:
        raise ConfigError(
            f"Faltan env vars de R2: {', '.join(missing)}. Verificá tu .env.local "
            f"(ver scripts/assets/README.md / docs/r2-setup.md)."
        )

    return Settings(
        endpoint=endpoint.rstrip("/"),
        access_key_id=access,
        secret_access_key=secret,
        bucket=bucket,
        account_id=account,
    )


def make_s3_client(settings: Settings):
    """Cliente S3-compat contra R2. region='auto', sin ACL (R2 las rechaza)."""
    try:
        import boto3
        from botocore.config import Config
    except ImportError as e:  # pragma: no cover
        raise ConfigError(
            "Falta boto3. Instalá: pip install -r scripts/assets/requirements.txt"
        ) from e

    return boto3.client(
        "s3",
        endpoint_url=settings.endpoint,
        aws_access_key_id=settings.access_key_id,
        aws_secret_access_key=settings.secret_access_key,
        region_name="auto",
        config=Config(signature_version="s3v4", retries={"max_attempts": 3, "mode": "standard"}),
    )


def build_key(album_id: str, card_id: str) -> str:
    """Key determinístico del asset. Un asset por cromo."""
    return f"cromos/{album_id}/{card_id}.webp"


def upload_webp(client, bucket: str, key: str, data: bytes) -> None:
    """
    PUT del WebP a R2. ContentType + CacheControl (los objetos son inmutables por
    key; un cambio de foto re-sube el mismo key). SIN ACL: el acceso público es por
    el dominio bindeado (assets.cromiks.app), no por ACL de objeto.
    """
    client.put_object(
        Bucket=bucket,
        Key=key,
        Body=data,
        ContentType="image/webp",
        CacheControl="public, max-age=31536000, immutable",
    )
