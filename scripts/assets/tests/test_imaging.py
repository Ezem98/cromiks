import io

import pytest
from PIL import Image

from imaging import NormalizeError, _sniff, normalize_to_webp


def _png(w: int, h: int) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (w, h), (120, 80, 40)).save(buf, format="PNG")
    return buf.getvalue()


def test_normalize_downscalea_portrait_a_target():
    webp, w, h, q, digest, warns = normalize_to_webp(_png(2000, 3000))
    assert (w, h) == (800, 1066)
    assert _sniff(webp) == "webp"
    assert len(webp) <= 200 * 1024
    assert digest.startswith("sha256:")
    assert warns == []


def test_normalize_cover_crop_landscape():
    _, w, h, *_ = normalize_to_webp(_png(3000, 2000))
    assert (w, h) == (800, 1066)


def test_normalize_rechaza_baja_resolucion():
    # crop 3:4 daría 400x533, muy por debajo del piso de tolerancia → NO upscalea
    with pytest.raises(NormalizeError):
        normalize_to_webp(_png(400, 600))


def test_normalize_tolera_upscale_leve():
    # crop ~760x1013: por debajo de 800x1066 pero arriba del piso (10% de tolerancia)
    # → upscalea ese poco y lo avisa, no lo rechaza.
    webp, w, h, q, digest, warns = normalize_to_webp(_png(760, 1014))
    assert (w, h) == (800, 1066)
    assert any("upscale leve" in x for x in warns)


def test_normalize_hash_deterministico():
    a = normalize_to_webp(_png(1200, 1600))
    b = normalize_to_webp(_png(1200, 1600))
    assert a[4] == b[4]  # mismo content_hash para mismo input


def test_sniff_magic_bytes():
    assert _sniff(b"\xff\xd8\xff\xe0\x00\x10JFIF") == "jpeg"
    assert _sniff(b"\x89PNG\r\n\x1a\n\x00\x00") == "png"
    assert _sniff(b"RIFF\x00\x00\x00\x00WEBPVP8 ") == "webp"
    assert _sniff(b"GIF89a") == "gif"
    assert _sniff(b"  <svg xmlns='...'>") == "svg"
    assert _sniff(b"\x00\x01garbage") is None
