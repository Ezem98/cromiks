import json

import catalog as cat
import discover as disc
import openverse as ov


SAMPLE = '''meta:
  album_id: "test-album"
cards:
  - id: "p1"
    name: "Player One"
    content:
      photo:
        type: "official"
        source_url: "TODO"
        source_kind: "TODO"
        status: "pending"
    metadata:
      club: "Club X"
  - id: "p2"
    name: "Player Two"
    content:
      photo:
        type: "official"
        source_url: "https://example.com/p2.jpg"
        source_kind: "direct"
        status: "pending"
  - id: "m1"
    name: "Momento del gol"
    content:
      photo:
        type: "video_capture"
        source_url: "TODO"
        source_kind: "TODO"
        status: "pending"
  - id: "z1"
    name: "Zero Player"
    content:
      photo:
        type: "official"
        source_url: "TODO"
        source_kind: "TODO"
        status: "pending"
'''


def _cand(image_url, w, h, lic="by"):
    return ov.Candidate(
        image_url=image_url, thumbnail=None, author="A", license=lic, license_url=None,
        width=w, height=h, source="flickr", landing_url=None, title=image_url,
    )


def _fake_search(query, *, page_size=8, use_cache=True):
    # 'Zero' → solo una candidata por debajo del piso (queda sin viable).
    if "Zero" in query:
        return [_cand("tiny", 300, 400)]
    return [
        _cand("big", 2000, 3000),
        _cand("tiny", 300, 400),   # bajo el piso portrait → se filtra
        _cand("med", 800, 1100),
    ]


def _load(tmp_path):
    p = tmp_path / "cat.yaml"
    p.write_text(SAMPLE, encoding="utf-8")
    return cat.load_catalog(p)


def test_build_query_usa_solo_el_nombre():
    # El probe real mostró que club/'footballer' tiran Openverse a 0 → query = nombre.
    con = cat.PhotoCard(card_id="x", photo={}, name="Lionel Messi", metadata={"club": "Inter Miami"})
    assert disc.build_query(con) == "Lionel Messi"
    # fallback al card_id si no hay name
    assert disc.build_query(cat.PhotoCard(card_id="y", photo={}, name=None)) == "y"


def test_solo_official_sin_curar(tmp_path):
    res = disc.discover(
        catalog=_load(tmp_path), search_fn=_fake_search, out_path=tmp_path / "out.json"
    )
    targets = set(res["cards"].keys())
    assert targets == {"p1", "z1"}  # p2 (ya curado) y m1 (video_capture) quedan fuera
    assert res["coverage"]["official_targets"] == 2


def test_filtra_por_crop_ok_y_rankea(tmp_path):
    res = disc.discover(
        catalog=_load(tmp_path), search_fn=_fake_search, out_path=tmp_path / "out.json"
    )
    cands = res["cards"]["p1"]["candidates"]
    urls = [c["image_url"] for c in cands]
    assert urls == ["big", "med"]  # 'tiny' (300x400) se filtró; orden por resolución desc


def test_cobertura_cero(tmp_path):
    res = disc.discover(
        catalog=_load(tmp_path), search_fn=_fake_search, out_path=tmp_path / "out.json"
    )
    assert res["cards"]["z1"]["candidates"] == []
    assert "z1" in res["coverage"]["zero"]
    assert res["coverage"]["with_candidates"] == 1


def test_escribe_candidates_json(tmp_path):
    out = tmp_path / "out.json"
    disc.discover(catalog=_load(tmp_path), search_fn=_fake_search, out_path=out)
    data = json.loads(out.read_text(encoding="utf-8"))
    assert data["schema_version"] == disc.SCHEMA_VERSION
    assert set(data["cards"]) == {"p1", "z1"}
    assert data["cards"]["p1"]["layout"] == "portrait"  # default cuando no hay layout


def test_only_y_limit(tmp_path):
    catalog = _load(tmp_path)
    res = disc.discover(
        catalog=catalog, search_fn=_fake_search, out_path=tmp_path / "o.json", only={"p1"}
    )
    assert set(res["cards"]) == {"p1"}

    res2 = disc.discover(
        catalog=catalog, search_fn=_fake_search, out_path=tmp_path / "o2.json", limit=1
    )
    assert len(res2["cards"]) == 1


def test_openverse_error_skip_and_continue(tmp_path):
    def boom(query, *, page_size=8, use_cache=True):
        raise ov.OpenverseError("429")

    res = disc.discover(
        catalog=_load(tmp_path), search_fn=boom, out_path=tmp_path / "out.json"
    )
    # ningún cromo aborta el lote; ambos quedan sin candidata
    assert res["coverage"]["with_candidates"] == 0
    assert set(res["coverage"]["zero"]) == {"p1", "z1"}
