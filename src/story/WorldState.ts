// Era gameState.js, VACIADO de lo narrativo. Sólo estado FÍSICO del mundo.
// (en qué sala estás, qué pickups ya retiraste de la escena).
// El estado de historia se fue a StoryRunner.variablesState.
export class WorldState {
  currentRoom = "";
  removedPickups = new Set<string>();

  enterRoom(id: string): void {
    this.currentRoom = id;
  }
  removePickup(id: string): void {
    this.removedPickups.add(id);
  }
}
