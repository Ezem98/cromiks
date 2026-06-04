import json

import openverse as ov


RAW = {
    "result_count": 2,
    "results": [
        {
            "url": "https://img.example/a.jpg",
            "thumbnail": "https://img.example/a_t.jpg",
            "creator": "Foto Autor",
            "license": "by",
            "license_url": "https://creativecommons.org/licenses/by/4.0/",
            "width": 1600,
            "height": 1200,
            "source": "flickr",
            "foreign_landing_url": "https://flickr.com/x",
            "title": "Una foto",
        },
        {"url": None, "creator": "sin url"},  # se descarta (sin imagen)
        {
            "url": "https://img.example/b.jpg",
            "license": "cc0",
            "width": "800",  # string → _to_int
            "height": "1066",
        },
    ],
}


def test_parse_mapea_y_descarta_sin_url():
    cands = ov._parse(RAW)
    assert len(cands) == 2  # el del url=None se descarta
    a = cands[0]
    assert a.image_url == "https://img.example/a.jpg"
    assert a.author == "Foto Autor"
    assert a.license == "by"
    assert (a.width, a.height) == (1600, 1200)
    assert a.source == "flickr"
    assert a.landing_url == "https://flickr.com/x"
    b = cands[1]
    assert (b.width, b.height) == (800, 1066)  # strings parseadas a int
    assert b.author is None


def test_search_vacio(monkeypatch, tmp_path):
    monkeypatch.setattr(ov, "_raw_search", lambda q, ps: {"results": []})
    assert ov.search("nada", cache_dir=tmp_path) == []


def test_search_cachea(monkeypatch, tmp_path):
    calls = {"n": 0}

    def fake_raw(query, page_size):
        calls["n"] += 1
        return RAW

    monkeypatch.setattr(ov, "_raw_search", fake_raw)

    first = ov.search("messi", page_size=8, cache_dir=tmp_path)
    second = ov.search("messi", page_size=8, cache_dir=tmp_path)

    assert len(first) == 2 and len(second) == 2
    assert calls["n"] == 1  # el 2do va por cache, no re-pega la API
    assert (tmp_path / f"{ov._query_key('messi', 8)}.json").exists()


def test_search_no_cache_siempre_pega(monkeypatch, tmp_path):
    calls = {"n": 0}

    def fake_raw(query, page_size):
        calls["n"] += 1
        return RAW

    monkeypatch.setattr(ov, "_raw_search", fake_raw)
    ov.search("messi", cache_dir=tmp_path, use_cache=False)
    ov.search("messi", cache_dir=tmp_path, use_cache=False)
    assert calls["n"] == 2


def test_search_cache_corrupto_repega(monkeypatch, tmp_path):
    (tmp_path / f"{ov._query_key('x', 8)}.json").write_text("{ no json", encoding="utf-8")
    monkeypatch.setattr(ov, "_raw_search", lambda q, ps: RAW)
    assert len(ov.search("x", cache_dir=tmp_path)) == 2  # ignora el cache roto y re-pega
