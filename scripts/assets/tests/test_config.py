from config import build_key


def test_build_key_deterministico():
    assert build_key("eterno-diciembre", "armani-plantel") == (
        "cromos/eterno-diciembre/armani-plantel.webp"
    )
