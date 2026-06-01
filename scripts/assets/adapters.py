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
import math
import os
import re
from dataclasses import dataclass, field
from urllib.parse import unquote, urlparse

from config import USER_AGENT

_COMMONS_API = "https://commons.wikimedia.org/w/api.php"
_SYNDICATION_API = "https://cdn.syndication.twimg.com/tweet-result"
_TAG_RE = re.compile(r"<[^>]+>")
_B36 = "0123456789abcdefghijklmnopqrstuvwxyz"


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
    is_twitter = host in ("x.com", "twitter.com") or host.endswith((".x.com", ".twitter.com"))
    is_instagram = host == "instagram.com" or host.endswith(".instagram.com")

    if kind in ("x", "twitter") or (not kind and is_twitter):
        return _resolve_twitter(source_url, photo)
    if kind == "instagram" or (not kind and is_instagram):
        return _resolve_instagram(source_url, photo)
    if kind == "wikimedia" or (not kind and is_wikimedia):
        return _resolve_wikimedia(source_url, photo)
    if kind == "direct" or not kind:
        return _resolve_direct(source_url, photo)
    raise AdapterError(
        f"source_kind no soportado: '{source_kind}' (direct | wikimedia | x | instagram)"
    )


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


# ── X / Twitter (syndication API, sin login) ─────────────────────────────────


def _tweet_id(url: str) -> str:
    m = re.search(r"/status(?:es)?/(\d+)", urlparse(url).path)
    if not m:
        raise AdapterError(f"no pude extraer el tweet id de: {url}")
    return m.group(1)


def _double_to_radix(value: float, radix: int = 36) -> str:
    """
    Port de V8 DoubleToRadixCString: replica EXACTO `Number.prototype.toString(radix)`
    de JS (representación fraccionaria más corta que round-trippea, con round-up+carry).
    Necesario porque el token de la syndication API se genera con ese toString(36).
    """
    integer = math.floor(value)
    fraction = value - integer
    delta = max(0.5 * (math.nextafter(value, math.inf) - value), math.nextafter(0.0, math.inf))

    frac_digits: list[int] = []
    if fraction >= delta:
        while True:
            fraction *= radix
            delta *= radix
            digit = int(fraction)  # floor (fraction > 0)
            frac_digits.append(digit)
            fraction -= digit
            if fraction > 0.5 or (fraction == 0.5 and (digit & 1)):
                if fraction + delta > 1:
                    # round-up: backtrack sobre dígitos == radix-1, incrementar el 1ro menor
                    while True:
                        if not frac_digits:
                            integer += 1
                            break
                        last = frac_digits.pop()
                        if last + 1 < radix:
                            frac_digits.append(last + 1)
                            break
                    break
            if fraction < delta:
                break

    if integer == 0:
        int_str = "0"
    else:
        int_str = ""
        n = int(integer)
        while n > 0:
            int_str = _B36[n % radix] + int_str
            n //= radix

    frac_str = "".join(_B36[d] for d in frac_digits)
    return int_str + ("." + frac_str if frac_str else "")


def _syndication_token(tweet_id: str) -> str:
    # Mismo algoritmo que react-tweet (Vercel):
    #   ((id / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "")
    x = (int(tweet_id) / 1e15) * math.pi
    return re.sub(r"(0+|\.)", "", _double_to_radix(x, 36))


def _twimg_orig(media_url: str) -> str:
    """URL full-res de pbs.twimg.com (name=orig)."""
    base = media_url.split("?", 1)[0]
    m = re.match(r"(.*)\.(jpg|jpeg|png|webp)$", base, re.IGNORECASE)
    if m:
        return f"{m.group(1)}?format={m.group(2).lower()}&name=orig"
    return base + "?name=orig"


def _resolve_twitter(url: str, photo) -> SourceResult:
    from catalog import nullify

    try:
        import requests
    except ImportError as e:  # pragma: no cover
        raise AdapterError("Falta requests (pip install -r scripts/assets/requirements.txt)") from e

    tid = _tweet_id(url)
    notes: list[str] = []
    try:
        resp = requests.get(
            _SYNDICATION_API,
            params={"id": tid, "token": _syndication_token(tid), "lang": "en"},
            headers={"User-Agent": USER_AGENT},
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        raise AdapterError(f"X syndication API falló para el tweet {tid}: {e}") from e

    # Preferimos mediaDetails (trae type), fallback a photos.
    media = [m for m in (data.get("mediaDetails") or []) if m.get("type") == "photo"]
    urls = [m["media_url_https"] for m in media if m.get("media_url_https")]
    if not urls:
        urls = [p["url"] for p in (data.get("photos") or []) if p.get("url")]
    if not urls:
        raise AdapterError(f"el tweet {tid} no tiene foto (¿video o solo texto?)")
    if len(urls) > 1:
        notes.append(f"el tweet tiene {len(urls)} fotos; uso la 1ª")

    user = data.get("user") or {}
    name, screen = user.get("name"), user.get("screen_name")
    author = (
        f"{name} (@{screen})"
        if name and screen
        else (name or (f"@{screen}" if screen else nullify(photo.get("author"))))
    )
    notes.append("X: imagen con copyright (all-rights-reserved); va por crédito + takedown")

    return SourceResult(
        image_url=_twimg_orig(urls[0]),
        source_label="X",
        author=author,
        license=nullify(photo.get("license")) or "all-rights-reserved",
        notes=notes,
    )


# ── Instagram (best-effort vía instaloader; frágil + ALTO riesgo legal) ───────


def _ig_shortcode(url: str) -> str:
    m = re.search(r"/(?:p|reel|tv)/([^/?#]+)", urlparse(url).path)
    if not m:
        raise AdapterError(f"no pude extraer el shortcode de Instagram de: {url}")
    return m.group(1)


def _resolve_instagram(url: str, photo) -> SourceResult:
    from catalog import nullify

    try:
        import instaloader
    except ImportError as e:  # pragma: no cover
        raise AdapterError(
            "Falta instaloader (pip install -r scripts/assets/requirements.txt). IG es best-effort."
        ) from e

    shortcode = _ig_shortcode(url)
    loader = instaloader.Instaloader(
        user_agent=USER_AGENT,
        download_pictures=False,
        download_videos=False,
        download_comments=False,
        download_geotags=False,
        save_metadata=False,
        quiet=True,
    )
    # Sesión opcional: si IG_USERNAME está y hay sesión guardada, la usa (mucho más
    # confiable; IG bloquea anónimo seguido). Se crea con `instaloader --login=<user>`.
    ig_user = os.environ.get("IG_USERNAME")
    if ig_user:
        try:
            loader.load_session_from_file(ig_user)
        except Exception:
            pass

    try:
        post = instaloader.Post.from_shortcode(loader.context, shortcode)
        image_url = post.url
        owner = post.owner_username
    except Exception as e:
        raise AdapterError(
            f"IG no devolvió el post {shortcode} (suele requerir login: configurá IG_USERNAME + "
            f"`instaloader --login`, o pegá la URL directa de la imagen como source_kind=direct). "
            f"Detalle: {e}"
        ) from e

    return SourceResult(
        image_url=image_url,
        source_label="Instagram",
        author=f"@{owner}" if owner else nullify(photo.get("author")),
        license=nullify(photo.get("license")) or "all-rights-reserved",
        notes=[
            "Instagram: fuente de ALTO riesgo legal (el doc la marca AVOID); crédito + takedown",
            "la URL de IG es firmada y expira: la CLI rehostea al toque, pero re-correr puede fallar",
        ],
    )
