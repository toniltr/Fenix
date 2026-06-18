import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

// Carga de GLTF ya optimizados (--no-prune para mallas con esqueleto).
// En el scaffold no hay assets reales; este loader queda listo para tus mallas.
export class AssetLoader {
  private gltf = new GLTFLoader();
  private cache = new Map<string, GLTF>();

  async load(url: string): Promise<GLTF> {
    const cached = this.cache.get(url);
    if (cached) return cached;
    const gltf = await this.gltf.loadAsync(url);
    this.cache.set(url, gltf);
    return gltf;
  }

  /** placeholder visible mientras no hay mesh real */
  static placeholder(color: number, height = 1.6): THREE.Mesh {
    const geo = new THREE.CapsuleGeometry(0.3, height - 0.6, 4, 8);
    const mat = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = height / 2;
    return mesh;
  }
}
