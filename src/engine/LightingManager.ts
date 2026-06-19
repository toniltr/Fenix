import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";

export class LightingManager {
  private readonly hemi: THREE.HemisphereLight;
  private readonly sun: THREE.DirectionalLight;
  private readonly sky: Sky;

  constructor(
    private readonly scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
  ) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.5;

    this.sky = this.createSky();
    this.hemi = this.createHemi();
    this.sun = this.createSun();
  }

  private createSky(): Sky {
    const sky = new Sky();
    sky.scale.setScalar(450000);
    this.scene.add(sky);

    const u = sky.material.uniforms;
    u.turbidity.value = 10;
    u.rayleigh.value = 2;
    u.mieCoefficient.value = 0.005;
    u.mieDirectionalG.value = 0.8;

    return sky;
  }

  private createHemi(): THREE.HemisphereLight {
    const hemi = new THREE.HemisphereLight(0xddeeff, 0x223344, 0.6);
    this.scene.add(hemi);
    return hemi;
  }

  private createSun(): THREE.DirectionalLight {
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(5, 8, 4);
    this.scene.add(sun);
    return sun;
  }

  setHourLighting(hora: number): void {
    const h = ((hora % 24) + 24) % 24;
    const dayFactor = Math.max(0, Math.sin(((h - 6) / 12) * Math.PI));

    const elevation = -10 + dayFactor * 60;
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(180);
    const sunDir = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

    this.sky.material.uniforms.sunPosition.value.copy(sunDir);
    this.sun.position.copy(sunDir).multiplyScalar(50);

    const warm = new THREE.Color(0xff8844);
    const noon = new THREE.Color(0xffffff);
    this.sun.color.copy(warm.clone().lerp(noon, dayFactor));
    this.sun.intensity = 0.1 + dayFactor * 1.3;

    const night = new THREE.Color(0x1a2238);
    const sky = new THREE.Color(0xddeeff);
    this.hemi.color.copy(night.clone().lerp(sky, dayFactor));
    this.hemi.intensity = 0.15 + dayFactor * 0.6;
  }
}
