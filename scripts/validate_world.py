#!/usr/bin/env python3
"""Validación de integridad del mundo (cero referencias colgantes).
Ahora CROSS-FILE: carga manifest + todas las salas y comprueba referencias.
Mantiene tu disciplina: ninguna entrega sin un chequeo limpio.
"""
import json, sys, pathlib

WORLD = pathlib.Path("public/story/world")
INK_JSON = pathlib.Path("public/story/fenix.ink.json")

def load(p):
    return json.loads(p.read_text(encoding="utf-8"))

def main():
    errors = []
    manifest = load(WORLD / "manifest.json")

    # ink compilado debe existir y contener los knots referenciados
    ink_text = INK_JSON.read_text(encoding="utf-8") if INK_JSON.exists() else ""
    if not ink_text:
        errors.append("falta public/story/fenix.ink.json (ejecuta compile:ink)")

    for room_id in manifest["rooms"]:
        room = load(WORLD / f"{room_id}.json")

        for d in room.get("doors", []):
            node = d.get("ink_node")
            # narrativa: el knot debe existir en el ink compilado
            if node and ink_text and node not in ink_text:
                errors.append(f"[{room_id}] puerta '{d['id']}' apunta a knot ink inexistente: {node}")
            # paso: la sala destino debe estar listada en el manifest
            if "leads_to" in d and d["leads_to"] not in manifest["rooms"]:
                errors.append(f"[{room_id}] puerta '{d['id']}' lleva a sala no listada: {d['leads_to']}")
            # una puerta debe hacer algo: o narrativa o paso
            if not node and "leads_to" not in d:
                errors.append(f"[{room_id}] puerta '{d['id']}' no tiene ni ink_node ni leads_to")

    if errors:
        print("✗ Validación FALLIDA:")
        for e in errors:
            print("  -", e)
        sys.exit(1)
    print("✓ Mundo íntegro: cero referencias colgantes.")

if __name__ == "__main__":
    main()
