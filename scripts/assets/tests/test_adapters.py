from adapters import _commons_filename, _map_license, _strip_html


def test_map_license_conserva_share_alike():
    assert _map_license("CC BY-SA 4.0") == "cc-by-sa"
    assert _map_license("CC BY 4.0") == "cc-by"
    assert _map_license("CC0") == "cc0"
    assert _map_license("Public domain") == "cc0"
    assert _map_license("All rights reserved") is None  # rara → la decide el curador
    assert _map_license(None) is None


def test_commons_filename():
    assert (
        _commons_filename("https://commons.wikimedia.org/wiki/File:Foo_bar.jpg") == "Foo_bar.jpg"
    )
    # thumb URL: el nombre real es el 3er segmento tras /thumb/
    assert (
        _commons_filename(
            "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Palestino.jpg/500px-Palestino.jpg"
        )
        == "Palestino.jpg"
    )
    # URL original
    assert (
        _commons_filename(
            "https://upload.wikimedia.org/wikipedia/commons/6/61/Lisandro_Martinez_2022.jpg"
        )
        == "Lisandro_Martinez_2022.jpg"
    )


def test_strip_html():
    assert _strip_html('<a href="x" rel="nofollow">Carlos Figueroa</a>') == "Carlos Figueroa"
    assert _strip_html("Plain &amp; text") == "Plain & text"
    assert _strip_html(None) is None
    assert _strip_html("   ") is None
