import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

// Carga de GLB optimizados con el pipeline de Fenix:
//   - KHR_texture_basisu (KTX2) -> KTX2Loader
//   - EXT_meshopt_compression   -> MeshoptDecoder
//   - KHR_mesh_quantization     -> nativo, sin decoder
export class AssetLoader {
  private readonly gltf: GLTFLoader;
  private readonly ktx2: KTX2Loader;
  private readonly cache = new Map<string, GLTF>();

  constructor(renderer: THREE.WebGLRenderer) {
    this.ktx2 = new KTX2Loader()
      // los .wasm/.js del transcoder Basis; cópialos a public/basis/ (ver nota abajo)
      .setTranscoderPath("/basis/")
      // OBLIGATORIO: KTX2 necesita saber qué formatos GPU soporta el dispositivo
      .detectSupport(renderer);

    this.gltf = new GLTFLoader()
      .setKTX2Loader(this.ktx2)
      .setMeshoptDecoder(MeshoptDecoder);
  }

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