import * as THREE from "three";
import { ManifestSchema, RoomSchema } from "@/types/world.js";
import type { Manifest, RoomData } from "@/types/world.js";

// Carga + valida (zod) los datos de mundo. Tu validador Python sigue para CI.
export async function loadManifest(): Promise<Manifest> {
  const res = await fetch("/story/world/manifest.json");
  return ManifestSchema.parse(await res.json());
}

export async function loadRoom(id: string): Promise<RoomData> {
  const res = await fetch(`/story/world/${id}.json`);
  return RoomSchema.parse(await res.json());
}

export async function loadInkJson(): Promise<string> {
  const res = await fetch("/story/fenix.ink.json");
  if (!res.ok) {
    throw new Error(
      "No se encontró fenix.ink.json. Ejecuta `npm run compile:ink` primero.",
    );
  }
  return res.text();
}

// ---- Conversión de coordenadas UE5 -> Three.js (issue #3) ----
// SIN VERIFICAR contra assets exportados. Estas dos constantes son los
// ÚNICOS puntos de ajuste cuando verifiques con una malla real.
const Y_SIGN = -1;
const YAW_SIGN = -1;
const UE_SCALE = 0.01; // cm -> m

export function ueVecToThree(x: number, y: number, z: number): THREE.Vector3 {
  // three = (ue.x, ue.z, ue.y * Y_SIGN) * scale
  return new THREE.Vector3(x * UE_SCALE, z * UE_SCALE, y * Y_SIGN * UE_SCALE);
}
export function ueRotToThree(yawDeg: number): number {
  return THREE.MathUtils.degToRad(yawDeg * YAW_SIGN);
}
