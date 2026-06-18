import { Character } from "./Character.js";

// El jugador añade inventario FÍSICO (qué mallas lleva), no la narrativa.
// El hambre/ánimo/deuda viven en ink, no aquí.
export class Player extends Character {
  inventory = new Set<string>();

  give(item: string): void {
    this.inventory.add(item);
  }
  take(item: string): void {
    this.inventory.delete(item);
  }
}
