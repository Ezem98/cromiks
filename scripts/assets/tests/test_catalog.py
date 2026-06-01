import catalog as cat

SAMPLE = '''meta:
  album_id: "eterno-diciembre"
cards:
  - id: "test-card"
    name: "Test"
    content:
      photo:
        type: "official"
        source_url: "https://example.com/x.jpg"
        source_kind: "direct"
        author: "TODO"
        license: "TODO"
        legal_posture: "takedown"
        status: "pending"
        # --- completa la CLI, no editar a mano ---
        asset: null
        credit: null
        fetched_at: null
        content_hash: null
    metadata:
      number: 1
  - id: "other-card"
    name: "Other"
    content:
      photo:
        type: "official"
        source_url: "TODO"
        source_kind: "TODO"
        author: "TODO"
        license: "TODO"
        legal_posture: "takedown"
        status: "pending"
        asset: null
        credit: null
        fetched_at: null
        content_hash: null
'''


def _write_sample(tmp_path):
    p = tmp_path / "cat.yaml"
    p.write_text(SAMPLE, encoding="utf-8")
    return p


def test_write_back_actualiza_campos_y_preserva_resto(tmp_path):
    p = _write_sample(tmp_path)
    c = cat.load_catalog(p)
    c.update_card_photo(
        "test-card",
        {
            "asset": "cromos/eterno-diciembre/test-card.webp",
            "credit": "Foto: Autor X · web",
            "author": "Autor X",
            "license": "cc-by",
            "legal_posture": "takedown",
            "status": "published",
            "fetched_at": "2026-06-01",
            "content_hash": "sha256:abc",
        },
    )
    out = p.read_text(encoding="utf-8")
    assert 'status: "published"' in out
    assert 'asset: "cromos/eterno-diciembre/test-card.webp"' in out
    assert 'author: "Autor X"' in out
    assert 'credit: "Foto: Autor X · web"' in out  # UTF-8 legible, sin \u escapes
    # comentario load-bearing preservado
    assert "# --- completa la CLI, no editar a mano ---" in out
    # NO tocó other-card
    other = out.split('id: "other-card"', 1)[1]
    assert 'status: "pending"' in other
    assert "asset: null" in other


def test_write_back_es_quirurgico(tmp_path):
    p = _write_sample(tmp_path)
    c = cat.load_catalog(p)
    c.update_card_photo("test-card", {"status": "published"})
    out = p.read_text(encoding="utf-8")
    # exactamente 1 línea cambiada vs el original
    diff = [(o, n) for o, n in zip(SAMPLE.split("\n"), out.split("\n")) if o != n]
    assert len(diff) == 1
    assert diff[0][1].strip() == 'status: "published"'


def test_write_back_no_revive_takedown_no_es_su_trabajo(tmp_path):
    # El guard de takedown vive en la RPC/DB, no acá; pero el CLI saltea takedown.
    # Acá solo verificamos que update escribe lo que se le pide (sin lógica de estado).
    p = _write_sample(tmp_path)
    c = cat.load_catalog(p)
    c.update_card_photo("test-card", {"status": "takedown"})
    out = p.read_text(encoding="utf-8")
    block = out.split('id: "test-card"', 1)[1].split('id: "other-card"', 1)[0]
    assert 'status: "takedown"' in block


def test_nullify():
    assert cat.nullify("TODO") is None
    assert cat.nullify("") is None
    assert cat.nullify("   ") is None
    assert cat.nullify("real") == "real"
    assert cat.nullify(None) is None
