"""
Cliente de la Openverse API (búsqueda de imágenes con licencia abierta).

Openverse (api.openverse.org) federa Flickr-CC, Wikimedia, museos, etc. Solo indexa
obras de licencia abierta (CC / dominio público) y devuelve URL directa + creator +
license + dimensiones — justo lo que el discovery necesita para pre-filtrar con
`crop_ok` SIN bajar la imagen.

Diseño para testear sin red: `search()` arma cache + parseo sobre `_raw_search()`,
que es el único punto que toca HTTP. Los tests monkeypatchean `_raw_search`.

- Cache a disco por hash de (query, page_size): re-correr el discovery no re-pega la API.
- Backoff exponencial en 429 / 5xx.
"""

from __future__ import annotations

import hashlib
import json
import time
from dataclasses import asdict, dataclass
from pathlib import Path

from config import USER_AGENT

_API = "https://api.openverse.org/v1/images/"
_CACHE_DIR = Path(__file__).resolve().parent / ".cache" / "openverse"


class OpenverseError(RuntimeError):
    pass


@dataclass
class Candidate:
    image_url: str
    thumbnail: str | None
    author: str | None
    license: str | None  # código openverse: by | by-sa | cc0 | pdm | by-nc | ...
    license_url: str | None
    width: int | None
    height: int | None
    source: str | None  # flickr | wikimedia | ...
    landing_url: str | None  # página de origen (para verificar a ojo)
    title: str | None

    def to_dict(self) -> dict:
        return asdict(self)


def _query_key(query: str, page_size: int) -> str:
    return hashlib.sha256(f"{query}|{page_size}".encode("utf-8")).hexdigest()[:16]


def _to_int(v: object) -> int | None:
    try:
        return int(v)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


def _parse(raw: dict) -> list[Candidate]:
    """Resultados crudos de la API → Candidates. Descarta items sin URL de imagen."""
    out: list[Candidate] = []
    for r in raw.get("results") or []:
        url = r.get("url")
        if not url:
            continue
        out.append(
            Candidate(
                image_url=url,
                thumbnail=r.get("thumbnail"),
                author=r.get("creator"),
                license=(r.get("license") or None),
                license_url=r.get("license_url"),
                width=_to_int(r.get("width")),
                height=_to_int(r.get("height")),
                source=r.get("source"),
                landing_url=r.get("foreign_landing_url"),
                title=r.get("title"),
            )
        )
    return out


def _raw_search(query: str, page_size: int, attempts: int = 3, timeout: int = 20) -> dict:
    """Único punto que toca HTTP. Devuelve el JSON crudo. Backoff en 429/5xx."""
    try:
        import requests
    except ImportError as e:  # pragma: no cover
        raise OpenverseError(
            "Falta requests (pip install -r scripts/assets/requirements.txt)"
        ) from e

    last_err: Exception | None = None
    for attempt in range(attempts):
        try:
            resp = requests.get(
                _API,
                params={"q": query, "page_size": page_size},
                headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
                timeout=timeout,
            )
            if resp.status_code == 429 or resp.status_code >= 500:
                raise OpenverseError(f"Openverse {resp.status_code}")
            resp.raise_for_status()
            return resp.json()
        except OpenverseError as e:
            last_err = e  # rate-limit / 5xx: reintentamos con backoff
        except Exception as e:  # red, JSON inválido
            last_err = e
        if attempt < attempts - 1:
            time.sleep(2**attempt)  # 1s, 2s
    raise OpenverseError(f"Openverse falló tras {attempts} intentos: {last_err}")


def search(
    query: str, *, page_size: int = 8, use_cache: bool = True, cache_dir: Path | None = None
) -> list[Candidate]:
    """
    Busca `query` en Openverse y devuelve Candidates (puede ser []). Cachea el JSON
    crudo a disco por (query, page_size): un hit no re-pega la API.
    """
    cdir = cache_dir or _CACHE_DIR
    cache_file = cdir / f"{_query_key(query, page_size)}.json"

    if use_cache and cache_file.exists():
        try:
            return _parse(json.loads(cache_file.read_text(encoding="utf-8")))
        except (ValueError, OSError):
            pass  # cache corrupto: re-pega

    raw = _raw_search(query, page_size)

    if use_cache:
        try:
            cdir.mkdir(parents=True, exist_ok=True)
            cache_file.write_text(json.dumps(raw), encoding="utf-8")
        except OSError:
            pass  # cachear es best-effort

    return _parse(raw)
