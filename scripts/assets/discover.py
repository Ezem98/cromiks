#!/usr/bin/env python3
"""
discover.py — paso de DISCOVERY del pipeline de imágenes (MVP "weekend magic").

Para cada cromo `type: official` SIN curar (`source_url: "TODO"`), arma una query
templated, busca en Openverse, filtra por `crop_ok` (resolución suficiente para el
layout del cromo, usando el width/height del API — NO baja la imagen) y rankea por
resolución. Escribe `candidates.json` (el input del contact-sheet, T4).

Lo que NO hace (a propósito): NO baja imágenes, NO toca el YAML, NO puntúa con visión
(eso es T3), NO publica. Los `video_capture` / `collage` / `social-media` se saltean
(su camino es frame-extraction F2, ver T-18).

Uso (desde la raíz del repo):
    python scripts/assets/discover.py                 # todos los official sin curar
    python scripts/assets/discover.py --only armani-plantel,rulli-plantel
    python scripts/assets/discover.py --limit 5       # probe (los primeros 5)
    python scripts/assets/discover.py --no-cache      # re-pega Openverse
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Imports planos del paquete al correr como script suelto.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

import catalog as cat  # noqa: E402
import openverse as ov  # noqa: E402
from imaging import crop_ok  # noqa: E402

RESET, DIM, GREEN, YELLOW, CYAN, RED = (
    "\x1b[0m", "\x1b[2m", "\x1b[32m", "\x1b[33m", "\x1b[36m", "\x1b[31m",
)

# Solo estos tipos se buscan en bancos de imágenes. Los momentos del broadcast
# (video_capture) NO están en Openverse → van a frame-extraction (F2 / T-18).
DISCOVERABLE_TYPES = {"official"}

CANDIDATES_PATH = Path(__file__).resolve().parent / "candidates.json"
SCHEMA_VERSION = 1


def build_query(card: cat.PhotoCard) -> str:
    """
    Query templated = SOLO el nombre del cromo. El probe real (2026-06-04) mostró que
    agregar el club o "footballer" tira los resultados de Openverse a 0 (ej. "Enzo
    Fernández Benfica footballer" → 0 vs "Enzo Fernández" → 230); con solo el nombre,
    8/10 jugadores tienen ≥1 candidata portrait-viable (~80% > el piso de 60%). La
    visión (T3) desambigua cuál de los resultados es el jugador. Si la cobertura cae
    para un álbum futuro, acá entra la pasada de LLM (`card.club` queda disponible).
    """
    return (card.name or card.card_id).strip()


def _is_target(card: cat.PhotoCard) -> bool:
    """official + todavía sin curar (source_url TODO) + no publicado/baja."""
    return (
        card.card_type in DISCOVERABLE_TYPES
        and card.status not in ("published", "takedown")
        and card.source_url is None  # nullify("TODO") → None
    )


def discover(
    *,
    catalog: cat.Catalog | None = None,
    only: set[str] | None = None,
    limit: int = 0,
    page_size: int = 8,
    use_cache: bool = True,
    out_path: Path | None = None,
    search_fn=ov.search,
) -> dict:
    """
    Corre el discovery y escribe candidates.json. Devuelve el dict de resultado
    (también persistido). `search_fn` se inyecta en los tests para no tocar la red.
    """
    catalog = catalog or cat.load_catalog()
    out_path = out_path or CANDIDATES_PATH

    targets = [c for c in catalog.photo_cards() if _is_target(c)]
    if only:
        targets = [c for c in targets if c.card_id in only]
    if limit:
        targets = targets[:limit]

    cards_out: dict[str, dict] = {}
    zero: list[str] = []
    failed: list[tuple[str, str]] = []

    for card in targets:
        query = build_query(card)
        try:
            cands = search_fn(query, page_size=page_size, use_cache=use_cache)
        except ov.OpenverseError as e:  # skip-and-continue (un cromo no aborta el lote)
            failed.append((card.card_id, str(e)))
            zero.append(card.card_id)
            continue

        # Filtro duro: el width/height del API tiene que pasar crop_ok para el layout.
        viable = [
            c for c in cands
            if c.width and c.height and crop_ok(c.width, c.height, card.layout)
        ]
        # Rank pre-visión: por resolución (área) desc. T3 re-rankea por match de visión.
        viable.sort(key=lambda c: (c.width or 0) * (c.height or 0), reverse=True)

        if not viable:
            zero.append(card.card_id)

        cards_out[card.card_id] = {
            "name": card.name,
            "layout": card.layout or "portrait",
            "query": query,
            "candidates": [c.to_dict() for c in viable],
        }

    result = {
        "schema_version": SCHEMA_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "cards": cards_out,
        "coverage": {
            "official_targets": len(targets),
            "with_candidates": len(targets) - len(zero),
            "zero": sorted(zero),
        },
    }

    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return result


def _print_report(result: dict, out_path: Path) -> None:
    cov = result["coverage"]
    n = cov["official_targets"]
    ok = cov["with_candidates"]
    pct = (ok / n * 100) if n else 0.0
    print(f"\n{CYAN}━━━ discovery (Openverse) ━━━{RESET}")
    print(f"{GREEN}✓ {ok}/{n} cromos official con candidatas{RESET}  {DIM}({pct:.0f}%){RESET}")
    if cov["zero"]:
        print(f"{YELLOW}⚑ {len(cov['zero'])} sin candidata viable:{RESET} {DIM}{', '.join(cov['zero'])}{RESET}")
    print(f"{DIM}→ {out_path}{RESET}\n")


def main() -> int:
    p = argparse.ArgumentParser(prog="discover", description="Discovery de imágenes (Openverse)")
    p.add_argument("--only", help="card_ids coma-separados")
    p.add_argument("--limit", type=int, default=0, help="cortar tras N cromos (0 = sin límite)")
    p.add_argument("--page-size", type=int, default=8, help="candidatas por query")
    p.add_argument("--no-cache", action="store_true", help="ignorar el cache de Openverse")
    args = p.parse_args()

    only = {s.strip() for s in args.only.split(",")} if args.only else None
    result = discover(
        only=only,
        limit=args.limit,
        page_size=args.page_size,
        use_cache=not args.no_cache,
    )
    _print_report(result, CANDIDATES_PATH)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
