#!/usr/bin/env python3
"""
MoveSpot — Vérification des traductions manquantes
Scanne tous les fichiers source TypeScript/TSX et compare les clés t("...")
avec src/locales/fr.json. Retourne le code 0 si tout est OK, 1 sinon.

Usage:
  python3 scripts/i18n-check.py            # vérification simple
  python3 scripts/i18n-check.py --fix      # ajoute les clés manquantes dans fr.json
                                           # avec une valeur TODO pour chaque clé
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
FR_JSON = ROOT / "src" / "locales" / "fr.json"
SRC_DIR = ROOT / "src"

# Regex : capture les clés t("a.b.c") ou t('a.b.c')
KEY_PATTERN = re.compile(r"""(?<![a-zA-Z])t\(["']([a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+)["']""")

IGNORED_PREFIXES = (
    "@/",  # imports TS
    "data:",
    "http",
)


def flatten(d: dict, prefix: str = "") -> set[str]:
    keys: set[str] = set()
    for k, v in d.items():
        full = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            keys |= flatten(v, full)
        else:
            keys.add(full)
    return keys


def extract_used_keys() -> set[str]:
    used: set[str] = set()
    for path in SRC_DIR.rglob("*.tsx"):
        if ".gen." in path.name:
            continue
        try:
            for m in KEY_PATTERN.finditer(path.read_text(encoding="utf-8")):
                key = m.group(1)
                if not any(key.startswith(p) for p in IGNORED_PREFIXES):
                    used.add(key)
        except Exception:
            pass
    for path in SRC_DIR.rglob("*.ts"):
        if ".gen." in path.name or ".d.ts" in path.name:
            continue
        try:
            for m in KEY_PATTERN.finditer(path.read_text(encoding="utf-8")):
                key = m.group(1)
                if not any(key.startswith(p) for p in IGNORED_PREFIXES):
                    used.add(key)
        except Exception:
            pass
    return used


def set_nested(d: dict, key: str, value: str) -> None:
    parts = key.split(".")
    for part in parts[:-1]:
        d = d.setdefault(part, {})
    d[parts[-1]] = value


def main() -> int:
    parser = argparse.ArgumentParser(description="MoveSpot i18n checker")
    parser.add_argument("--fix", action="store_true", help="Ajoute les clés manquantes avec valeur TODO")
    args = parser.parse_args()

    with open(FR_JSON, encoding="utf-8") as f:
        fr = json.load(f)

    fr_keys = flatten(fr)
    used_keys = extract_used_keys()
    missing = sorted(used_keys - fr_keys)

    print(f"Clés utilisées dans le code : {len(used_keys)}")
    print(f"Clés présentes dans fr.json : {len(fr_keys)}")

    if not missing:
        print("✅  Aucune clé manquante — toutes les traductions sont présentes.")
        return 0

    print(f"\n❌  {len(missing)} clé(s) manquante(s) :\n")
    for key in missing:
        print(f"  - {key}")

    if args.fix:
        for key in missing:
            set_nested(fr, key, f"TODO:{key}")
        with open(FR_JSON, "w", encoding="utf-8") as f:
            json.dump(fr, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(f"\n🔧  {len(missing)} clé(s) ajoutée(s) dans fr.json avec la valeur TODO:<clé>.")
        print("    Remplacez chaque TODO par la traduction française correspondante.")

    return 1


if __name__ == "__main__":
    sys.exit(main())
