import * as THREE from "three";
import { EffectLogic } from "./types";

export const ChristmasTreeEffect: EffectLogic = {
  getTargetPosition: (index, total, isPhoto, time) => {
    const p = new THREE.Vector3();

    // Cone shape
    const height = 35;
    const baseRadius = 12;

    // Normalized height (0 at bottom, 1 at top)
    // For photos, spiral up
    // For particles, fill the volume

    let h_norm, angle, r;

    if (isPhoto) {
      // Spiral
      h_norm = index / total; // 0..1
      angle = h_norm * Math.PI * 10; // 5 full rotations
      r = baseRadius * (1 - h_norm);
    } else {
      h_norm = Math.random();
      angle = Math.random() * Math.PI * 2;
      r = Math.sqrt(Math.random()) * baseRadius * (1 - h_norm);
    }

    const y = (h_norm - 0.5) * height;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;

    p.set(x, y, z);
    return p;
  },

  getParticleColor: (index, total, baseColor) => {
    const c = new THREE.Color();
    const rnd = Math.random();

    if (rnd > 0.95) {
      c.setHex(0xffff00); // Star/Lights
    } else if (rnd > 0.85) {
      c.setHex(0xff0000); // Ornaments
    } else if (rnd > 0.8) {
      c.setHex(0x0000ff); // Blue lights
    } else {
      // Green variations
      c.setHSL(0.3 + Math.random() * 0.1, 0.8, 0.2 + Math.random() * 0.3);
    }
    return c;
  },
};
