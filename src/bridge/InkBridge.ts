import type { StoryRunner } from "@/story/StoryRunner.js";
import type { Player } from "@/world/Player.js";
import type { NPC } from "@/world/NPC.js";
import type { Marker } from "@/world/Marker.js";
import type { NpcStateName, Animo } from "@/types/story.js";

// EL PEGAMENTO. Único sitio donde ink y el mundo 3D se tocan.
// Registra las external functions (ink llama -> motor actúa) y los
// observadores (variable de ink cambia -> se refleja en el mundo/UI).
export class InkBridge {
  constructor(
    private runner: StoryRunner,
    private deps: {
      player: Player;
      npcs: Map<string, NPC>;
      markers: Map<string, Marker>;
      hud: { setHambre(v: number): void; setDeuda(v: number): void; setAnimo(v: Animo): void };
      engine: { setHourLighting(v: number): void };
    },
  ) {}

  bindAll(): void {
    const { npcs, markers, player } = this.deps;

    // ink: ~ mover_personaje("tendero", "puerta_tienda")
    this.runner.bindExternal("mover_personaje", (npcId: string, destino: string) => {
      const npc = npcs.get(npcId);
      const marker = markers.get(destino);
      if (npc && marker) npc.walkTo(marker.position);
    });

    // ink: ~ set_npc_estado("tendero", "interceptar")
    this.runner.bindExternal("set_npc_estado", (npcId: string, estado: NpcStateName) => {
      npcs.get(npcId)?.routine?.setState(estado);
    });

    // ink: ~ dar_pickup("espada")
    this.runner.bindExternal("dar_pickup", (item: string) => player.give(item));
    this.runner.bindExternal("quitar_pickup", (item: string) => player.take(item));

    // observadores: el VALOR vive en ink, su REFLEJO en el mundo es nuestro.
    this.runner.observe("hambre", (_n, v) => this.deps.hud.setHambre(v as number));
    this.runner.observe("deuda", (_n, v) => this.deps.hud.setDeuda(v as number));
    this.runner.observe("animo", (_n, v) => this.deps.hud.setAnimo(v as Animo));

    // la hora vive en ink; su reflejo en la luz es nuestro
    //this.runner.observe("hora", (_n, v) => this.deps.engine.setHourLighting(v as number));
  }
}
