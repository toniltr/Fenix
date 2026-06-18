import type { NpcStateName } from "@/types/story.js";
import type { Character } from "../Character.js";
import type { Marker } from "../Marker.js";

// Máquina de estados de rutina del NPC. Corre en el render loop con el Clock.
// ink sólo le hace setState(...); TODO el movimiento/pathfinding es de aquí.
export class NpcStateMachine {
  state: NpcStateName = "patrullar";

  constructor(
    private npc: Character,
    private markers: Map<string, Marker>,
    private patrol: string[] = [], // ids de markers para la ronda
  ) {}

  private patrolIndex = 0;

  setState(next: NpcStateName): void {
    if (this.state === next) return;
    this.state = next;
    this.npc.stop();
    if (next === "patrullar") this.gotoNextPatrol();
  }

  /** lo llama el InkBridge vía external function mover_personaje */
  goTo(markerId: string, onArrive?: () => void): void {
    const m = this.markers.get(markerId);
    if (m) this.npc.walkTo(m.position, onArrive);
  }

  private gotoNextPatrol(): void {
    if (this.patrol.length === 0) return;
    const id = this.patrol[this.patrolIndex % this.patrol.length];
    this.patrolIndex++;
    const m = this.markers.get(id);
    if (m) this.npc.walkTo(m.position, () => this.gotoNextPatrol());
  }

  start(): void {
    this.gotoNextPatrol();
  }

  // tick reservado para lógica horaria (abrir tienda a las 9, etc.)
  update(_dt: number): void {
    // el horario ambiental se conectaría aquí usando Clock.elapsed
  }
}
