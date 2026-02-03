import * as THREE from "three";
import { EffectLogic } from "./types";

export const StarSystemEffect: EffectLogic = {
  getTargetPosition: (index, total, isPhoto, time) => {
    const p = new THREE.Vector3();

    // Central Sun approx 10% of particles
    const isSun = index < total * 0.1;

    if (isSun && !isPhoto) {
      // Sun sphere
      const r = 4 * Math.cbrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      p.setFromSphericalCoords(r, phi, theta);
    } else {
      // Orbiting Disc/Rings
      // Distribute in rings
      const minR = 6;
      const maxR = 25;

      // Pick a radius based on index to create bands
      let r;
      if (isPhoto) {
        // Photos in specific orbit paths
        const orbitIndex = index % 3; // 3 main orbits
        r = 10 + orbitIndex * 5;
      } else {
        r = minR + Math.random() * (maxR - minR);
      }

      // Orbital speed depends on radius (Kepler-ish)
      const speed = 20 / r;
      const angle = index + time * speed * 0.1;

      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = (Math.random() - 0.5) * 0.5; // Flat disk

      p.set(x, y, z);

      // Tilted system
      p.applyAxisAngle(new THREE.Vector3(1, 0, 1).normalize(), 0.3);
    }

    return p;
  },

  getParticleColor: (index, total, baseColor) => {
    const c = new THREE.Color();
    // Sun vs Planets
    if (index < total * 0.1) {
      c.setHex(0xffaa00); // Sun orange/yellow
      c.lerp(new THREE.Color(0xff0000), Math.random() * 0.5);
    } else {
      // Planetary rings
      c.setHSL(0.5 + Math.random() * 0.2, 0.6, 0.6); // Cyan/Blueish
    }
    return c;
  },
};
