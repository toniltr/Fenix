import type RAPIER_NS from "@dimforge/rapier3d-compat";

// Wrapper de Rapier. Patrón crítico (ya sufrido como black screen):
// usar @dimforge/rapier3d-compat con await RAPIER.init() explícito,
// y crear la física de forma ASÍNCRONA, awaitada en main.ts.
export class Physics {
  world!: RAPIER_NS.World;

  static async create(): Promise<Physics> {
    const p = new Physics();
    const RAPIER = (await import("@dimforge/rapier3d-compat")).default;
    await RAPIER.init();
    p.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

    // Suelo de demostración (issue #2: aquí es donde luego se gestiona
    // la disposición de colliders por sala al viajar entre escenas).
    const groundDesc = RAPIER.ColliderDesc.cuboid(50, 0.1, 50).setTranslation(0, -0.1, 0);
    p.world.createCollider(groundDesc);
    return p;
  }

  step(): void {
    this.world.step();
  }
}
