"""
Lectura/escritura del catálogo YAML.

- LECTURA: ruamel.yaml (parseo robusto de la estructura para iterar cromos).
- ESCRITURA (write_back): QUIRÚRGICA por líneas — reescribimos solo los campos del
  bloque `content.photo` del cromo, dejando el resto del archivo byte-idéntico.

¿Por qué no dumpear con ruamel? Porque su round-trip re-emite el archivo entero
(reflowea los flow-maps `{ x }`→`{x}`, normaliza blank lines) → un diff de ~1000
líneas por cada corrida. La tool corre repetido (un cromo por vez), así que el
diff TIENE que ser quirúrgico. Los campos ya existen (T1 los creó), así que solo
reemplazamos el valor de cada línea `        <key>: <val>`.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from config import REPO_ROOT

CATALOG_PATH = REPO_ROOT / "catalog" / "eterno-diciembre.yaml"

_TODO = {"", "TODO"}

# Anclas de indentación del schema de T1: card `  - id:`, photo `      photo:` (6),
# hijos del photo a 8 espacios.
_CARD_ID_RE = re.compile(r'^  - id:\s*"([^"]*)"\s*$')
_PHOTO_RE = re.compile(r"^      photo:\s*$")
_CHILD_KEY_RE = re.compile(r"^        ([a-z_]+):")


def nullify(value: Any) -> str | None:
    """'TODO'/''/None → None; sino el string."""
    if not isinstance(value, str):
        return None
    v = value.strip()
    return None if v in _TODO else v


def _yaml_scalar(value: str) -> str:
    """Valor escalar YAML double-quoted, seguro (escapa comillas), UTF-8 legible."""
    return json.dumps(value, ensure_ascii=False)


@dataclass
class PhotoCard:
    card_id: str
    photo: Any  # CommentedMap del bloque photo — SOLO lectura

    @property
    def source_url(self) -> str | None:
        return nullify(self.photo.get("source_url"))

    @property
    def source_kind(self) -> str | None:
        return nullify(self.photo.get("source_kind"))

    @property
    def status(self) -> str:
        return nullify(self.photo.get("status")) or "pending"


@dataclass
class Catalog:
    path: Path
    album_id: str
    _data: Any

    def photo_cards(self) -> list[PhotoCard]:
        out: list[PhotoCard] = []
        for card in self._data.get("cards", []):
            content = card.get("content")
            if not isinstance(content, dict):
                continue
            photo = content.get("photo")
            if not isinstance(photo, dict):
                continue
            out.append(PhotoCard(card_id=card["id"], photo=photo))
        return out

    def update_card_photo(self, card_id: str, fields: dict[str, str | None]) -> None:
        """
        Reescribe quirúrgicamente las líneas del bloque photo de `card_id`. Solo
        toca las claves de `fields` con valor != None; deja el resto del archivo
        intacto. Relee el archivo fresco para no pisar cambios de cromos previos.
        """
        raw = self.path.read_text(encoding="utf-8")
        lines = raw.split("\n")

        # 1. Ubicar el cromo
        start = next((i for i, ln in enumerate(lines) if _CARD_ID_RE.match(ln) and _CARD_ID_RE.match(ln).group(1) == card_id), None)
        if start is None:
            raise KeyError(f"card '{card_id}' no encontrado en el YAML")
        # Fin del bloque del cromo = próximo `  - id:` o EOF
        end = next((j for j in range(start + 1, len(lines)) if lines[j].startswith("  - id:")), len(lines))

        # 2. Ubicar `photo:` y sus hijos (8 espacios)
        photo_idx = next((k for k in range(start, end) if _PHOTO_RE.match(lines[k])), None)
        if photo_idx is None:
            raise KeyError(f"bloque photo no encontrado para '{card_id}'")
        child_end = photo_idx + 1
        for k in range(photo_idx + 1, end):
            if lines[k].startswith("        "):  # hijo del photo (incluye comentarios)
                child_end = k + 1
            elif lines[k].strip() == "":
                break
            else:
                break

        # 3. Actualizar las claves existentes in-place
        remaining = {k: v for k, v in fields.items() if v is not None}
        for k in range(photo_idx + 1, child_end):
            m = _CHILD_KEY_RE.match(lines[k])
            if m and m.group(1) in remaining:
                key = m.group(1)
                lines[k] = f"        {key}: {_yaml_scalar(remaining.pop(key))}"

        # 4. Claves que no existían (no debería pasar con el schema de T1): insertar
        if remaining:
            inserts = [f"        {k}: {_yaml_scalar(v)}" for k, v in remaining.items()]
            lines[child_end:child_end] = inserts

        self.path.write_text("\n".join(lines), encoding="utf-8")


def load_catalog(path: Path = CATALOG_PATH) -> Catalog:
    from ruamel.yaml import YAML

    yaml = YAML()
    with path.open("r", encoding="utf-8") as f:
        data = yaml.load(f)
    return Catalog(path=path, album_id=data["meta"]["album_id"], _data=data)
