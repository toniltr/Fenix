import * as THREE from "three";
import type { Engine } from "@/engine/Engine.js";
import { AssetLoader } from "@/engine/AssetLoader.js";
import { Marker } from "./Marker.js";
import { Player } from "./Player.js";
import { NPC } from "./NPC.js";
import { Door } from "./interactables/Door.js";
import type { Interactable } from "./interactables/Interactable.js";
import { loadRoom } from "@/story/loader.js";
import { LoadingScreen } from "@/engine/LoadingScreen.js";
import type { WorldState } from "@/story/WorldState.js";

// Construye salas y gestiona el VIAJE entre ellas (aquí vive el issue #2:
// disponer geometría/colliders de la sala saliente antes de cargar la nueva).
export class RoomController {
  // mesh -> interactuable de la sala actual (para resolver clics)
  private readonly byMesh = new Map<THREE.Object3D, Interactable>();

  constructor(
    private readonly engine: Engine,
    private readonly player: Player,
    private readonly world: WorldState,
    private readonly assetLoader: AssetLoader,
    // MISMOS mapas que tiene el InkBridge: se mutan en sitio, no se reasignan.
    private readonly markers: Map<string, Marker>,
    private readonly npcs: Map<string, NPC>,
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
    //this.engine.setTheme(room.theme);
    const roomEl = document.getElementById("hud-room");
    if (roomEl) roomEl.textContent = room.theme.name;

    // 3.5. cargar modelo 3D de la sala (si lo hay)
    let levelScene: THREE.Object3D | undefined;

    if (room.model) {
      const gltf = await this.assetLoader.load(room.model);
      levelScene = gltf.scene;

      this.engine.scenes.add(levelScene);
    }

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

      // buscar el nodo visual de la puerta dentro del nivel
      const nodeName = `Door_${d.leads_to ?? d.id}`;
      const node = levelScene?.getObjectByName(nodeName);

      if (node) {
        // mapear TODOS los meshes hijos del nodo -> este Door,
        // para que el raycast (no recursivo) los encuentre uno a uno
        node.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            this.byMesh.set(o, door);
          }
        });
      } else {
        // fallback: sin nodo en el glb, usa la caja de color de siempre
        console.warn(`[door] nodo '${nodeName}' no está en el glb; uso caja`);
        this.engine.scenes.add(door.mesh);
        this.byMesh.set(door.mesh, door);
      }
    }

    // 7. NPCs de la sala (placeholders) + su máquina de estados
    for (const n of room.npcs) {
      const mesh = AssetLoader.placeholder(0xd4537e);

      const nodeName = `NPC_${n.id}`;
      const node = levelScene
        ? levelScene.getObjectByName(nodeName)
        : undefined;

      if (node) {
        // posición real del punto en espacio mundo
        const worldPos = new THREE.Vector3();
        node.getWorldPosition(worldPos);

        // anclar por los PIES: la cápsula tiene su origen en el centro
        // (placeholder hace mesh.position.y = height/2), así que la base
        // de la cápsula está a worldPos.y; subimos el centro media altura.
        const box = new THREE.Box3().setFromObject(mesh);
        const halfHeight = (box.max.y - box.min.y) / 2;
        mesh.position.set(worldPos.x, worldPos.y + halfHeight, worldPos.z);

        // orientación del punto, si la tiene (rotaste el Blueprint en UE)
        const worldQuat = new THREE.Quaternion();
        node.getWorldQuaternion(worldQuat);
        mesh.quaternion.copy(worldQuat);
      } else {
        // fallback: nodo no encontrado, usa la coord del JSON y avisa
        console.warn(
          `[npc] nodo '${nodeName}' no está en el glb; uso coord JSON`,
        );
        mesh.position.set(n.position[0], n.position[1], n.position[2]);
      }

      const npc = new NPC(n.id, mesh);
      this.engine.scenes.add(mesh);
      this.npcs.set(n.id, npc);
    }

    // 8. actualizar los targets de clic a los de esta sala
    this.engine.input.setPickTargets([...this.byMesh.keys()]);

    this.engine.resetCameraToFar();
    await LoadingScreen.hide();
  }
}
