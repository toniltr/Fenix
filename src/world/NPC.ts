import { Character } from "./Character.js";
import { NpcStateMachine } from "./ai/NpcStateMachine.js";

// NPC = Character + su máquina de estados de rutina.
export class NPC extends Character {
  id: string;
  routine!: NpcStateMachine;

  constructor(id: string, object: import("three").Object3D) {
    super(object);
    this.id = id;
  }

  update(dt: number): void {
    this.routine?.update(dt);
    super.update(dt); // mueve el modelo + mixer
  }
}
