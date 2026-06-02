"""
Fetch + validación + normalización de imágenes.

fetch_image: baja con validación dura (formato raster real por magic bytes, tope
de tamaño, rechazo de GIF/SVG/animado, redirects acotados, UA con contacto), con
retry + backoff para errores de red.

normalize_to_webp: Pillow con guard anti decompression-bomb, cover-crop 3:4 →
800x1066 (gate de min-resolución: NO upscalea basura), y loop de calidad WebP
descendente hasta < 200KB.
"""

from __future__ import annotations

import hashlib
import io
import time

from config import MAX_KB, TARGET_H, TARGET_W, USER_AGENT

_MAX_BYTES = 25 * 1024 * 1024  # 25MB
_TARGET_RATIO = TARGET_W / TARGET_H  # 0.75 (3:4 retrato)
# Tolerancia de upscale: aceptamos un crop hasta 10% más chico que el target y lo
# subimos ese poco (imperceptible). Las fotos de IG/X suelen toparse en ~1080 y
# caen justo abajo de 800x1066; sin esto se rechazan fotos perfectamente usables.
# Abajo del piso, sí es upscale-basura y se rechaza.
_MAX_UPSCALE = 1.10


class FetchError(RuntimeError):
    pass


class NormalizeError(RuntimeError):
    pass


def _sniff(data: bytes) -> str | None:
    """Formato real por magic bytes. None si no es raster soportado."""
    if data[:3] == b"\xff\xd8\xff":
        return "jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    if data[:4] == b"GIF8":
        return "gif"
    head = data[:256].lstrip().lower()
    if head[:5] == b"<?xml" or b"<svg" in head:
        return "svg"
    return None


def fetch_image(url: str, *, timeout: int = 20, max_redirects: int = 5, attempts: int = 3) -> bytes:
    """Baja y valida una imagen. Devuelve los bytes crudos. Lanza FetchError."""
    try:
        import requests
    except ImportError as e:  # pragma: no cover
        raise FetchError("Falta requests (pip install -r scripts/assets/requirements.txt)") from e

    last_err: Exception | None = None
    for attempt in range(attempts):
        try:
            sess = requests.Session()
            sess.max_redirects = max_redirects
            # No pedimos AVIF: el CLI no lo decodifica y los CDN-resizers (FIFA,
            # Infobae, canal26) lo negocian si está en el Accept. Pedimos formatos
            # que _sniff() sí soporta → el resizer cae a JPEG/WebP.
            headers = {"User-Agent": USER_AGENT, "Accept": "image/webp,image/jpeg,image/png,image/*"}
            with sess.get(url, headers=headers, stream=True, timeout=timeout) as r:
                r.raise_for_status()
                ctype = r.headers.get("Content-Type", "").split(";")[0].strip().lower()
                if ctype and not ctype.startswith("image/"):
                    # No abortamos solo por el header (servers mienten), pero si dice
                    # html es casi seguro una página de error/captcha.
                    if ctype in ("text/html", "application/xhtml+xml"):
                        raise FetchError(f"el servidor devolvió {ctype} (¿página, no imagen?)")
                total = 0
                chunks: list[bytes] = []
                for chunk in r.iter_content(64 * 1024):
                    if not chunk:
                        continue
                    total += len(chunk)
                    if total > _MAX_BYTES:
                        raise FetchError("imagen > 25MB (rechazada)")
                    chunks.append(chunk)
            data = b"".join(chunks)
            kind = _sniff(data)
            if kind is None:
                raise FetchError(f"no es un raster soportado (ctype={ctype or '?'})")
            if kind in ("gif", "svg"):
                raise FetchError(f"formato no permitido: {kind}")
            return data
        except FetchError:
            raise  # errores de validación NO se reintentan
        except Exception as e:  # red: timeout, conexión, 5xx, redirects
            last_err = e
            if attempt < attempts - 1:
                time.sleep(2**attempt)  # backoff 1s, 2s
    raise FetchError(f"fetch falló tras {attempts} intentos: {last_err}")


def _clamp01(v: float) -> float:
    return 0.0 if v < 0.0 else 1.0 if v > 1.0 else v


def _parse_focal_token(tok: str) -> float | None:
    """Token numérico → fracción 0..1. Acepta '40%', '0.4' y '40' (>1 = porcentaje)."""
    pct = tok.endswith("%")
    t = tok[:-1] if pct else tok
    try:
        v = float(t)
    except ValueError:
        return None
    if pct or v > 1.0:
        v /= 100.0
    return v


def parse_focal(value: object) -> tuple[float, float]:
    """
    Punto focal del crop 3:4 → (fx, fy) en 0..1, donde 0.5/0.5 = centrado (el
    comportamiento por defecto, idéntico al de siempre). fx corre la ventana de
    recorte en horizontal (0=izquierda, 1=derecha); fy en vertical (0=arriba,
    1=abajo).

    Acepta:
      - None / "" / "center"        → (0.5, 0.5)
      - keywords: top/bottom/left/right y combos ("top left", "bottom-right")
      - "x% y%" o "x y" numérico    → ("40% 20%" → (0.4, 0.2))
      - [fx, fy] (lista/tupla)      → directo

    Tokens desconocidos se ignoran (cae a centrado en ese eje).
    """
    if value is None:
        return (0.5, 0.5)
    if isinstance(value, (list, tuple)) and len(value) == 2:
        return (_clamp01(float(value[0])), _clamp01(float(value[1])))

    s = str(value).strip().lower().replace("-", " ").replace(",", " ")
    if not s or s in ("center", "centre"):
        return (0.5, 0.5)

    x, y, nums = 0.5, 0.5, []
    for tok in s.split():
        if tok == "top":
            y = 0.0
        elif tok == "bottom":
            y = 1.0
        elif tok == "left":
            x = 0.0
        elif tok == "right":
            x = 1.0
        elif tok in ("center", "centre"):
            continue
        else:
            n = _parse_focal_token(tok)
            if n is not None:
                nums.append(n)
    if nums:
        x = _clamp01(nums[0])
        if len(nums) > 1:
            y = _clamp01(nums[1])
    return (x, y)


def normalize_to_webp(
    data: bytes,
    *,
    focal: tuple[float, float] = (0.5, 0.5),
    max_kb: int = MAX_KB,
    q_start: int = 90,
    q_floor: int = 60,
) -> tuple[bytes, int, int, int, str, list[str]]:
    """
    Normaliza a WebP 800x1066. Devuelve (webp, w, h, quality, content_hash, warnings).
    Lanza NormalizeError si la fuente es animada o muy chica (no upscaleamos).

    `focal` (fx, fy en 0..1) decide de dónde sale el crop 3:4. Default (0.5, 0.5) =
    centrado, idéntico al comportamiento histórico. Ver parse_focal().
    """
    try:
        from PIL import Image
    except ImportError as e:  # pragma: no cover
        raise NormalizeError("Falta Pillow (pip install -r scripts/assets/requirements.txt)") from e

    # Anti decompression-bomb: límite de píxeles (Pillow lanza DecompressionBombError).
    Image.MAX_IMAGE_PIXELS = 64_000_000  # ~64MP

    warnings: list[str] = []
    try:
        with Image.open(io.BytesIO(data)) as im:
            if getattr(im, "is_animated", False) and getattr(im, "n_frames", 1) > 1:
                raise NormalizeError("imagen animada (no soportada)")
            im = im.convert("RGB")
            w, h = im.size

            # Gate de min-resolución: el mayor crop 3:4 centrado debe ser >= 800x1066.
            src_ratio = w / h
            if src_ratio >= _TARGET_RATIO:
                crop_h, crop_w = h, round(h * _TARGET_RATIO)
            else:
                crop_w, crop_h = w, round(w / _TARGET_RATIO)
            floor_w, floor_h = round(TARGET_W / _MAX_UPSCALE), round(TARGET_H / _MAX_UPSCALE)
            if crop_w < floor_w or crop_h < floor_h:
                raise NormalizeError(
                    f"resolución insuficiente: el crop 3:4 da {crop_w}x{crop_h}, debajo del piso "
                    f"{floor_w}x{floor_h} (tolerancia {_MAX_UPSCALE:g}x sobre {TARGET_W}x{TARGET_H}; "
                    f"no upscaleamos basura)"
                )
            if crop_w < TARGET_W or crop_h < TARGET_H:
                warnings.append(
                    f"upscale leve: crop {crop_w}x{crop_h} → {TARGET_W}x{TARGET_H} "
                    f"({TARGET_W / crop_w:.0%})"
                )

            # Punto focal: corre la ventana de recorte dentro de la fuente. Default
            # (0.5, 0.5) reproduce exacto el crop centrado de siempre.
            fx, fy = focal
            left = max(0, min(w - crop_w, round((w - crop_w) * fx)))
            top = max(0, min(h - crop_h, round((h - crop_h) * fy)))
            if (fx, fy) != (0.5, 0.5):
                warnings.append(f"crop focal {fx:.2f}/{fy:.2f}")
            im = im.crop((left, top, left + crop_w, top + crop_h))
            im = im.resize((TARGET_W, TARGET_H), Image.LANCZOS)

            # Loop de calidad descendente hasta < max_kb.
            chosen: bytes | None = None
            quality = q_floor
            for q in range(q_start, q_floor - 1, -5):
                buf = io.BytesIO()
                im.save(buf, format="WEBP", quality=q, method=6)
                b = buf.getvalue()
                if len(b) <= max_kb * 1024:
                    chosen, quality = b, q
                    break
            if chosen is None:
                buf = io.BytesIO()
                im.save(buf, format="WEBP", quality=q_floor, method=6)
                chosen, quality = buf.getvalue(), q_floor
                warnings.append(
                    f"no bajó de {max_kb}KB ni a q{q_floor} ({len(chosen) // 1024}KB) — revisar manual"
                )
    except NormalizeError:
        raise
    except Exception as e:  # DecompressionBombError, formato corrupto, etc.
        raise NormalizeError(f"Pillow no pudo procesar la imagen: {e}") from e

    digest = "sha256:" + hashlib.sha256(chosen).hexdigest()
    return chosen, TARGET_W, TARGET_H, quality, digest, warnings
