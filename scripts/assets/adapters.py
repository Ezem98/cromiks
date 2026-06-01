"""
Adapters de fuente (v1: direct + wikimedia). YouTube/Instagram = F2.

Cada adapter resuelve un source_url + provenance a un SourceResult con la URL de
imagen final a bajar y los datos de crédito. El fetch real lo hace imaging.py.

- direct: la source_url YA es la imagen. author/license vienen del YAML (manual).
- wikimedia: consulta la Commons API (imageinfo+extmetadata) para obtener la URL
  original (full-res, no el thumb 500px) + Artist/LicenseShortName. Esos campos
  vienen como HTML y a veces faltan → strip de HTML + fallback a lo del YAML.
"""

from __future__ import annotations

import html
import re
from dataclasses import dataclass, field
from urllib.parse import unquote, urlparse

from config import USER_AGENT

_COMMONS_API = "https://commons.wikimedia.org/w/api.php"
_TAG_RE = re.compile(r"<[^>]+>")


class AdapterError(RuntimeError):
    pass


@dataclass
class SourceResult:
    image_url: str
    source_label: str
    author: str | None = None
    license: str | None = None
    notes: list[str] = field(default_factory=list)


def _strip_html(value: str | None) -> str | None:
    if not value:
        return None
    text = html.unescape(_TAG_RE.sub("", value)).strip()
    return text or None


def _host(url: str) -> str:
    return urlparse(url).netloc.lower().removeprefix("www.")


def _map_license(short: str | None) -> str | None:
    """Mapea LicenseShortName de Wikimedia a nuestro enum. Conserva share-alike."""
    if not short:
        return None
    s = short.strip().lower()
    if "cc0" in s or "public domain" in s or s == "pd":
        return "cc0"
    if "by-sa" in s or "by sa" in s:
        return "cc-by-sa"  # OBLIGACIÓN share-alike: NO aplanar a cc-by
    if "by" in s and "cc" in s:
        return "cc-by"
    return None  # licencia rara → que decida el curador a mano


def resolve_source(source_url: str, source_kind: str | None, photo) -> SourceResult:
    kind = (source_kind or "").lower()
    host = _host(source_url)
    is_wikimedia = "wikimedia.org" in host or "wikipedia.org" in host

    if kind == "wikimedia" or (kind in ("", None) and is_wikimedia):
        return _resolve_wikimedia(source_url, photo)
    if kind == "direct" or kind in ("", None):
        return _resolve_direct(source_url, photo)
    raise AdapterError(f"source_kind no soportado en v1: '{source_kind}' (solo direct/wikimedia)")


def _resolve_direct(source_url: str, photo) -> SourceResult:
    from catalog import nullify

    author = nullify(photo.get("author"))
    lic = nullify(photo.get("license"))
    notes: list[str] = []
    if not author:
        notes.append("sin author (direct: completá content.photo.author en el YAML)")
    if not lic:
        notes.append("sin license (direct: completá content.photo.license en el YAML)")
    return SourceResult(
        image_url=source_url,
        source_label=_host(source_url),
        author=author,
        license=lic,
        notes=notes,
    )


def _commons_filename(url: str) -> str:
    """Extrae el nombre de archivo de una URL de Commons (file page o upload/thumb)."""
    path = unquote(urlparse(url).path)
    if "/wiki/" in path:
        seg = path.split("/wiki/", 1)[1]
        return seg.split(":", 1)[1] if seg.lower().startswith("file:") else seg
    if "/thumb/" in path:
        # .../thumb/3/35/Name.jpg/500px-Name.jpg  → Name.jpg es el 3er segmento
        parts = [p for p in path.split("/thumb/", 1)[1].split("/") if p]
        return parts[2] if len(parts) >= 3 else parts[-1]
    return [p for p in path.split("/") if p][-1]


def _resolve_wikimedia(source_url: str, photo) -> SourceResult:
    from catalog import nullify

    try:
        import requests
    except ImportError as e:  # pragma: no cover
        raise AdapterError("Falta requests (pip install -r scripts/assets/requirements.txt)") from e

    fname = _commons_filename(source_url)
    notes: list[str] = []
    try:
        resp = requests.get(
            _COMMONS_API,
            params={
                "action": "query",
                "format": "json",
                "titles": f"File:{fname}",
                "prop": "imageinfo",
                "iiprop": "url|extmetadata",
            },
            headers={"User-Agent": USER_AGENT},
            timeout=20,
        )
        resp.raise_for_status()
        pages = resp.json().get("query", {}).get("pages", {})
        page = next(iter(pages.values()), {})
        info = (page.get("imageinfo") or [{}])[0]
    except Exception as e:
        notes.append(f"Commons API falló ({e}); uso la source_url directa y datos del YAML")
        return SourceResult(
            image_url=source_url,
            source_label="Wikimedia Commons",
            author=nullify(photo.get("author")),
            license=nullify(photo.get("license")),
            notes=notes,
        )

    image_url = info.get("url") or source_url  # original full-res
    ext = info.get("extmetadata") or {}
    artist = _strip_html((ext.get("Artist") or {}).get("value"))
    lic = _map_license((ext.get("LicenseShortName") or {}).get("value"))

    # Fallback a lo del YAML si la metadata no vino.
    author = artist or nullify(photo.get("author"))
    license_final = lic or nullify(photo.get("license"))
    if not artist:
        notes.append("Commons no devolvió Artist; uso author del YAML (verificá el crédito)")
    if not lic:
        notes.append("Commons no devolvió/mapeó la licencia; verificá content.photo.license")
    if license_final == "cc-by-sa":
        notes.append("CC-BY-SA: respetá share-alike en el crédito de /about")

    return SourceResult(
        image_url=image_url,
        source_label="Wikimedia Commons",
        author=author,
        license=license_final,
        notes=notes,
    )
