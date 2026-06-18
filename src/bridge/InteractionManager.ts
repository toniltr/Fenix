import type { StoryRunner } from "@/story/StoryRunner.js";
import type { DialogueUI } from "@/story/DialogueUI.js";
import type { RoomController } from "@/world/RoomController.js";
import type { Interactable } from "@/world/interactables/Interactable.js";
import { Door } from "@/world/interactables/Door.js";

// Era interaction.js. Media entre mundo<->ink y coordina el "portero":
// la puerta dispara narrativa; el viaje sólo ocurre si ink llama a franquear().
export class InteractionManager {
  private pending: Door | null = null;

  constructor(
    private runner: StoryRunner,
    private ui: DialogueUI,
    private rooms: RoomController,
  ) {
    this.runner.onText = (t) => this.ui.showText(t);
    this.runner.onChoices = (c) => this.ui.showChoices(c);
    this.ui.onChoice = (i) => this.runner.choose(i);

    // external de FLUJO: ink autoriza el paso -> el motor viaja a la sala
    // destino de la puerta que disparó la interacción.
    this.runner.bindExternal("franquear", () => this.franquear());
  }

  /** lo llama el InputManager cuando se golpea un interactuable */
  trigger(it: Interactable): void {
    // recuerda la puerta-paso por si ink autoriza el viaje
    this.pending = it instanceof Door && it.leadsTo ? it : null;

    if (it.inkNode) {
      this.runner.goTo(it.inkNode);          // narrativa (puede terminar en franquear)
    } else if (it instanceof Door && it.leadsTo) {
      void this.rooms.travelTo(it.leadsTo);  // paso puro, sin narrativa
    }
  }

  private franquear(): void {
    const d = this.pending;
    this.pending = null; // evita un doble viaje
    if (d?.leadsTo) void this.rooms.travelTo(d.leadsTo);
  }
}
