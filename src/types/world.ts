import { z } from "zod";

// Esquema del JSON de mundo (tu v4 "logic-bearing" partido por sala).
// zod valida EN EL LOAD (segunda red dentro del juego) + deriva el tipo.

const Vec3 = z.tuple([z.number(), z.number(), z.number()]);

// Tema visual de la sala: el diferenciador de un vistazo. Es DATO, no código.
export const ThemeSchema = z.object({
  name: z.string(),
  floor: z.string(),       // color CSS del suelo, p.ej. "#3a2e26"
  background: z.string(),  // color CSS del fondo de escena
});

export const MarkerSchema = z.object({
  id: z.string(),
  position: Vec3,
});

export const DoorSchema = z.object({
  id: z.string(),
  position: Vec3,
  // narrativa: knot de ink que se dispara al usar la puerta (opcional)
  ink_node: z.string().optional(),
  // paso físico: sala destino. Si está, la puerta VIAJA (no dispara ink).
  leads_to: z.string().optional(),
});

export const NpcSchema = z.object({
  id: z.string(),
  position: Vec3,
  patrol: z.array(z.string()).default([]), // ids de markers de la ronda
});

export const PickupSchema = z.object({
  id: z.string(),
  position: Vec3,
  ink_node: z.string().optional(),
});

export const RoomSchema = z.object({
  id: z.string(),
  theme: ThemeSchema,
  markers: z.array(MarkerSchema).default([]),
  doors: z.array(DoorSchema).default([]),
  npcs: z.array(NpcSchema).default([]),
  pickups: z.array(PickupSchema).default([]),
});

export const ManifestSchema = z.object({
  settings: z.object({
    coordinate_system: z.literal("threejs"),
    start_room: z.string(),
  }),
  rooms: z.array(z.string()),
});

export type Vec3T = z.infer<typeof Vec3>;
export type Theme = z.infer<typeof ThemeSchema>;
export type MarkerData = z.infer<typeof MarkerSchema>;
export type DoorData = z.infer<typeof DoorSchema>;
export type NpcData = z.infer<typeof NpcSchema>;
export type PickupData = z.infer<typeof PickupSchema>;
export type RoomData = z.infer<typeof RoomSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
