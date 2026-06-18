// Contrato tipado de la frontera con ink.
// ink no sabe de TypeScript: estos tipos son la fachada que ponemos encima
// para que los nombres-string de variables y external functions dejen de ser frágiles.

// LIST Animo del .ink, reflejada como unión de strings.
export type Animo =
  | "deprimido"
  | "triste"
  | "neutral"
  | "contento"
  | "euforico";

// Estado narrativo que vive DENTRO de ink (su variablesState).
// Regla: si la variable ramifica la historia -> aquí. Si describe el 3D -> WorldState.
export interface StoryVars {
  hambre: number;
  deuda: number;
  bronca: boolean;
  animo: Animo;
}

// Firmas de las external functions que el motor expone a ink.
// El InkBridge implementa exactamente este contrato.
export interface ExternalFns {
  mover_personaje: (npc: string, destino: string) => void;
  set_npc_estado: (npc: string, estado: NpcStateName) => void;
  dar_pickup: (item: string) => void;
  quitar_pickup: (item: string) => void;
}

export type NpcStateName = "patrullar" | "trabajar" | "interceptar" | "dormir";
