// El reloj del juego. CRÍTICO: ink no tiene reloj.
// De aquí salen el dt por frame y el "tiempo de juego" que alimenta hambre y rutinas.
export class Clock {
  private last = performance.now();
  /** segundos de juego acumulados */
  public elapsed = 0;

  /** devuelve dt en segundos y avanza el tiempo */
  tick(): number {
    const now = performance.now();
    const dt = Math.min((now - this.last) / 1000, 0.1); // clamp anti-saltos
    this.last = now;
    this.elapsed += dt;
    return dt;
  }
}
