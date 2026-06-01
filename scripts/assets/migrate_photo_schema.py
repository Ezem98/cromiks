#!/usr/bin/env python3
"""
Migración one-shot (T1): bloque `photo` del catálogo al schema del pipeline R2.

Reescribe SOLO las líneas `photo: { ... }` (flow-map de una línea) a bloque,
dejando el resto del archivo byte-idéntico (comentarios load-bearing, video/
audio/relator_clip, indentación). No usa un parser YAML a propósito: un
round-trip de todo el archivo reflowaría los otros flow-maps que NO son scope
de T1.

Transformación:
  source            -> source_url            (mismo valor)
  (host)            -> source_kind           wikimedia | direct | TODO
  type              -> type                  (se conserva: intent de procesamiento)
  author, license   -> author, license       (igual)
  (nuevo)           -> legal_posture         "takedown"   (decisión CEO: 205)
  (nuevo)           -> status                "pending"
  (nuevo)           -> asset/credit/fetched_at/content_hash  null (los completa la CLI)

Uso:  python scripts/assets/migrate_photo_schema.py [--check]
  --check: no escribe, solo reporta cuántos bloques migraría.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

CATALOG = Path(__file__).resolve().parents[2] / "catalog" / "eterno-diciembre.yaml"

# Línea de un bloque photo flow-style. Capturamos indentación e interior del { }.
PHOTO_LINE = re.compile(r'^(?P<indent>\s*)photo:\s*\{(?P<body>.*)\}\s*$')
# key: "value" dentro del flow-map (values sin comillas literales internas).
FIELD = re.compile(r'(\w+):\s*"([^"]*)"')


def source_kind_for(source_url: str) -> str:
    if source_url.startswith("http"):
        if "upload.wikimedia.org" in source_url:
            return "wikimedia"
        return "direct"
    return "TODO"  # sentinel: fuente todavía sin curar


def render_block(indent: str, fields: dict[str, str]) -> str:
    photo_type = fields.get("type", "official")
    source_url = fields.get("source", "TODO")
    author = fields.get("author", "TODO")
    license_ = fields.get("license", "TODO")
    kind = source_kind_for(source_url)

    child = indent + "  "
    lines = [
        f'{indent}photo:',
        f'{child}type: "{photo_type}"',
        f'{child}source_url: "{source_url}"',
        f'{child}source_kind: "{kind}"',
        f'{child}author: "{author}"',
        f'{child}license: "{license_}"',
        f'{child}legal_posture: "takedown"',
        f'{child}status: "pending"',
        f'{child}# --- completa la CLI, no editar a mano ---',
        f'{child}asset: null',
        f'{child}credit: null',
        f'{child}fetched_at: null',
        f'{child}content_hash: null',
    ]
    return "\n".join(lines)


def main() -> int:
    check = "--check" in sys.argv
    text = CATALOG.read_text(encoding="utf-8")
    out: list[str] = []
    migrated = 0

    for line in text.split("\n"):
        m = PHOTO_LINE.match(line)
        if not m:
            out.append(line)
            continue
        fields = dict(FIELD.findall(m.group("body")))
        if "source" not in fields:
            # No es el flow-map esperado (p.ej. ya migrado): no tocar.
            out.append(line)
            continue
        out.append(render_block(m.group("indent"), fields))
        migrated += 1

    print(f"bloques photo migrados: {migrated}")
    if check:
        return 0

    CATALOG.write_text("\n".join(out), encoding="utf-8")
    print(f"escrito: {CATALOG}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
