import * as THREE from "three";
import { EffectLogic } from "./types";

// Helper to get a stable random number from an index
const seededRandom = (index: number) => {
  const x = Math.sin(index + 12.3456) * 10000;
  return x - Math.floor(x);
};

// Colors for Jupiter bands
const BAND_COLORS = [
  new THREE.Color("#d4af37"), // Gold
  new THREE.Color("#a59c7b"), // Beige
  new THREE.Color("#6e4e37"), // Coffee
  new THREE.Color("#4b2e1e"), // Dark brown
  new THREE.Color("#cd853f"), // Light brown
  new THREE.Color("#f4a460"), // Sandy brown
  new THREE.Color("#c69e6b"), // Darker beige
  new THREE.Color("#8b4513"), // Saddle brown
  new THREE.Color("#e6c288"), // Light gold
];

// Galaxy Effect Implementation
// Galaxy Effect Implementation
export const GalaxyEffect: EffectLogic = {
  getTargetPosition: (index, total, isPhoto, time, isScattered) => {
    // 1. Separate into Planet Body (60%) and Rings (40%) - More rings for grandeur
    const rand = seededRandom(index);
    const isRing = rand > 0.6 || isPhoto;

    // Time-based rotation
    const rotationSpeed = 0.05;
    const angleOffset = time * rotationSpeed + rand * Math.PI * 2;

    if (isRing) {
      // --- RINGS ---
      const innerRadius = 26;
      const outerRadius = 50;

      // Distribution: concentrated more towards inner/middle for solid look
      // Power of 2 pushes points towards inner radius, Power of 0.5 pushes to outer
      // Let's use simple sqrt for uniform area, but maybe mix it up
      let rRand = seededRandom(index + 1);

      // Create distinct "grooves" or gaps in rings similar to Saturn/Jupiter rings
      // Gap at 0.3-0.35
      if (rRand > 0.3 && rRand < 0.35) rRand += 0.05;

      const radius =
        Math.sqrt(rRand) * (outerRadius - innerRadius) + innerRadius;

      const ringSpeed = 0.1 + (1.0 / radius) * 3.0;
      const theta = angleOffset * (isPhoto ? 0.5 : 1.0) + index * 0.001; // Slower spread

      const tilt = Math.PI / 6;

      // Thinner disc for sharper look
      let y = (seededRandom(index + 2) - 0.5) * 0.05; // Extremely thin
      let x = radius * Math.cos(theta);
      let z = radius * Math.sin(theta);

      if (isPhoto) {
        // Uniform distribution logic for photos
        // Radius: Uniform random between inner (26) and outer (50) minus padding
        const minR = 28;
        const maxR = 48;

        const rRandom = seededRandom(index + 100);
        const photoRadius = minR + rRandom * (maxR - minR);

        // Angle: Golden Angle distribution for uniform 360 coverage without patterns
        const phi = index * 2.39996; // Golden angle in radians
        const theta = phi - time * 0.05; // Orbit

        y = (seededRandom(index + 101) - 0.5) * 4.0; // Variance in height

        x = photoRadius * Math.cos(theta);
        z = photoRadius * Math.sin(theta);
      }

      const yTitl = y * Math.cos(tilt) - z * Math.sin(tilt);
      const zTilt = y * Math.sin(tilt) + z * Math.cos(tilt);

      return new THREE.Vector3(x, yTitl, zTilt);
    } else {
      // --- PLANET BODY (JUPITER) ---
      const planetRadius = 18;

      // Volumetric filling with SHARP EDGE:
      // Mix: 50% Surface (Shell), 50% Volume
      const isSurface = seededRandom(index + 10) > 0.5;

      let r;
      if (isSurface) {
        r = planetRadius * (0.99 + seededRandom(index + 3) * 0.01);
      } else {
        const rRatio = Math.pow(seededRandom(index + 3), 1 / 3);
        r = rRatio * planetRadius * 0.98;
      }

      // 2. Random direction
      // y is height (-r to r)
      const yNorm = seededRandom(index + 4) * 2 - 1;
      const y = yNorm * r;

      const radiusAtY = Math.sqrt(Math.max(0, r * r - y * y));

      const theta = angleOffset + index * 0.1;

      const x = radiusAtY * Math.sin(theta);
      const z = radiusAtY * Math.cos(theta);

      const tilt = Math.PI / 6;

      const yTitl = y * Math.cos(tilt) - z * Math.sin(tilt);
      const zTilt = y * Math.sin(tilt) + z * Math.cos(tilt);

      return new THREE.Vector3(x, yTitl, zTilt);
    }
  },

  getParticleColor: (index, total, baseColor) => {
    // 1. Separate into Main Color (80%) and Colorful Accents (20%)
    const rand = seededRandom(index + 10);

    // Colorful Accents (Gems)
    if (rand > 0.8) {
      // Generate consistent random hue based on index
      // Use a seeded random for hue (0-1)
      const hue = seededRandom(index + 20);
      // High saturation and reasonable lightness for neon/gem look
      const saturation = 0.8 + seededRandom(index + 21) * 0.2;
      const lightness = 0.5 + seededRandom(index + 22) * 0.3;

      return new THREE.Color().setHSL(hue, saturation, lightness);
    }

    // Main Mass (Base Color / Gold)
    // We use the passed baseColor (which is Gold by default now)
    const r = baseColor.r;
    const g = baseColor.g;
    const b = baseColor.b;

    // Subtle variation for the main mass
    const shift = (seededRandom(index + 11) - 0.5) * 0.1;

    // Sparkle highlights
    const isHighlight = seededRandom(index + 12) > 0.9;

    if (isHighlight) {
      return new THREE.Color(r, g, b).lerp(new THREE.Color(1, 1, 1), 0.6); // Sparkle
    }

    // Slight shift to avoid flat color
    return new THREE.Color(r + shift, g + shift, b + shift);
  },
};
