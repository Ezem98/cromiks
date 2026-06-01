#!/usr/bin/env python3
"""
CLI de assets de Cromiks (T9) — fetch → validate → normalize → upload(R2) → write_back.

Asistida por lotes: vos curás `source_url` por cromo en el catálogo YAML; la tool
baja la imagen, la normaliza (3:4, 800x1066, WebP <200KB), la sube a R2 con key
determinístico, y escribe la provenance de vuelta en el YAML (ruamel round-trip).

Uso (desde la raíz del repo):
    python scripts/assets/cli.py --only dibu-plantel
    python scripts/assets/cli.py --only dibu-plantel,armani-plantel --dry-run
    python scripts/assets/cli.py --force --limit 5
    python scripts/assets/cli.py            # todos los curados (pending) del álbum

Flags:
    --only ids     procesar solo estos card_id (coma-separados)
    --force        re-procesar aunque estén published (respeta hash: si no cambió, skip)
    --dry-run      fetch + normalize, SIN subir ni escribir el YAML (probar fuentes)
    --limit N      cortar después de N procesados
    --verbose      imprimir las notas/warnings por cromo

Invariante legal: NUNCA re-publica un cromo en `takedown` (se saltea, terminal).
Política de fallo: skip-and-continue + reporte final (un cromo roto no aborta el lote).
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import date, timezone, datetime

# Permitir imports planos del paquete al correr como script suelto.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Windows usa cp1252 en consola y rompe con acentos / box-drawing. Forzamos UTF-8.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

import catalog as cat  # noqa: E402
from adapters import AdapterError, SourceResult, resolve_source  # noqa: E402
from config import ConfigError, build_key, load_settings, make_s3_client, upload_webp  # noqa: E402
from imaging import FetchError, NormalizeError, fetch_image, normalize_to_webp  # noqa: E402

# Colores (ANSI), igual estilo que scripts/seed.ts.
RESET, DIM, GREEN, YELLOW, CYAN, RED = (
    "\x1b[0m", "\x1b[2m", "\x1b[32m", "\x1b[33m", "\x1b[36m", "\x1b[31m",
)


def _today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def _build_credit(author: str | None, source_label: str) -> str:
    return f"Foto: {author or 'Autor desconocido'} · {source_label}"


def main() -> int:
    p = argparse.ArgumentParser(prog="cromos-assets", description="Pipeline de imágenes → R2")
    p.add_argument("--only", help="card_ids coma-separados a procesar")
    p.add_argument("--force", action="store_true", help="re-procesar published (respeta hash)")
    p.add_argument("--dry-run", action="store_true", help="no sube ni escribe el YAML")
    p.add_argument("--limit", type=int, default=0, help="cortar tras N procesados (0 = sin límite)")
    p.add_argument("--verbose", action="store_true", help="mostrar notas por cromo")
    args = p.parse_args()

    only = {s.strip() for s in args.only.split(",")} if args.only else None

    catalog = cat.load_catalog()
    cards = catalog.photo_cards()
    if only:
        cards = [c for c in cards if c.card_id in only]
        faltan = only - {c.card_id for c in cards}
        if faltan:
            print(f"{YELLOW}⚠{RESET} card_ids no encontrados: {', '.join(sorted(faltan))}")

    # Cliente R2 solo si vamos a subir.
    client = None
    settings = None
    if not args.dry_run:
        try:
            settings = load_settings()
            client = make_s3_client(settings)
        except ConfigError as e:
            print(f"{RED}✗ {e}{RESET}")
            return 1

    print(f"\n{CYAN}━━━ Cromiks assets ━━━{RESET}  {DIM}álbum={catalog.album_id} "
          f"{'(dry-run)' if args.dry_run else ''}{RESET}\n")

    published, skipped, failed, flagged = [], [], [], []
    processed = 0

    for card in cards:
        cid = card.card_id
        status = card.status
        src = card.source_url

        if not src:
            skipped.append((cid, "sin source_url (no curado)"))
            continue
        if status == "takedown":
            skipped.append((cid, "takedown (terminal — no se re-publica)"))
            continue
        if status == "published" and not args.force:
            skipped.append((cid, "ya published (usá --force para re-procesar)"))
            continue
        if args.limit and processed >= args.limit:
            skipped.append((cid, "límite alcanzado"))
            continue

        processed += 1
        try:
            src_res: SourceResult = resolve_source(src, card.source_kind, card.photo)
            raw = fetch_image(src_res.image_url)
            webp, w, h, q, digest, warns = normalize_to_webp(raw)

            # Change-detection en --force: si el asset no cambió, no re-subimos.
            if args.force and cat.nullify(card.photo.get("content_hash")) == digest:
                skipped.append((cid, "sin cambios (hash igual)"))
                continue

            key = build_key(catalog.album_id, cid)
            size_kb = len(webp) // 1024
            notes = list(src_res.notes) + list(warns)

            if args.dry_run:
                published.append((cid, f"DRY {size_kb}KB q{q} → {key}"))
            else:
                upload_webp(client, settings.bucket, key, webp)
                # write_back quirúrgico por-cromo (si se corta, no perdemos progreso)
                catalog.update_card_photo(
                    cid,
                    {
                        "asset": key,
                        "credit": _build_credit(src_res.author, src_res.source_label),
                        "author": src_res.author,
                        "license": src_res.license,
                        "legal_posture": cat.nullify(card.photo.get("legal_posture")) or "takedown",
                        "status": "published",
                        "fetched_at": _today(),
                        "content_hash": digest,
                    },
                )
                published.append((cid, f"{size_kb}KB q{q} → {key}"))

            if notes:
                flagged.append((cid, notes))
                if args.verbose:
                    for n in notes:
                        print(f"  {YELLOW}⚑{RESET} {cid}: {n}")

        except (AdapterError, FetchError, NormalizeError) as e:
            failed.append((cid, str(e)))
            print(f"  {RED}✗{RESET} {cid}: {e}")
        except Exception as e:  # inesperado: no abortar el lote
            failed.append((cid, f"inesperado: {e}"))
            print(f"  {RED}✗{RESET} {cid}: inesperado: {e}")

    # ── Reporte final ──
    print(f"\n{CYAN}── Reporte ──{RESET}")
    print(f"{GREEN}✓ {len(published)} {'simulados' if args.dry_run else 'publicados'}{RESET}")
    for cid, msg in published:
        print(f"    {GREEN}•{RESET} {cid}  {DIM}{msg}{RESET}")
    if flagged:
        print(f"{YELLOW}⚑ {len(flagged)} con observaciones{RESET}")
        for cid, notes in flagged:
            print(f"    {YELLOW}•{RESET} {cid}: {'; '.join(notes)}")
    if failed:
        print(f"{RED}✗ {len(failed)} fallidos{RESET}")
        for cid, msg in failed:
            print(f"    {RED}•{RESET} {cid}: {msg}")
    if skipped and args.verbose:
        print(f"{DIM}↷ {len(skipped)} salteados{RESET}")
        for cid, msg in skipped:
            print(f"    {DIM}• {cid}: {msg}{RESET}")
    else:
        print(f"{DIM}↷ {len(skipped)} salteados (--verbose para verlos){RESET}")

    print()
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
