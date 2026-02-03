import * as THREE from "three";
import { EffectLogic } from "./types";

export const TimeTravelEffect: EffectLogic = {
  getTargetPosition: (index, total, isPhoto, time) => {
    const p = new THREE.Vector3();

    // Tunnel / Warp Speed
    // Cylinder along Z axis
    // Particles move towards camera (+Z) or away (-Z)

    // Radius of tunnel
    const radius = isPhoto ? 8 : 10 + Math.random() * 10;

    // Angle
    const angle = (index / total) * Math.PI * 2 * (isPhoto ? 1 : 10);

    // Depth position (Z)
    // We want them to loop endlessly
    const tunnelLength = 80;
    const speed = 15;

    // Initial Z spread
    const startZ = (index / total) * tunnelLength - tunnelLength / 2;

    // Animated Z
    // Move towards viewer (+Z)
    let z = (startZ + time * speed) % tunnelLength;
    if (z > tunnelLength / 2) z -= tunnelLength;

    // Twist the tunnel
    const twist = z * 0.1;
    const x = Math.cos(angle + twist + time) * radius;
    const y = Math.sin(angle + twist + time) * radius;

    p.set(x, y, z);

    return p;
  },

  getParticleColor: (index, total, baseColor) => {
    // Neon Cyberpunk colors
    const c = new THREE.Color();
    const rnd = Math.random();
    if (rnd > 0.6)
      c.setHex(0x00ffff); // Cyan
    else if (rnd > 0.3)
      c.setHex(0xff00ff); // Magenta
    else c.setHex(0xffffff); // White
    return c;
  },
};
