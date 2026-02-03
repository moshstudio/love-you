"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import {
  EffectComposer,
  Bloom,
  DepthOfField,
  Vignette,
} from "@react-three/postprocessing";
import * as THREE from "three";
import { FontLoader, TextGeometry, MeshSurfaceSampler } from "three-stdlib";
import TWEEN from "@tweenjs/tween.js";
import { Photo } from "./types";

// Register TextGeometry with R3F
extend({ TextGeometry });

// --- Configuration ---
const PARTICLE_COUNT = 12000; // Reduced for performance optimization
// Using jsdelivr for better reliability in China and globally
const FONT_URL =
  "https://cdn.jsdelivr.net/npm/three/examples/fonts/helvetiker_bold.typeface.json";
const GOLD_COLOR = new THREE.Color("#FFD700");
const WARP_SPEED_MULTIPLIER = 2.0;

// Fireworks Constants
const FIREWORKS_COUNT = 5; // Simultaneous fireworks
const PARTICLES_PER_FIREWORK = 400; // Adjusted for performance
const FIREWORK_GRAVITY = -0.025; // More realistic drop
const FIREWORK_DRAG = 0.91; // Air resistance: Fast start, quick slow down
const FIREWORK_COLORS = [
  new THREE.Color("#FFD700"), // Gold
  new THREE.Color("#FDB931"), // Light Gold
  new THREE.Color("#FFFFFF"), // White Sparkle
  new THREE.Color("#FF4500"), // Orange Red (warmth)
  new THREE.Color("#C0C0C0"), // Silver (for contrast)
];

// Gallery Constants
// Gallery Constants
const GALLERY_PARTICLE_COUNT = 10000; // Optimized count for performance
const PARTICLE_SIZE = 0.6;
const CANVAS_WIDTH = 300;
const MORPH_DURATION = 1500;
const WORLD_SCALE = 85.0; // Scale to fill ~60% of screen at z=0 with camera z=60

// --- Helper Functions ---

// Generate random points consistently across the surface of the text
const generateTextParticles = (
  text: string,
  font: any,
  size: number,
  activeRatio: number = 0.75, // 75% particles form text, 25% remain scattered
  scatterSpread: number = 60,
): Float32Array => {
  const geometry = new TextGeometry(text, {
    font: font,
    size: size,
    height: 0.5,
    curveSegments: 32, // High curve segments for smooth edges
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.02,
    bevelOffset: 0,
    bevelSegments: 4,
  } as any);

  geometry.center();

  // Use MeshSurfaceSampler for uniform distribution
  // This solves the issue of "missing chunks" caused by uneven vertex distribution in raw geometry
  const material = new THREE.MeshBasicMaterial();
  const mesh = new THREE.Mesh(geometry, material);

  const sampler = new MeshSurfaceSampler(mesh).build();

  const particles = new Float32Array(PARTICLE_COUNT * 3);
  const tempPosition = new THREE.Vector3();

  // Determine split
  const activeCount = Math.floor(PARTICLE_COUNT * activeRatio);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    if (i < activeCount) {
      // Active particles form the text
      sampler.sample(tempPosition);
      particles[i * 3] = tempPosition.x;
      particles[i * 3 + 1] = tempPosition.y;
      particles[i * 3 + 2] = tempPosition.z;
    } else {
      // Inactive particles remain scattered (background ambience)
      particles[i * 3] = (Math.random() - 0.5) * scatterSpread;
      particles[i * 3 + 1] = (Math.random() - 0.5) * scatterSpread;
      particles[i * 3 + 2] = (Math.random() - 0.5) * scatterSpread;
    }
  }

  // Cleanup
  geometry.dispose();
  material.dispose();

  return particles;
};

// Generate a random explosion/cloud field (Keep this helper for IntroScene)
const generateRandomParticles = (spread: number = 50): Float32Array => {
  const particles = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles[i * 3] = (Math.random() - 0.5) * spread;
    particles[i * 3 + 1] = (Math.random() - 0.5) * spread;
    particles[i * 3 + 2] = (Math.random() - 0.5) * spread;
  }
  return particles;
};

// Generate a random explosion/cloud field
// --- Image Processing Helpers ---

// Load image and get pixel data as particles
const getImageParticleData = (
  url: string,
): Promise<{
  positions: Float32Array;
  colors: Float32Array;
  ratio: number;
}> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    // Use proxy to avoid CORS issues with canvas data extraction
    img.src = `/api/image-proxy?url=${encodeURIComponent(url)}`;
    img.onload = () => {
      const ratio = img.width / img.height;

      // Scale canvas to maintain aspect ratio but limit total pixels
      let w = CANVAS_WIDTH;
      let h = Math.floor(w / ratio);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No context"));
        return;
      }

      // Draw image to canvas
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h).data;

      // Collection arrays
      const posArray: number[] = [];
      const colArray: number[] = [];

      // Scan pixels
      // Center the grid: -width/2 to +width/2
      const worldScale = WORLD_SCALE;

      // Process in chunks to avoid blocking the main thread
      const totalPixels = w * h;
      const CHUNK_SIZE = 4000; // Process 4000 pixels per frame
      let pixelIndex = 0;

      const processChunk = () => {
        const startTime = performance.now();

        while (pixelIndex < totalPixels && performance.now() - startTime < 8) {
          const y = Math.floor(pixelIndex / w);
          const x = pixelIndex % w;

          const idx = pixelIndex * 4;
          const r = imageData[idx];
          const g = imageData[idx + 1];
          const b = imageData[idx + 2];
          const a = imageData[idx + 3];

          // Only keep visible pixels
          if (a > 128) {
            // 3D Position
            // Normalize x,y to -0.5 to 0.5
            const nx = x / w - 0.5;
            const ny = 0.5 - y / h; // Flip Y because canvas 0 is top

            posArray.push(nx * worldScale);
            posArray.push(ny * (worldScale / ratio));
            posArray.push(0); // Flat z initially

            // Color: Boost brightness for Bloom
            colArray.push(r / 255);
            colArray.push(g / 255);
            colArray.push(b / 255);
          }

          pixelIndex++;
        }

        if (pixelIndex < totalPixels) {
          // Continue in next frame/tick
          setTimeout(processChunk, 0);
        } else {
          // Finished processing, proceed to shuffle and buffer creation
          finalizeData();
        }
      };

      const finalizeData = () => {
        // Convert to fixed size Float32Array
        // We shuffle the valid indices first to avoid "scanning" effect during morph
        const indices = Array.from(
          { length: posArray.length / 3 },
          (_, i) => i,
        );
        // Fisher-Yates Shuffle indices
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }

        const fPos = new Float32Array(GALLERY_PARTICLE_COUNT * 3);
        const fCol = new Float32Array(GALLERY_PARTICLE_COUNT * 3);

        // Fill buffers
        for (let i = 0; i < GALLERY_PARTICLE_COUNT; i++) {
          const ptr = i * 3;
          if (i < indices.length) {
            const srcIdx = indices[i] * 3;
            fPos[ptr] = posArray[srcIdx];
            fPos[ptr + 1] = posArray[srcIdx + 1];
            fPos[ptr + 2] = posArray[srcIdx + 2];

            fCol[ptr] = colArray[srcIdx];
            fCol[ptr + 1] = colArray[srcIdx + 1];
            fCol[ptr + 2] = colArray[srcIdx + 2];
          } else {
            // Hide excess particles
            fPos[ptr] = 99999;
            fPos[ptr + 1] = 99999;
            fPos[ptr + 2] = 99999;

            fCol[ptr] = 0;
            fCol[ptr + 1] = 0;
            fCol[ptr + 2] = 0;
          }
        }

        resolve({ positions: fPos, colors: fCol, ratio });
      };

      // Start processing
      processChunk();
    };
    img.onerror = reject;
  });
};

// --- Components ---

const IntroScene = ({ onSequenceEnd }: { onSequenceEnd?: () => void }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const { camera } = useThree();
  const [font, setFont] = useState<any>(null);
  const [status, setStatus] = useState<string>("INITIALIZING...");

  // Mutable refs for animation state to avoid re-renders
  const currentPositions = useRef<Float32Array>(generateRandomParticles(100));
  const targetPositions = useRef<Float32Array | null>(null);
  const srcPositions = useRef<Float32Array | null>(null);

  // Warp efffect state
  const isWarping = useRef(false);
  const warpSpeed = useRef(0);

  const tweens = useRef(new TWEEN.Group()); // Use local tween group to avoid global state issues

  // Load Font
  useEffect(() => {
    const loader = new FontLoader();
    console.log("Starts loading font...", FONT_URL);
    loader.load(
      FONT_URL,
      (loadedFont) => {
        console.log("Font loaded successfully!");
        setFont(loadedFont);
      },
      (progress) => {
        // no-op
      },
      (err) => {
        console.error("Font loading failed:", err);
        setStatus("FONT ERROR");
      },
    );

    // Cleanup tweens on unmount
    return () => {
      tweens.current.removeAll();
    };
  }, []);

  // Pre-calculate particle data to avoid frame drops during animation
  const precomputedParticles = useRef<Record<string, Float32Array>>({});

  useEffect(() => {
    if (!font) return;

    // Generate particles for all sequence steps in background
    const sequence = ["5", "4", "3", "2", "1", "2026"];

    // Use setTimeout chain to yield to main thread between generations
    const generateNext = (index: number) => {
      if (index >= sequence.length) return;

      const text = sequence[index];
      // Check if already generated
      if (precomputedParticles.current[text]) {
        generateNext(index + 1);
        return;
      }

      setTimeout(() => {
        const size = text.length > 3 ? 15 : 20;
        precomputedParticles.current[text] = generateTextParticles(
          text,
          font,
          size,
        );
        generateNext(index + 1);
      }, 50); // Small delay between generations
    };

    generateNext(0);
  }, [font]);

  // Particle Morphing Logic
  const morphTo = useCallback(
    (targetData: Float32Array, duration: number = 1000) => {
      // Save current state as source
      srcPositions.current = Float32Array.from(currentPositions.current);
      targetPositions.current = targetData;

      const tweenState = { t: 0 };
      // Create tween on local group
      new TWEEN.Tween(tweenState, tweens.current)
        .to({ t: 1 }, duration)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(() => {
          if (!srcPositions.current || !targetPositions.current) return;

          const output = currentPositions.current;
          const src = srcPositions.current;
          const tgt = targetPositions.current;

          for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
            // Lerp
            output[i] = src[i] + (tgt[i] - src[i]) * tweenState.t;
          }

          if (pointsRef.current) {
            pointsRef.current.geometry.attributes.position.needsUpdate = true;
          }
        })
        .start();
    },
    [],
  );

  // Warp Sequence Logic
  const triggerWarp = useCallback(() => {
    isWarping.current = true;
    setStatus("WARP ENGAGED");
    console.log("Triggering Warp Sequence");

    // 1. Camera Fly-through
    const camTarget = { z: -100, fov: 100 };

    new TWEEN.Tween(camera.position, tweens.current)
      .to({ z: camTarget.z }, 4000)
      .easing(TWEEN.Easing.Exponential.In)
      .start();

    // 2. Increase FOV
    new TWEEN.Tween(camera, tweens.current)
      .to({ fov: 100 }, 3000)
      .easing(TWEEN.Easing.Cubic.In)
      .onUpdate(() => camera.updateProjectionMatrix())
      .start();

    // 3. Ramp up warp speed
    new TWEEN.Tween({ s: 0 }, tweens.current)
      .to({ s: 5 }, 2000)
      .easing(TWEEN.Easing.Exponential.In)
      .onUpdate((obj) => {
        warpSpeed.current = obj.s;
      })
      .start();

    if (onSequenceEnd) setTimeout(onSequenceEnd, 4000);
  }, [camera, onSequenceEnd]);

  // Main Sequence Controller
  useEffect(() => {
    if (!font) {
      console.log("Waiting for font...");
      return;
    }

    console.log("Starting Sequence...");
    setStatus("READY");

    // Define timeline
    const numbers = ["5", "4", "3", "2", "1", "2026"];
    let step = 0;

    const runStep = () => {
      if (step >= numbers.length) {
        // End of numbers, trigger warp
        console.log("Ending numbers, triggering warp...");
        setTimeout(triggerWarp, 1000);
        return;
      }

      const text = numbers[step];
      console.log("Morphing to:", text);
      const size = text.length > 3 ? 15 : 20;

      setStatus(`SEQUENCE: ${text}`);

      // Use precomputed data if available, otherwise fallback to sync generation (shouldn't happen if precalc works)
      let target = precomputedParticles.current[text];
      if (!target) {
        console.warn(
          `Precomputed particle data missing for ${text}, generating synchronously.`,
        );
        target = generateTextParticles(text, font, size);
        precomputedParticles.current[text] = target;
      }

      morphTo(target, 800);

      const delay = 1200; // Time to hold each number
      step++;
      setTimeout(runStep, delay);
    };

    // Wait 1s then start
    setTimeout(runStep, 1000);
  }, [font, morphTo, triggerWarp]);

  // Frame Loop
  useFrame((state) => {
    // Update local tweens
    tweens.current.update();

    if (pointsRef.current) {
      const positions = pointsRef.current.geometry.attributes.position
        .array as Float32Array;

      // Idle Animation (Floating)
      if (!isWarping.current) {
        const time = state.clock.getElapsedTime();
        // Rotate entire cloud slowly
        pointsRef.current.rotation.y = Math.sin(time * 0.1) * 0.1;
        pointsRef.current.rotation.x = Math.cos(time * 0.15) * 0.1;
      } else {
        // WARP EFFECTS
        // Stretch particles along Z axis to simulate speed lines
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const idx = i * 3;
          // Move particles towards camera (or rather, camera moves past them, but we add trail effect)
          // We'll stretch them by adding random length to Z
          if (Math.random() > 0.5) {
            positions[idx + 2] += warpSpeed.current * (Math.random() + 0.5);
          }
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
      }
    }
  });

  // Initial Geometry
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(currentPositions.current, 3),
    );
    return geo;
  }, []);

  // Circular Particle Texture
  const sprite = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255, 255, 255, 1)");
      grad.addColorStop(0.5, "rgba(255, 215, 0, 0.5)"); // Gold tint
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  return (
    <>
      <points
        ref={pointsRef}
        geometry={geometry}
      >
        <pointsMaterial
          size={0.4}
          map={sprite || undefined}
          transparent={true}
          alphaTest={0.01}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          // Boost color values manually for bloom since PointsMaterial doesn't support emissive
          color={new THREE.Color(10, 8, 0)}
        />
      </points>
      {/* Dynamic light following camera or center */}
      <spotLight
        position={[0, 0, 50]}
        intensity={1}
        color='#FFD700'
      />
    </>
  );
};

// --- Fireworks Scene ---
const FireworksScene = ({
  onComplete,
  continuous = false,
}: {
  onComplete?: () => void;
  continuous?: boolean;
}) => {
  const { camera } = useThree();
  const pointsRef = useRef<THREE.Points>(null);

  // State for particles
  // Each particle: x, y, z, vx, vy, vz, life (0-1), colorR, colorG, colorB
  // State for particles
  // Each particle: x, y, z, vx, vy, vz, life (0-1), colorR, colorG, colorB
  const particleCount = 10000; // Optimized for improved frame rate
  const data = useMemo(() => new Float32Array(particleCount * 10), []);

  // Initialize Geometry with useMemo to ensure attributes are present on first render
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(particleCount * 3), 3),
    );
    geo.setAttribute(
      "aColor",
      new THREE.BufferAttribute(new Float32Array(particleCount * 3), 3),
    );
    geo.setAttribute(
      "size",
      new THREE.BufferAttribute(new Float32Array(particleCount).fill(0), 1),
    );
    return geo;
  }, []);

  // Active fireworks management
  const fireworks = useRef<any[]>([]);
  const frameCount = useRef(0);
  const isEnding = useRef(false);

  // Reset Camera Logic
  useEffect(() => {
    // Smoothly reset camera from warp position if needed, or just set it
    // Ensure we are in a clean state
    camera.position.set(0, 0, 80);
    camera.lookAt(0, 0, 0);

    // Explicitly reset rotation that might have been modified by IntroScene
    camera.rotation.set(0, 0, 0);

    if ((camera as THREE.PerspectiveCamera).fov) {
      (camera as THREE.PerspectiveCamera).fov = 60;
      camera.updateProjectionMatrix();
    }

    // Timer to end the fireworks sequence (only if NOT continuous)
    let timer: NodeJS.Timeout;
    if (!continuous) {
      timer = setTimeout(() => {
        isEnding.current = true;
        if (onComplete) setTimeout(onComplete, 2000); // 2s fade out
      }, 5000); // Reduced to 5s for faster flow to gallery
    }

    return () => clearTimeout(timer);
  }, [camera, onComplete, continuous]);

  // Texture
  const sprite = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, "rgba(255, 255, 255, 1)"); // Hot center
      grad.addColorStop(0.15, "rgba(255, 220, 100, 1)"); // Bright gold core
      grad.addColorStop(0.4, "rgba(255, 200, 0, 0.4)"); // Gold glow
      grad.addColorStop(1, "rgba(255, 100, 0, 0)"); // Fade out
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 32);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  // Helper to create random firework
  const launchFirework = useCallback((isInitial = false) => {
    const type =
      Math.random() > 0.6 ? "RING" : Math.random() > 0.5 ? "STAR" : "SPHERE";
    const scale = 0.8 + Math.random() * 1.2;
    const color =
      FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];

    // Random axis for Ring (if needed)
    // We can just store a random rotation or axis
    const axis = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5,
    ).normalize();

    return {
      x: (Math.random() - 0.5) * 120, // Wider x spread to frame the gallery
      y: -80, // ALWAYS start from bottom
      z: -30 - Math.random() * 50, // STRICTLY BEHIND GALLERY (Gallery is at 0, Fireworks -30 to -80)
      vx: (Math.random() - 0.5) * 0.2,
      vy: 0.9 + Math.random() * 0.5, // HIGHER launch speed (was 0.7 + 0.4)
      vz: (Math.random() - 0.5) * 0.2,
      color,
      timer: 0, // ALWAYS start at 0 to allow rise
      explodeTime: 80 + Math.random() * 50, // Longer rise time for higher altitude
      type,
      scale,
      axis,
    };
  }, []);

  // Initialization
  useEffect(() => {
    // Clear data
    data.fill(0);

    // Create an initial burst immediately so the user sees something!
    const initialBurstCount = 5;
    for (let b = 0; b < initialBurstCount; b++) {
      fireworks.current.push(launchFirework(true));
    }
  }, [data, launchFirework]);

  // Physics Loop
  useFrame((state, delta) => {
    frameCount.current++;
    const t = state.clock.getElapsedTime();

    // 1. Launch new fireworks
    // If continuous, keep launching forever. If not, stop when ending.
    if ((continuous || !isEnding.current) && Math.random() < 0.05) {
      fireworks.current.push(launchFirework(false));
    }

    // 2. Update Rockets (Rising)
    // We render rockets as a single bright particle or trail.
    // To simplify, we can just use the same particle system but 'reserve' some indices or just use a helper.
    // For visual simplicity, let's just make them invisible until they explode, or use a separate mesh.
    // Actually, drawing a line or a bright dot is fine.
    // Let's just manage explosions for the Main Particle System to keep it performant.

    // Process active fireworks (rockets)
    for (let i = fireworks.current.length - 1; i >= 0; i--) {
      const fw = fireworks.current[i];
      fw.x += fw.vx;
      fw.y += fw.vy;
      fw.z += fw.vz;
      fw.vy -= 0.005; // Gravity on rocket
      fw.timer++;

      // --- SPAWN TRAIL PARTICLES ---
      // 1. Head Particle (Bright, moving with rocket roughly - actually just spawn a fresh one for visual continuity)
      // 2. Trail Particles (falling behind)
      let particlesToSpawn = 3; // 1 head, 2 trail
      let spawnedCount = 0;

      // limit search
      for (
        let j = 0;
        j < particleCount && spawnedCount < particlesToSpawn;
        j++
      ) {
        // Use a randomized start index to avoid clumping usage at start of array
        // Simple linear or random probe. Let's scan.
        const probeIdx = (frameCount.current + j) % particleCount; // Simple rotation to distribute usage
        const idx = probeIdx * 10;

        if (data[idx + 6] <= 0) {
          // Found dead particle
          spawnedCount++;

          const isHead = spawnedCount === 1;

          // Position: Rocket position + slight jitter
          data[idx] = fw.x + (Math.random() - 0.5) * 0.3;
          data[idx + 1] = fw.y + (Math.random() - 0.5) * 0.3;
          data[idx + 2] = fw.z + (Math.random() - 0.5) * 0.3;

          if (isHead) {
            // "Head" - moves up slightly to lead, or just bright
            data[idx + 3] = (Math.random() - 0.5) * 0.05;
            data[idx + 4] = fw.vy * 0.5; // Inherit some upward momentum
            data[idx + 5] = (Math.random() - 0.5) * 0.05;
            data[idx + 6] = 0.15; // Very short life, just to render the "dot" of the rocket

            // White/Gold Core
            data[idx + 7] = 1.0;
            data[idx + 8] = 0.9;
            data[idx + 9] = 0.5;
          } else {
            // "Trail" - Drag/Gravity
            data[idx + 3] = (Math.random() - 0.5) * 0.1;
            data[idx + 4] = -0.02 - Math.random() * 0.05; // Falling slightly
            data[idx + 5] = (Math.random() - 0.5) * 0.1;
            data[idx + 6] = 0.5 + Math.random() * 0.3; // Medium life

            // Trail Color: Dimmer gold/orange
            data[idx + 7] = fw.color.r;
            data[idx + 8] = fw.color.g * 0.8;
            data[idx + 9] = fw.color.b;
          }
        }
      }

      if (fw.timer >= fw.explodeTime) {
        // EXPLODE!
        const count = PARTICLES_PER_FIREWORK;
        // Find free particles
        let spawned = 0;

        for (let j = 0; j < particleCount && spawned < count; j++) {
          // Linear scan from random offset
          const probeIdx = (frameCount.current * 13 + j) % particleCount;
          const idx = probeIdx * 10;

          if (data[idx + 6] <= 0) {
            // Life
            // Spawn particle j
            data[idx] = fw.x;
            data[idx + 1] = fw.y;
            data[idx + 2] = fw.z;

            // Explosion Types
            const type = fw.type || "SPHERE";
            const scale = fw.scale || 1.0;

            // Base speed - Faster for bigger burst in open space
            const speedBase = (0.8 + Math.random() * 0.8) * scale;
            const speed = speedBase * (Math.random() < 0.1 ? 2.0 : 1.2); // Faster initial burst
            let vx = 0,
              vy = 0,
              vz = 0;

            if (type === "RING") {
              // 1. Create a IMPERFECT ring in XY plane
              const angle = Math.random() * Math.PI * 2;
              // Add variance to radius so it's not a laser-thin line
              const ringR = speedBase * (1.75 + Math.random() * 0.45);

              const pX = Math.cos(angle);
              const pY = Math.sin(angle);
              const pZ = (Math.random() - 0.5) * 0.2; // Jitter z for thickness

              // 2. Rotate using axis
              const rotX = fw.axis.x * Math.PI * 2;
              const rotY = fw.axis.y * Math.PI * 2;

              let y1 = pY * Math.cos(rotX) - pZ * Math.sin(rotX);
              let z1 = pY * Math.sin(rotX) + pZ * Math.cos(rotX);
              let x1 = pX;

              let z2 = z1 * Math.cos(rotY) - x1 * Math.sin(rotY);
              let x2 = z1 * Math.sin(rotY) + x1 * Math.cos(rotY);
              let y2 = y1;

              vx = x2 * ringR;
              vy = y2 * ringR;
              vz = z2 * ringR;
            } else if (type === "STAR") {
              // Star burst - discrete rays
              const dirs = [
                [1, 0, 0],
                [-1, 0, 0],
                [0, 1, 0],
                [0, -1, 0],
                [0, 0, 1],
                [0, 0, -1],
                [1, 1, 1],
                [1, 1, -1],
                [1, -1, 1],
                [1, -1, -1],
                [-1, 1, 1],
                [-1, 1, -1],
                [-1, -1, 1],
                [-1, -1, -1],
              ];
              // Consistent ray picking
              const rayIdx = Math.floor(Math.random() * dirs.length);
              const dir = dirs[rayIdx];

              // Higher speed consistency for sharp rays
              const raySpeed = speedBase * (1.2 + Math.random() * 0.2); // Less random variance

              vx = dir[0] * raySpeed;
              vy = dir[1] * raySpeed;
              vz = dir[2] * raySpeed;

              // Minimal jitter
              vx += (Math.random() - 0.5) * 0.05;
              vy += (Math.random() - 0.5) * 0.05;
              vz += (Math.random() - 0.5) * 0.05;
            } else {
              // SPHERE (Default) - Uniform
              const u = Math.random();
              const v = Math.random();
              const theta = 2 * Math.PI * u;
              const phi = Math.acos(2 * v - 1);
              const sinPhi = Math.sin(phi);
              const r = speedBase * (0.8 + Math.random() * 0.4);

              vx = r * sinPhi * Math.cos(theta);
              vy = r * Math.cos(phi);
              vz = r * sinPhi * Math.sin(theta);
            }

            data[idx + 3] = vx;
            data[idx + 4] = vy;
            data[idx + 5] = vz;

            // Add initial rocket momentum? (Reduced to keep shapes pure)
            data[idx + 4] += fw.vy * 0.1;

            // LIFESPAN INCREASED
            // Lifetime: 3.0 to 4.5 seconds
            data[idx + 6] = 1.0;

            // Color
            const isBright = Math.random() < 0.2;
            data[idx + 7] = isBright ? 1.0 : fw.color.r;
            data[idx + 8] = isBright ? 1.0 : fw.color.g;
            data[idx + 9] = isBright ? 0.8 : fw.color.b;

            spawned++;
          }
        }
        // Remove rocket
        fireworks.current.splice(i, 1);
      }
    }

    // 3. Update Particles
    // 3. Update Particles
    const positions = geometry.attributes.position.array as Float32Array;
    const colors = geometry.attributes.aColor.array as Float32Array;
    const sizes = geometry.attributes.size.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 10;
      if (data[idx + 6] > 0) {
        // Physics

        // VARIABLE DRAG: Simulate different particle masses.
        // Heavier particles (lower index mod) retain momentum longer.
        // Lighter particles slow down faster.
        const particleDrag = FIREWORK_DRAG - (i % 10) * 0.003;

        data[idx + 3] *= particleDrag; // vx
        data[idx + 4] *= particleDrag; // vy
        data[idx + 5] *= particleDrag; // vz

        // Correct Gravity Application:
        // Gravity should be an additive force per frame, NOT dampened by drag in the same way (or apply after drag)
        // Previous: val *= drag; val += grav; -> correct, but grav was too small.
        // Let's boost gravity to make them ARC properly.
        data[idx + 4] += -0.04; // Stronger Gravity

        // WIND FORCE: Varying slightly over time and height
        // Wind function: sin(t * 0.5) + cos(t * 0.2)
        const windX = (Math.sin(t * 0.5) + Math.cos(t * 1.5) * 0.5) * 0.002;
        const windZ = Math.cos(t * 0.3) * 0.001;

        data[idx + 3] += windX;
        data[idx + 5] += windZ;

        data[idx] += data[idx + 3];
        data[idx + 1] += data[idx + 4];
        data[idx + 2] += data[idx + 5];

        // Varied Decay: Some burn out fast, some linger
        data[idx + 6] -= 0.001 + Math.random() * 0.004;

        // Update Buffer
        positions[i * 3] = data[idx];
        positions[i * 3 + 1] = data[idx + 1];
        positions[i * 3 + 2] = data[idx + 2];

        colors[i * 3] = data[idx + 7];
        colors[i * 3 + 1] = data[idx + 8];
        colors[i * 3 + 2] = data[idx + 9];

        // Size pulsate or fade
        // Pop in effect: Start small, grow fast, then slow shrink
        const life = data[idx + 6];
        let size = 0.5 + Math.random() * 0.5;
        if (life > 0.9) size = (1.0 - life) * 10.0; // Pop in
        if (life < 0.2) size *= life * 5.0; // Fade out

        sizes[i] = size;
      } else {
        // Hide
        sizes[i] = 0;
        positions[i * 3] = 99999; // Move out of view
      }
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aColor.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
    >
      <shaderMaterial
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors={false} // We manage attributes manually
        uniforms={{
          pointTexture: { value: sprite },
        }}
        vertexShader={`
                attribute float size;
                attribute vec3 aColor; 
                varying vec3 vColor;
                void main() {
                    vColor = aColor;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    // INCREASE SIZE SCALING: 600.0 instead of 300.0
                    gl_PointSize = size * (600.0 / -mvPosition.z); 
                    gl_Position = projectionMatrix * mvPosition;
                }
            `}
        fragmentShader={`
                uniform sampler2D pointTexture;
                varying vec3 vColor;
                void main() {
                    // Soften edges further in shader
                    vec4 texColor = texture2D(pointTexture, gl_PointCoord);
                    gl_FragColor = vec4(vColor, 1.0) * texColor;
                    // Boost brightness output for bloom
                    gl_FragColor.rgb *= 2.0; 
                }
            `}
      />
    </points>
  );
};

// --- UI Overlay ---
const UIOverlay = () => {
  return (
    <div className='absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-8'>
      {/* Top Header */}
      {/* Top Header Removed to avoid conflict with page header */}
      <div />

      {/* Decorative Lines */}
      <div className='absolute top-1/2 left-8 w-[1px] h-32 bg-gradient-to-b from-transparent via-[#FFD700]/50 to-transparent' />
      <div className='absolute top-1/2 right-8 w-[1px] h-32 bg-gradient-to-b from-transparent via-[#FFD700]/50 to-transparent' />

      {/* Bottom Footer */}
      <div className='w-full flex justify-center pb-8'>
        <div className='relative px-8 py-3 overflow-hidden rounded-lg backdrop-blur-md bg-black/40 border border-[#FFD700]/10 group'>
          <span className='text-[#FFD700] font-light tracking-[0.3em] text-sm group-hover:text-white transition-colors duration-500'>
            IMMERSIVE EXPERIENCE
          </span>
          <div className='absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#FFD700] to-transparent opacity-50' />
        </div>
      </div>
    </div>
  );
};

// --- Main Content Placeholder ---
// --- Main Content Placeholder ---
// --- Particle Gallery Component ---
const ParticleGallery = ({
  photos,
  currentIndex,
}: {
  photos: Photo[];
  currentIndex: number;
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  // Removed borderRef
  const imagePlaneRef = useRef<THREE.Mesh>(null);
  const tweens = useRef(new TWEEN.Group());

  // Cache for loaded particle data
  const cache = useRef<
    Map<
      string,
      { positions: Float32Array; colors: Float32Array; ratio: number }
    >
  >(new Map());

  // State buffers
  const currentPositions = useRef<Float32Array>(
    new Float32Array(GALLERY_PARTICLE_COUNT * 3).fill(0),
  );
  const currentColors = useRef<Float32Array>(
    new Float32Array(GALLERY_PARTICLE_COUNT * 3).fill(0),
  );
  const activeRatio = useRef(16 / 9); // Track aspect ratio for border

  // Real Image State
  const [activeTexture, setActiveTexture] = useState<THREE.Texture | null>(
    null,
  );
  const imageOpacity = useRef({ val: 0 }); // Use ref for tweening

  // Initialize Geometry
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(GALLERY_PARTICLE_COUNT * 3);
    const col = new Float32Array(GALLERY_PARTICLE_COUNT * 3);

    // Initial random cloud
    for (let i = 0; i < GALLERY_PARTICLE_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50; // Z spread

      col[i * 3] = 1;
      col[i * 3 + 1] = 0.8;
      col[i * 3 + 2] = 0; // Gold
    }

    currentPositions.current.set(pos);
    currentColors.current.set(col);

    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return geo;
  }, []);

  // Morph Function
  const morphToImage = useCallback(
    async (index: number) => {
      const photo = photos[index];
      if (!photo) return;

      // 1. Fade Out Old Image (if any)
      // We do this immediately
      new TWEEN.Tween(imageOpacity.current, tweens.current)
        .to({ val: 0 }, 500)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
          if (imagePlaneRef.current) {
            // @ts-ignore
            imagePlaneRef.current.material.opacity = imageOpacity.current.val;
          }
        })
        .start();

      // Check cache or load
      let data = cache.current.get(photo.url);
      if (!data) {
        try {
          data = await getImageParticleData(photo.url);
          cache.current.set(photo.url, data);
        } catch (e) {
          console.error("Failed to load particle image", e);
          return;
        }
      }

      if (!data) return;

      // Transition Logic
      const sourcePos = Float32Array.from(currentPositions.current);
      const sourceCol = Float32Array.from(currentColors.current);
      const targetPos = data.positions;
      const targetCol = data.colors;
      const targetRatio = data.ratio;

      // Tween Border aspect ratio
      new TWEEN.Tween({ ratio: activeRatio.current }, tweens.current)
        .to({ ratio: targetRatio }, MORPH_DURATION)
        .easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate((obj) => {
          activeRatio.current = obj.ratio;
          // Border updates in its own useFrame via ref
        })
        .start();

      const tweenState = { t: 0 };

      // Particle Tween
      new TWEEN.Tween(tweenState, tweens.current)
        .to({ t: 1 }, MORPH_DURATION)
        .easing(TWEEN.Easing.Exponential.InOut)
        .onUpdate(() => {
          const t = tweenState.t;
          // Perform morph with noise
          const noiseAmount = Math.sin(t * Math.PI) * 5.0;

          const posAttr = pointsRef.current?.geometry.attributes.position;
          const colAttr = pointsRef.current?.geometry.attributes.color;

          if (posAttr && colAttr) {
            const posArr = posAttr.array as Float32Array;
            const colArr = colAttr.array as Float32Array;

            for (let i = 0; i < GALLERY_PARTICLE_COUNT; i++) {
              const idx = i * 3;

              // Hide hidden particles
              const hiddenTarget = targetPos[idx] > 9000;
              const hiddenSource = sourcePos[idx] > 9000;

              if (hiddenTarget && hiddenSource) {
                posArr[idx] = 99999;
                continue;
              }

              const sx = sourcePos[idx];
              const sy = sourcePos[idx + 1];
              const sz = sourcePos[idx + 2];

              const tx = targetPos[idx];
              const ty = targetPos[idx + 1];
              const tz = targetPos[idx + 2];

              // Interpolate
              posArr[idx] = sx + (tx - sx) * t;
              posArr[idx + 1] = sy + (ty - sy) * t;
              posArr[idx + 2] = sz + (tz - sz) * t;

              // Noise
              if (t > 0.01 && t < 0.99) {
                const rnd = Math.sin(i * 12.9898) * 43758.5453;
                const rx = rnd - Math.floor(rnd) - 0.5;
                const ry = Math.sin(rnd) - 0.5;
                const rz = Math.cos(rnd) - 0.5;

                posArr[idx] += rx * noiseAmount;
                posArr[idx + 1] += ry * noiseAmount;
                posArr[idx + 2] += rz * noiseAmount;
              }

              // Color
              colArr[idx] =
                sourceCol[idx] + (targetCol[idx] - sourceCol[idx]) * t;
              colArr[idx + 1] =
                sourceCol[idx + 1] +
                (targetCol[idx + 1] - sourceCol[idx + 1]) * t;
              colArr[idx + 2] =
                sourceCol[idx + 2] +
                (targetCol[idx + 2] - sourceCol[idx + 2]) * t;
            }

            posAttr.needsUpdate = true;
            colAttr.needsUpdate = true;
          }
        })
        .onComplete(() => {
          // Final snap
          currentPositions.current.set(targetPos);
          currentColors.current.set(targetCol);

          // FADE IN REAL IMAGE
          // Load texture first? Or reused from proxy?
          // We can just load it via TextureLoader. Browser should cache from the img tag used in analysis?
          // Maybe not if proxy used differently. But safer to just load.
          const loader = new THREE.TextureLoader();
          // Use proxy for texture loader too if needed, but for display regular URL might be blocked by canvas taint
          // But we are just displaying in WebGL, usually fine if not reading pixels.
          // However, for consistency and avoiding CORS on texture usage:
          const texUrl = `/api/image-proxy?url=${encodeURIComponent(photo.url)}`;
          loader.load(texUrl, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            // tex.minFilter = THREE.LinearFilter;
            setActiveTexture(tex);

            // Fade In
            new TWEEN.Tween(imageOpacity.current, tweens.current)
              .to({ val: 1 }, 800)
              .easing(TWEEN.Easing.Quadratic.Out)
              .onUpdate(() => {
                if (imagePlaneRef.current) {
                  // @ts-ignore
                  imagePlaneRef.current.material.opacity =
                    imageOpacity.current.val;
                }
              })
              .start();
          });
        })
        .start();
    },
    [photos],
  );

  // React to index change
  useEffect(() => {
    morphToImage(currentIndex);
  }, [currentIndex, morphToImage]);

  // Animation Loop
  useFrame(() => {
    tweens.current.update();

    // Gentle float effect for both particles and image
    if (pointsRef.current && imagePlaneRef.current) {
      // Only float if not transitioning strongly? Or smooth float everywhere.
      const rot = Math.sin(Date.now() * 0.0002) * 0.05;
      pointsRef.current.rotation.y = rot;
      imagePlaneRef.current.rotation.y = rot;
    }
  });

  // Texture for particles
  const particleSprite = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.4, "rgba(255,255,255,0.8)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 32, 32);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  return (
    <group>
      {/* Particles */}
      <points
        ref={pointsRef}
        geometry={geometry}
      >
        <pointsMaterial
          size={PARTICLE_SIZE}
          map={particleSprite}
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={1.0}
        />
      </points>

      {/* Real Image Plane */}
      <mesh
        ref={imagePlaneRef}
        position={[0, 0, 0.05]}
      >
        {/* Slight Z offset to be in front of particles */}
        <planeGeometry
          args={[WORLD_SCALE, WORLD_SCALE / activeRatio.current]}
        />
        <meshBasicMaterial
          map={activeTexture}
          transparent={true}
          opacity={0}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

// --- Main Page Component ---
export function ImmersiveView({
  photos,
  currentIndex,
  onChangeIndex,
  isPlaying,
  onTogglePlay,
  onClose,
}: {
  photos: Photo[];
  currentIndex: number;
  onChangeIndex: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onClose: () => void;
}) {
  const [scenePhase, setScenePhase] = useState<"intro" | "fireworks" | "main">(
    "intro",
  );

  // Handlers for phase transitions
  const handleWarpEnd = useCallback(() => {
    setScenePhase("fireworks");
  }, []);

  const handleFireworksEnd = useCallback(() => {
    setScenePhase("main");
  }, []);

  return (
    <div className='relative w-full h-screen bg-black overflow-hidden font-sans group'>
      {scenePhase !== "main" && <UIOverlay />}

      {/* Control Overlay for Gallery */}
      {scenePhase === "main" && (
        <div className='absolute bottom-12 left-1/2 -translate-x-1/2 z-50 flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500'>
          <button
            onClick={onTogglePlay}
            className='px-6 py-2 rounded-full border border-[#FFD700]/50 text-[#FFD700] hover:bg-[#FFD700]/20 backdrop-blur-md transition-all uppercase text-xs tracking-widest font-bold'
          >
            {isPlaying ? "Pause" : "Auto-Play"}
          </button>
          <button
            onClick={onClose}
            className='px-6 py-2 rounded-full border border-white/20 text-white/50 hover:bg-white/10 hover:text-white backdrop-blur-md transition-all uppercase text-xs tracking-widest'
          >
            Exit
          </button>
        </div>
      )}

      <Canvas
        camera={{ position: [0, 0, 60], fov: 60 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
          alpha: false,
          powerPreference: "high-performance",
        }}
        dpr={[1, 1.5]}
      >
        <color
          attach='background'
          args={["#000000"]}
        />

        {scenePhase === "intro" && <IntroScene onSequenceEnd={handleWarpEnd} />}

        {/* Fireworks continue during Main phase if continuous is true (which we set to true implicitly by rendering it) */}
        {(scenePhase === "fireworks" || scenePhase === "main") && (
          <FireworksScene
            continuous={scenePhase === "main"}
            onComplete={handleFireworksEnd}
          />
        )}

        {scenePhase === "main" && (
          <ParticleGallery
            photos={photos}
            currentIndex={currentIndex}
          />
        )}
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.2} // Lower threshold to catch the gold more
            mipmapBlur
            intensity={1.0}
            radius={0.5}
            levels={8}
          />
          <Vignette
            eskil={false}
            offset={0.1}
            darkness={1.1}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
