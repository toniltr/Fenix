# Fenix

Aventura point-and-click 3D en el navegador. **Three.js** mueve el mundo;
**ink** decide la historia; un *bridge* tipado los conecta.

## Arranque rápido

```bash
npm install
npm run dev        # abre http://localhost:5173
```

> El repo ya incluye `public/story/fenix.ink.json` precompilado, así que
> `npm run dev` funciona de inmediato. Tras editar un `.ink`, recompila:
>
> ```bash
> npm run compile:ink
> ```

## Qué demuestra el scaffold

- Clic en la **puerta ámbar** → dispara el knot `entrada_tienda` de ink.
- Como `deuda > 0` (valor inicial 50), ink **enruta a la confrontación** y
  ordena al tendero interceptarte: cambia su estado (`set_npc_estado`) y lo
  manda a la puerta (`mover_personaje`). El tendero (cápsula rosa) camina hacia ti.
- El **HUD** refleja `hambre`, `deuda` y `animo` vía observadores de ink.
- El **hambre baja con el tiempo**: ese tick lo gobierna el render loop
  (ink no tiene reloj), y se escribe en ink desde el motor.
- Pon `deuda = 0` en `ink/fenix.ink`, recompila, y verás la rama de charla normal.

## La regla de reparto

| | Dueño |
|---|---|
| Render, cámara, físicas, **tiempo**, pathfinding, animación | **motor** (Three.js) |
| Estado narrativo (hambre, deuda, ánimo), ramificación, diálogo | **ink** |
| Traducción entre ambos (external functions, observadores) | **bridge** |

Prueba del algodón: si la variable *ramifica la historia* → ink.
Si *describe dónde/cómo está algo en 3D* → motor.

## Cómo añadir una sala nueva

Una sala es **solo datos** (`public/story/world/<id>.json`). No se toca código.

1. Crea `public/story/world/<id>.json` con su `theme`, `markers` (incluye uno
   llamado `entrada`: ahí aparece el jugador), `doors`, `npcs`.
2. Añade su `id` al array `rooms` de `manifest.json`.
3. Enlázala desde otra sala con una **puerta de paso** (`leads_to: "<id>"`).
4. `npm run validate` para confirmar integridad.

Tipos de puerta (color automático por presencia de narrativa):

| Puerta | Campos | Color | Comportamiento |
|---|---|---|---|
| Paso puro | `leads_to` | violeta | viaja directo a otra sala |
| Narrativa | `ink_node` | ámbar | dispara un knot de ink (sin viaje) |
| **Portero** | `ink_node` + `leads_to` | ámbar | dispara ink; **viaja sólo si ink llama a `franquear()`** |

La puerta de la tienda es del tipo **portero**: el tendero la custodia. Si
`deuda > 0` te bloquea (ink no llama a `franquear`, no viajas); si saldas la
deuda o te cuelas, ink hace `~ franquear()` y el motor te lleva al salón. Así la
condición ya no gatea la existencia de la puerta, sino el permiso de paso (issue #1).

Cada sala se distingue de un vistazo por su `theme` (color de suelo + fondo +
nombre en el HUD). Los NPCs son **por sala**: el tendero existe en la tienda y
desaparece al pasar al salón, porque vive en `tienda.json`, no en el código.

El viaje lo gestiona `RoomController.travelTo()`, que dispone la geometría de la
sala saliente (issue #2) y reconstruye la nueva, manteniendo al jugador vivo
entre salas. Los mapas `markers`/`npcs` se mutan en sitio para que el `InkBridge`
nunca se quede con referencias obsoletas.

## Estructura

```
ink/                     autoría (.ink, fuera de public, no se sirve)
public/story/
  fenix.ink.json         ink COMPILADO (lo que carga el runtime)
  world/                 datos espaciales (tu v4 partido por sala)
src/
  engine/                Engine, SceneManager, Physics, AssetLoader, InputManager, Clock
  world/                 Character, Player, NPC, Marker, interactables/, ai/
  story/                 StoryRunner, DialogueUI, loader, WorldState
  bridge/                InkBridge, InteractionManager   ← el pegamento
  types/                 world.ts (zod), story.ts (contrato de ink)
scripts/
  compile_ink.mjs        .ink → .ink.json
  validate_world.py      integridad cross-file (cero refs colgantes)
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | servidor de desarrollo |
| `npm run compile:ink` | compila `ink/fenix.ink` → `public/story/fenix.ink.json` |
| `npm run validate` | validación de integridad del mundo (Python) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | compila ink + typecheck + build de producción |

## Issues abiertos por diseño (ver comentarios `issue #N` en el código)

1. **#1 — bronca/deuda**: *resuelto de raíz* con este modelo. La condición ya
   no gatea la existencia de la puerta; ink enruta a `confrontacion` y cambia
   el estado del NPC. Ver `ink/fenix.ink` y `InkBridge`.
2. **#2 — colliders**: `SceneManager.clearRoom()` deja el hook para disponer
   geometría y colliders de la sala saliente al viajar.
3. **#3 — coordenadas UE→Three**: `ueVecToThree`/`ueRotToThree` en `loader.ts`
   con `Y_SIGN`/`YAW_SIGN` como únicos puntos de ajuste. SIN verificar todavía
   contra un asset exportado.

## Sustituir placeholders por tus assets

Las cápsulas de color son `AssetLoader.placeholder(...)`. Cuando tengas tus
GLTF, usa `AssetLoader.load(url)` y asigna `character.mixer` desde el GLTF
(recuerda `mixer.update(dt)` cada frame — ya está cableado en `Character.update`).
