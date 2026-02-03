import * as THREE from "three";
import { EffectLogic } from "./types";

export const GalaxyEffect: EffectLogic = {
  getTargetPosition: (index, total, isPhoto, time) => {
    const p = new THREE.Vector3();

    // Spiral Galaxy Parameters
    const branches = 3;
    const radius = 30;
    const spin = 2; // rotations
    const randomness = isPhoto ? 0 : 2;

    // Calculate angle and radius
    // For photos, place them along the arms
    // For particles, scatter them

    const angleOffset = (Math.PI * 2) / branches;

    let t = index / total; // 0 to 1

    // Choose a branch
    const branchIndex = index % branches;
    const baseAngle = branchIndex * angleOffset;

    // Spiral factor
    const r = isPhoto
      ? (index / total) * radius
      : Math.pow(Math.random(), 2) * radius; // Concentrate near center
    const spiralAngle = spin * 2 * Math.PI * (r / radius);

    const angle =
      baseAngle + spiralAngle + (isPhoto ? 0 : (Math.random() - 0.5) * 0.5);

    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;

    // Y variation (thickness of galaxy disk)
    const y = isPhoto
      ? (Math.random() - 0.5) * 5
      : (Math.random() - 0.5) * (4 * (1 - r / radius) + 0.5);

    p.set(x, y, z);

    // Rotate slowly over time if desired here, or handle in main loop
    // Let's add specific time-based rotation here simply
    const timeRotation = time * 0.1;
    p.applyAxisAngle(new THREE.Vector3(0, 1, 0), timeRotation);

    return p;
  },

  getParticleColor: (index, total, baseColor) => {
    const c = new THREE.Color();
    // Galaxy colors: Deep blue, purple, pink, white center
    const r = Math.sqrt(index / total); // Radius proxy

    if (Math.random() > 0.9) {
      c.setHex(0xffffff); // Stars
    } else if (index % 3 === 0) {
      c.setHex(0x4b0082); // Indigo
    } else if (index % 3 === 1) {
      c.setHex(0x0000ff); // Blue
    } else {
      c.setHex(0xff00ff); // Pink
    }

    // Mix with base color
    c.lerp(baseColor, 0.2);
    return c;
  },
};
