from adapters import (
    _commons_filename,
    _ig_shortcode,
    _map_license,
    _strip_html,
    _syndication_token,
    _tweet_id,
    _twimg_orig,
)


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


def test_tweet_id():
    assert _tweet_id("https://x.com/user/status/1234567890123456789") == "1234567890123456789"
    assert _tweet_id("https://twitter.com/foo/status/42?s=20") == "42"


def test_ig_shortcode():
    assert _ig_shortcode("https://www.instagram.com/p/AbC123/") == "AbC123"
    assert _ig_shortcode("https://instagram.com/reel/XyZ_9/?hl=es") == "XyZ_9"


def test_twimg_orig():
    assert (
        _twimg_orig("https://pbs.twimg.com/media/ABC.jpg")
        == "https://pbs.twimg.com/media/ABC?format=jpg&name=orig"
    )
    assert (
        _twimg_orig("https://pbs.twimg.com/media/ABC.jpg?name=small")
        == "https://pbs.twimg.com/media/ABC?format=jpg&name=orig"
    )


def test_syndication_token_matchea_react_tweet():
    # Valores verificados contra ((id/1e15)*Math.PI).toString(36).replace(/(0+|\.)/g,'')
    # corrido en Node (mismo algoritmo que react-tweet de Vercel).
    assert _syndication_token("1349129669258448897") == "39qeyy97t9x"
    assert _syndication_token("20") == "6dq1a2xwd93"
    assert _syndication_token("1234567890123456789") == "2zqic77uqyk"
