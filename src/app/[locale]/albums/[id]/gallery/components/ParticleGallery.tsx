import React, {
  useRef,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";

import * as THREE from "three";
import { Photo } from "./types";
import { vertexShader, fragmentShader } from "./shaders";
import {
  getImageParticleData,
  generateGalaxyPositions,
  GALLERY_PARTICLE_COUNT,
  WORLD_SCALE,
} from "./utils";

// ============================================================================
// Configuration
// ============================================================================
const MORPH_DURATION = 0.5; // Seconds for galaxy -> image transition

// ============================================================================
// Easing Functions (used in frame loop for perfect sync)
// ============================================================================
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutQuad = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// ============================================================================
// Component
// ============================================================================
interface ParticleGalleryProps {
  photos: Photo[];
  currentIndex: number;
}

export const ParticleGallery: React.FC<ParticleGalleryProps> = ({
  photos,
  currentIndex,
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const imagePlaneRef = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();

  // Data Cache
  const particleCache = useRef<Map<string, any>>(new Map());

  // Texture State
  const [activeTexture, setActiveTexture] = useState<THREE.Texture | null>(
    null,
  );

  // ============================================================================
  // Transition State (Single Source of Truth)
  // ============================================================================
  const transitionState = useRef({
    // Core progress (0 = galaxy/previous, 1 = target image)
    progress: 0,
    isActive: false,
    startTime: 0,

    // Rotation: captured at transition start
    startRotation: { x: 0, y: 0, z: 0 },
    targetRotation: { x: 0, y: 0, z: 0 }, // Always 0,0,0 for image view

    // Scale: for image plane aspect ratio
    // Scale: captured start states
    startScale: { x: 1, y: 1, z: 1 },
    pointsStartScale: 1,

    // Target info for dynamic sizing
    currentRatio: 1,

    // Opacity: image plane
    targetRatio: 1,

    // Galaxy mode
    isGalaxyMode: true,
    galaxyRotationY: 0, // Accumulated rotation in galaxy mode
  });

  // Track current transition to handle rapid index changes
  const transitionId = useRef(0);

  // ============================================================================
  // Geometry Setup
  // ============================================================================
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    // Initial: Galaxy positions
    const initialPos = generateGalaxyPositions(GALLERY_PARTICLE_COUNT, 150);
    const initialColors = new Float32Array(GALLERY_PARTICLE_COUNT * 3);
    const initialSizes = new Float32Array(GALLERY_PARTICLE_COUNT).fill(1.0);

    // Gold/starry colors for galaxy
    for (let i = 0; i < GALLERY_PARTICLE_COUNT; i++) {
      initialColors[i * 3] = 1.0;
      initialColors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
      initialColors[i * 3 + 2] = 0.5 + Math.random() * 0.5;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(initialPos, 3));
    geo.setAttribute(
      "aTargetPosition",
      new THREE.BufferAttribute(new Float32Array(initialPos), 3),
    );
    geo.setAttribute("aColor", new THREE.BufferAttribute(initialColors, 3));
    geo.setAttribute(
      "aTargetColor",
      new THREE.BufferAttribute(new Float32Array(initialColors), 3),
    );
    geo.setAttribute("aSize", new THREE.BufferAttribute(initialSizes, 1));

    return geo;
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uParticleOpacity: { value: 1.0 }, // Controls particle fade out
      uPointSize: { value: 1.5 },
      uPixelRatio: {
        value: typeof window !== "undefined" ? window.devicePixelRatio : 1,
      },
      uMouse: { value: new THREE.Vector3(0, 0, 0) },
    }),
    [],
  );

  // ============================================================================
  // Data Loading
  // ============================================================================
  const loadParticleData = useCallback(
    async (index: number) => {
      const photo = photos[index];
      if (!photo) return null;

      if (particleCache.current.has(photo.url)) {
        return particleCache.current.get(photo.url);
      }

      try {
        const data = await getImageParticleData(photo.url);
        particleCache.current.set(photo.url, data);
        return data;
      } catch (e) {
        console.error("[ParticleGallery] Error loading particles", e);
        return null;
      }
    },
    [photos],
  );

  // ============================================================================
  // Transition Trigger
  // ============================================================================
  const startTransition = useCallback(
    async (index: number) => {
      const currentId = ++transitionId.current;
      const state = transitionState.current;

      console.log(`[ParticleGallery] Starting transition to index ${index}`);

      // 1. Load target data
      const targetData = await loadParticleData(index);
      if (currentId !== transitionId.current || !targetData) {
        console.log("[ParticleGallery] Transition aborted (stale or no data)");
        return;
      }

      // 2. Load texture
      const loader = new THREE.TextureLoader();
      loader.load(
        `/api/image-proxy?url=${encodeURIComponent(photos[index].url)}`,
        (tex) => {
          if (currentId !== transitionId.current) return;
          tex.colorSpace = THREE.SRGBColorSpace;
          setActiveTexture(tex);
        },
      );

      // 3. Prepare geometry buffers
      if (!pointsRef.current) return;

      const geo = pointsRef.current.geometry;
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      const colAttr = geo.attributes.aColor as THREE.BufferAttribute;
      const sizeAttr = geo.attributes.aSize as THREE.BufferAttribute;
      const targetPosAttr = geo.attributes
        .aTargetPosition as THREE.BufferAttribute;
      const targetColAttr = geo.attributes
        .aTargetColor as THREE.BufferAttribute;

      // If we were already at an image (progress > 0), commit current target to source
      if (state.progress > 0.01) {
        posAttr.array.set(targetPosAttr.array);
        colAttr.array.set(targetColAttr.array);
        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;
      }

      // Set new target
      targetPosAttr.array.set(targetData.positions);
      targetColAttr.array.set(targetData.colors);
      sizeAttr.array.set(targetData.sizes);
      targetPosAttr.needsUpdate = true;
      targetColAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;

      // 4. Capture current state for interpolation
      if (pointsRef.current) {
        state.startRotation = {
          x: pointsRef.current.rotation.x,
          y: pointsRef.current.rotation.y,
          z: pointsRef.current.rotation.z,
        };
      }

      if (imagePlaneRef.current) {
        state.startScale = {
          x: imagePlaneRef.current.scale.x,
          y: imagePlaneRef.current.scale.y,
          z: imagePlaneRef.current.scale.z,
        };
      }

      // Target scale based on image aspect ratio
      state.targetRatio = targetData.ratio;
      state.currentRatio = targetData.ratio;
      state.pointsStartScale = pointsRef.current?.scale.x || 1;

      // 5. Start transition
      state.progress = 0;
      state.isActive = true;
      state.startTime = performance.now() / 1000;
      state.isGalaxyMode = false;
    },
    [loadParticleData, photos],
  );

  // Watch for index changes
  useEffect(() => {
    startTransition(currentIndex);
  }, [currentIndex, startTransition]);

  // ============================================================================
  // Frame Loop: Single Progress Drives Everything
  // ============================================================================
  // Accumulate local time for pausing
  const localTimeRef = useRef(0);

  // ============================================================================
  // Frame Loop: Single Progress Drives Everything
  // ============================================================================
  useFrame((frameState, delta) => {
    // Only update time if frameloop is running
    const safeDelta = Math.min(delta, 0.1);
    localTimeRef.current += safeDelta;
    const time = localTimeRef.current;

    const state = transitionState.current;

    uniforms.uTime.value = time;

    // ========================================
    // Update Progress
    // ========================================
    if (state.isActive) {
      const elapsed = performance.now() / 1000 - state.startTime;
      state.progress = Math.min(1, elapsed / MORPH_DURATION);

      if (state.progress >= 1) {
        state.isActive = false;
        state.progress = 1;
      }
    }

    // ========================================
    // Apply Progress to All Animations (SYNCHRONIZED)
    // ========================================
    const t = state.progress; // Raw progress 0-1
    const easedT = easeInOutQuad(t); // For smooth acceleration/deceleration
    const rotationT = easeOutCubic(t); // Rotation settles faster

    // 1. Shader morph progress
    uniforms.uProgress.value = easedT;

    // 2. Points rotation
    if (pointsRef.current) {
      if (state.isGalaxyMode && !state.isActive) {
        // Galaxy mode: continuous rotation
        state.galaxyRotationY += delta * 0.3;
        pointsRef.current.rotation.y = state.galaxyRotationY;
        pointsRef.current.rotation.x = 0.8 + Math.cos(time * 0.15) * 0.05;
        pointsRef.current.rotation.z = Math.sin(time * 0.1) * 0.02;
      } else {
        // Transition or viewing mode: lerp to target (0,0,0)
        const start = state.startRotation;
        const target = state.targetRotation;

        pointsRef.current.rotation.x =
          start.x + (target.x - start.x) * rotationT;
        pointsRef.current.rotation.y =
          start.y + (target.y - start.y) * rotationT;
        pointsRef.current.rotation.z =
          start.z + (target.z - start.z) * rotationT;
      }
    }

    // 3. Image plane scale & opacity + Particle opacity (SYNCHRONIZED)
    if (imagePlaneRef.current) {
      // Calculate target Scale Factor S dynamically to fit viewport
      let s = 1;
      if (!state.isGalaxyMode && state.currentRatio) {
        // Maximize size within viewport considering margins (90% of screen)
        const maxWidth = viewport.width * 0.9;
        const maxHeight = viewport.height * 0.9;

        // Base size at scale 1 (defined by WORLD_SCALE in utils)
        const baseW = WORLD_SCALE;
        const baseH = WORLD_SCALE / state.currentRatio;

        s = Math.min(maxWidth / baseW, maxHeight / baseH);
      }

      // Update Points Scale
      if (pointsRef.current) {
        const start = state.pointsStartScale;
        const curr = start + (s - start) * easedT;
        pointsRef.current.scale.set(curr, curr, curr);
      }

      const startS = state.startScale;
      // Target for Plane: x=s (width), y=s/ratio (height), z=s
      const targetX = s;
      const targetY = s / state.currentRatio;

      // Scale lerp
      imagePlaneRef.current.scale.x = startS.x + (targetX - startS.x) * easedT;
      imagePlaneRef.current.scale.y = startS.y + (targetY - startS.y) * easedT;
      imagePlaneRef.current.scale.z = startS.z + (targetX - startS.z) * easedT;

      // ========================================
      // Critical Timing Fix:
      // - Particles complete morph during 0-80% of transition
      // - Image fades in during last 20% (80%-100%)
      // - Particles fade out during last 20% (as image fades in)
      // ========================================
      const mat = imagePlaneRef.current.material as THREE.MeshBasicMaterial;

      // Image opacity: only starts at 80%, completes at 100%
      const imageOpacityT = Math.max(0, (t - 0.8) / 0.2);
      mat.opacity = easeOutCubic(imageOpacityT);

      // Particle opacity: 100% until 80%, then fade to 0
      const particleOpacity = 1.0 - imageOpacityT;
      uniforms.uParticleOpacity.value = particleOpacity;

      // Subtle float when viewing (only after transition complete)
      if (!state.isActive && t >= 1) {
        imagePlaneRef.current.rotation.y = Math.sin(time * 0.1) * 0.02;
        imagePlaneRef.current.rotation.x = Math.cos(time * 0.15) * 0.02;
      }
    } else {
      // No image plane yet, particles fully visible
      uniforms.uParticleOpacity.value = 1.0;
    }
  });

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <group>
      {/* Particles */}
      <points
        ref={pointsRef}
        geometry={geometry}
      >
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Backdrop Image Plane */}
      <mesh
        ref={imagePlaneRef}
        position={[0, 0, -0.5]}
      >
        <planeGeometry args={[WORLD_SCALE, WORLD_SCALE]} />
        <meshBasicMaterial
          map={activeTexture}
          transparent={true}
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};
