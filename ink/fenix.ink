// ── Fenix · historia raíz ───────────────────────────────────────────
// La lógica narrativa vive AQUÍ. El JSON sólo dice dónde está cada cosa.

VAR hora = 7
VAR hambre = 100
VAR deuda  = 50
VAR bronca = false

LIST Animo = deprimido, triste, neutral, contento, euforico
VAR animo = neutral

EXTERNAL mover_personaje(npc, destino)
EXTERNAL set_npc_estado(npc, estado)
EXTERNAL franquear()   // "el jugador puede pasar": el motor viaja a la sala destino

// ── Puerta de la tienda: el tendero hace de PORTERO ─────────────────
// Issue #1 resuelto: la condición NO gatea la existencia de la puerta.
// Si debes dinero, te bloquea (no se llama a franquear -> no viajas).
// Si lo resuelves, ~ franquear() autoriza el viaje.
=== entrada_tienda ===
{ deuda > 0:
    ~ bronca = true
    ~ set_npc_estado("tendero", "interceptar")
    ~ mover_personaje("tendero", "puerta_tienda")
    -> confrontacion
- else:
    -> paso_libre
}

=== confrontacion ===
El tendero te corta el paso. "De aquí no pasas hasta saldar lo que me debes."
* ["Toma, tu dinero."]
    ~ deuda = 0
    ~ bronca = false
    ~ set_npc_estado("tendero", "patrullar")
    "Así me gusta. Anda, pasa."
    ~ franquear()
    -> DONE
* ["No llevo nada encima."]
    ~ animo = triste
    ~ set_npc_estado("tendero", "patrullar")
    "Entonces date la vuelta."
    -> DONE
* [Apartarlo y colarte.]
    ~ animo = euforico
    ~ set_npc_estado("tendero", "patrullar")
    Lo empujas y te cuelas dentro antes de que reaccione.
    ~ franquear()
    -> DONE

=== paso_libre ===
El tendero apenas levanta la vista. "Pasa, pasa."
~ franquear()
-> DONE
