import io

import pytest
from PIL import Image

from imaging import NormalizeError, _sniff, normalize_to_webp, parse_focal


def _png(w: int, h: int) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (w, h), (120, 80, 40)).save(buf, format="PNG")
    return buf.getvalue()


def _split_png(w: int, h: int, left: tuple, right: tuple, split: int) -> bytes:
    """PNG con la mitad izquierda `left` y el resto `right` (para testear el crop focal)."""
    im = Image.new("RGB", (w, h), right)
    im.paste(Image.new("RGB", (split, h), left), (0, 0))
    buf = io.BytesIO()
    im.save(buf, format="PNG")
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


def test_parse_focal():
    assert parse_focal(None) == (0.5, 0.5)
    assert parse_focal("") == (0.5, 0.5)
    assert parse_focal("center") == (0.5, 0.5)
    assert parse_focal("left") == (0.0, 0.5)
    assert parse_focal("bottom") == (0.5, 1.0)
    assert parse_focal("top right") == (1.0, 0.0)
    assert parse_focal("bottom-left") == (0.0, 1.0)
    assert parse_focal("40% 20%") == (0.4, 0.2)
    assert parse_focal("0.3 0.7") == (0.3, 0.7)
    assert parse_focal([0.3, 0.7]) == (0.3, 0.7)
    assert parse_focal("garbage") == (0.5, 0.5)  # tokens desconocidos → centrado


def test_focal_default_es_centrado():
    # focal por defecto = comportamiento histórico: mismo hash que sin pasar focal.
    src = _png(1200, 1600)
    a = normalize_to_webp(src)
    b = normalize_to_webp(src, focal=(0.5, 0.5))
    assert a[4] == b[4]
    assert a[5] == []  # sin warning de focal cuando es centrado


def test_focal_ancla_el_crop():
    # Fuente apaisada, mitad izquierda roja / derecha azul. crop 3:4 = franja vertical.
    # focal left toma la franja izquierda (roja); right toma la derecha (azul).
    src = _split_png(2000, 1000, (200, 30, 30), (30, 30, 200), 1000)
    webp_left, *_, warns_l = normalize_to_webp(src, focal=(0.0, 0.5))
    webp_right, *_ = normalize_to_webp(src, focal=(1.0, 0.5))
    cl = Image.open(io.BytesIO(webp_left)).convert("RGB").getpixel((400, 533))
    cr = Image.open(io.BytesIO(webp_right)).convert("RGB").getpixel((400, 533))
    assert cl[0] > cl[2]  # crop izquierdo: rojizo
    assert cr[2] > cr[0]  # crop derecho: azulado
    assert any("focal" in w for w in warns_l)


def test_sniff_magic_bytes():
    assert _sniff(b"\xff\xd8\xff\xe0\x00\x10JFIF") == "jpeg"
    assert _sniff(b"\x89PNG\r\n\x1a\n\x00\x00") == "png"
    assert _sniff(b"RIFF\x00\x00\x00\x00WEBPVP8 ") == "webp"
    assert _sniff(b"GIF89a") == "gif"
    assert _sniff(b"  <svg xmlns='...'>") == "svg"
    assert _sniff(b"\x00\x01garbage") is None


# ── Presets de ratio (feature bento: cromos anchos) ──


def test_normalize_landscape_target():
    webp, w, h, q, digest, warns = normalize_to_webp(_png(3000, 2000), layout="landscape")
    assert (w, h) == (1200, 800)
    assert _sniff(webp) == "webp"
    assert len(webp) <= 260 * 1024
    assert warns == []


def test_normalize_pano_target():
    _, w, h, *_ = normalize_to_webp(_png(4000, 2000), layout="pano")
    assert (w, h) == (1600, 800)


def test_normalize_layout_default_es_portrait():
    # Sin layout / None / "portrait" → idéntico al comportamiento histórico.
    src = _png(2000, 3000)
    a = normalize_to_webp(src)
    b = normalize_to_webp(src, layout=None)
    c = normalize_to_webp(src, layout="portrait")
    assert a[1:3] == b[1:3] == c[1:3] == (800, 1066)
    assert a[4] == b[4] == c[4]  # mismo content_hash


def test_normalize_layout_desconocido_falla():
    # Typo en el YAML → error claro, NO croppear al ratio equivocado en silencio.
    with pytest.raises(NormalizeError, match="layout desconocido"):
        normalize_to_webp(_png(2000, 3000), layout="widescreen")


def test_normalize_gate_por_ratio():
    # 900x700: el crop 3:2 da 900x600, debajo del piso landscape (1091x727) → rechaza.
    with pytest.raises(NormalizeError, match="landscape"):
        normalize_to_webp(_png(900, 700), layout="landscape")


def test_normalize_landscape_tolera_upscale_leve():
    # crop ~1140x760: abajo de 1200x800 pero arriba del piso (12%) → upscalea y avisa.
    _, w, h, _, _, warns = normalize_to_webp(_png(1140, 760), layout="landscape")
    assert (w, h) == (1200, 800)
    assert any("upscale leve" in x for x in warns)


def test_normalize_landscape_acepta_fuente_instagram():
    # El caso que motivó la tolerancia 1.12: fuente IG (1080 de ancho) → crop
    # landscape 1080x720, que con el piso de 1.10 (1091px) fallaba por 11px.
    _, w, h, _, _, warns = normalize_to_webp(_png(1080, 1350), layout="landscape")
    assert (w, h) == (1200, 800)
    assert any("upscale leve" in x for x in warns)


def test_focal_compone_con_landscape():
    # Fuente muy ancha, mitad izquierda roja / derecha azul. crop 3:2 con focal
    # left toma la zona roja; right la azul — la ventana compone con el ratio.
    src = _split_png(4000, 1000, (200, 30, 30), (30, 30, 200), 2000)
    webp_left, *_ = normalize_to_webp(src, layout="landscape", focal=(0.0, 0.5))
    webp_right, *_ = normalize_to_webp(src, layout="landscape", focal=(1.0, 0.5))
    cl = Image.open(io.BytesIO(webp_left)).convert("RGB").getpixel((600, 400))
    cr = Image.open(io.BytesIO(webp_right)).convert("RGB").getpixel((600, 400))
    assert cl[0] > cl[2]  # crop izquierdo: rojizo
    assert cr[2] > cr[0]  # crop derecho: azulado
