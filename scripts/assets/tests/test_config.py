from config import build_key


def test_build_key_incluye_hash_de_version():
    assert build_key("eterno-diciembre", "armani-plantel", "sha256:8e089abef4cba527") == (
        "cromos/eterno-diciembre/armani-plantel.8e089abe.webp"
    )


def test_build_key_misma_imagen_misma_key():
    # idempotente: mismo content_hash → misma key
    a = build_key("ed", "x", "sha256:deadbeefcafe")
    b = build_key("ed", "x", "sha256:deadbeefcafe")
    assert a == b == "cromos/ed/x.deadbeef.webp"


def test_build_key_distinta_imagen_distinta_key():
    # re-curar (imagen nueva) → key/URL nueva → sin caché vieja pegada
    a = build_key("ed", "x", "sha256:aaaaaaaa1111")
    b = build_key("ed", "x", "sha256:bbbbbbbb2222")
    assert a != b
