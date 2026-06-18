import * as THREE from "three";
import type { Engine } from "@/engine/Engine.js";
import { AssetLoader } from "@/engine/AssetLoader.js";
import { Marker } from "./Marker.js";
import { Player } from "./Player.js";
import { NPC } from "./NPC.js";
import { NpcStateMachine } from "./ai/NpcStateMachine.js";
import { Door } from "./interactables/Door.js";
import type { Interactable } from "./interactables/Interactable.js";
import { loadRoom } from "@/story/loader.js";
import { LoadingScreen } from "@/engine/LoadingScreen.js";
import type { WorldState } from "@/story/WorldState.js";

// Construye salas y gestiona el VIAJE entre ellas (aquí vive el issue #2:
// disponer geometría/colliders de la sala saliente antes de cargar la nueva).
export class RoomController {
  // mesh -> interactuable de la sala actual (para resolver clics)
  private byMesh = new Map<THREE.Object3D, Interactable>();

  constructor(
    private engine: Engine,
    private player: Player,
    private world: WorldState,
    // MISMOS mapas que tiene el InkBridge: se mutan en sitio, no se reasignan.
    private markers: Map<string, Marker>,
    private npcs: Map<string, NPC>,
  ) {}

  interactableFor(obj: THREE.Object3D): Interactable | undefined {
    return this.byMesh.get(obj);
  }

  async travelTo(roomId: string): Promise<void> {
    LoadingScreen.show();

    // 1. limpiar sala anterior (issue #2: dispose de meshes; aquí irían colliders)
    this.engine.scenes.clearRoom();
    this.engine.clearRoomUpdatables();
    this.byMesh.clear();
    this.markers.clear();
    this.npcs.clear();

    // 2. cargar + validar datos de la nueva sala
    const room = await loadRoom(roomId);
    this.world.enterRoom(roomId);

    // 3. tema visual (suelo + fondo) y nombre en el HUD
    this.engine.setTheme(room.theme);
    const roomEl = document.getElementById("hud-room");
    if (roomEl) roomEl.textContent = room.theme.name;

    // 4. markers (mutando el mapa compartido)
    for (const m of room.markers) {
      this.markers.set(m.id, Marker.fromTuple(m.id, m.position));
    }

    // 5. colocar al jugador en el marker "entrada"
    const entrada = this.markers.get("entrada");
    if (entrada) this.player.object.position.copy(entrada.position);

    // 6. puertas (paso o narrativa, color según tipo)
    for (const d of room.doors) {
      const door = new Door(
        d.id,
        new THREE.Vector3(d.position[0], d.position[1], d.position[2]),
        d.ink_node ?? "",
        d.leads_to,
      );
      this.engine.scenes.add(door.mesh);
      this.byMesh.set(door.mesh, door);
    }

    // 7. NPCs de la sala (placeholders) + su máquina de estados
    for (const n of room.npcs) {
      const mesh = AssetLoader.placeholder(0xd4537e);
      mesh.position.set(n.position[0], n.position[1], n.position[2]);
      const npc = new NPC(n.id, mesh);
      npc.routine = new NpcStateMachine(npc, this.markers, n.patrol);
      this.engine.scenes.add(mesh);
      this.engine.addRoomUpdatable(npc);
      this.npcs.set(n.id, npc);
      npc.routine.start();
    }

    // 8. actualizar los targets de clic a los de esta sala
    this.engine.input.setPickTargets([...this.byMesh.keys()]);

    await LoadingScreen.hide();
  }
}
