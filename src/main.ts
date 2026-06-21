import { Engine } from "@/engine/Engine.js";
import { Physics } from "@/engine/Physics.js";
import { AssetLoader } from "@/engine/AssetLoader.js";

import { Player } from "@/world/Player.js";
import { NPC } from "@/world/NPC.js";
import { Marker } from "@/world/Marker.js";
import { RoomController } from "@/world/RoomController.js";

import { StoryRunner } from "@/story/StoryRunner.js";
import { DialogueUI } from "@/story/DialogueUI.js";
import { WorldState } from "@/story/WorldState.js";
import { loadManifest, loadInkJson } from "@/story/loader.js";

import { InkBridge } from "@/bridge/InkBridge.js";
import { InteractionManager } from "@/bridge/InteractionManager.js";

import type { Animo } from "@/types/story.js";

// Adaptador de HUD: refleja variables de ink en el DOM.
const hud = {
  setHambre: (v: number) => (document.getElementById("hud-hambre")!.textContent = String(Math.round(v))),
  setDeuda: (v: number) => (document.getElementById("hud-deuda")!.textContent = String(v)),
  setAnimo: (v: Animo) => (document.getElementById("hud-animo")!.textContent = String(v)),
  setHora: (v: number) => (document.getElementById("hud-hora")!.textContent = String(Math.floor(v)).padStart(2, "0") + "h"),
};

async function boot(): Promise<void> {
  // 1. Física asíncrona (await CRÍTICO: evita el black screen por orden de init).
  let physics: Physics | undefined;
  try {
    physics = await Physics.create();
  } catch (e) {
    console.warn("Rapier no inicializó; sigo sin física.", e);
  }

  // 2. Motor + render.
  const engine = new Engine(physics);

  const assetLoader = new AssetLoader(engine.renderer);

  // 3. Jugador: PERSISTENTE (sobrevive al cambio de sala).
  const playerMesh = AssetLoader.placeholder(0x378add);
  const player = new Player(playerMesh);
  engine.addPersistent(playerMesh);
  engine.addUpdatable(player);

  // 4. Estado físico + mapas COMPARTIDOS (los muta RoomController, los lee InkBridge).
  const worldState = new WorldState();
  const markers = new Map<string, Marker>();
  const npcs = new Map<string, NPC>();

  // 5. Controlador de salas (viaje + construcción).
  const rooms = new RoomController(engine, player, worldState, assetLoader, markers, npcs);

  // 6. ink + UI + interacción (la interacción necesita 'rooms' para el portero).
  const inkJson = await loadInkJson();
  const runner = new StoryRunner(inkJson);
  const ui = new DialogueUI();
  const interaction = new InteractionManager(runner, ui, rooms);

  // 7. Bridge: external functions de mundo + observadores.
  new InkBridge(runner, { player, npcs, markers, hud, engine }).bindAll();
  hud.setHambre(runner.get("hambre"));
  hud.setDeuda(runner.get("deuda"));
  hud.setAnimo(runner.get("animo"));
  hud.setHora(runner.get("hora"));

  engine.lighting.setHourLighting(runner.get("hora"));


  // 9. Handler de clic (una vez; los targets cambian por sala).
  engine.input.setPickHandler((obj) => {
    const it = rooms.interactableFor(obj);
    if (it) interaction.trigger(it);
  });

  // 10. Entrar en la sala inicial y arrancar el loop.
  const manifest = await loadManifest();
  await rooms.travelTo(manifest.settings.start_room);
  await engine.start();

  console.log("Fenix arrancado. La puerta ámbar es paso al salón, con el tendero de portero.");
}

boot().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#f88;max-width:80vw">${String(e)}</pre>`,
  );
});
