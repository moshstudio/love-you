"use client";

import React, { useMemo, useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Text, Float, Stars, Billboard } from "@react-three/drei";
import { EffectLogic } from "./types";

// --- Logic for Photos (Orbiting/Heart Shape) ---
export const HeartLogic: EffectLogic = {
  getTargetPosition: (index, total, isPhoto, time, isScattered) => {
    // 1. Scattered Mode: Photos form a Halo / Ring
    if (isScattered) {
      const angle = (index / total) * Math.PI * 2 + time * 0.1;
      const radius = 32; // Increased halo radius to keep in view
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = Math.sin(index * 0.5 + time) * 2; // Slight vertical wave
      return new THREE.Vector3(x, y, z);
    }

    // 2. Aggregated Mode: Photos mixed inside the heart (Volume)
    // Deterministic random values based on index
    const random = (seed: number) => {
      const x = Math.sin(seed * 9999) * 10000;
      return x - Math.floor(x);
    };

    const r1 = random(index);
    const r2 = random(index + 1);
    const r3 = random(index + 2);

    // Spread logic:
    // We use the parametric heart curve but modulate it
    // t runs 0..2PI
    const t = (index / total) * Math.PI * 2;

    // Heart Curve
    let x = 16 * Math.pow(Math.sin(t), 3);
    let y =
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t);

    // Mix them into the volume:
    // Scale factor from 0.2 to 1.0 (Center to Edge)
    // We use sqrt(r1) to bias towards edge for better visibility, or just linear for uniform
    const volumeScale = 0.3 + 0.7 * r1;

    // Add some Z depth (Heart thickness)
    // Z thickness varies with scale (thicker at top, thinner at bottom is realistic but box is fine)
    const zThickness = 4 * volumeScale;
    let z = (r2 - 0.5) * 2 * zThickness;

    // Apply scale
    x *= volumeScale;
    y *= volumeScale;

    // Add time-based float for life
    z += isPhoto ? Math.sin(time + index) * 0.5 : 0;

    // Global scale to match scene (HeartScene used 10, current Photo logic used 1.0 which was huge?
    // Wait, original logic X was 16. 16 * 1.0 = 16 units.
    // HeartScene used scale 10 on range [-1.5, 1.5] -> [-15, 15].
    // So scale 0.8 should be close to particles.
    const finalScale = 0.8; // Increased from 0.55

    return new THREE.Vector3(x * finalScale, y * finalScale, z * finalScale);
  },
};

// --- Instanced Mesh Heart Component ---
// Use many more particles for density
const INSTANCE_COUNT = 4000;
const GEOMETRY_TYPES = ["sphere", "cone", "cylinder"] as const;

// Colors
const COLORS = [
  new THREE.Color("#FFD700"), // Gold
  new THREE.Color("#C0C0C0"), // Silver
  new THREE.Color("#E0115F"), // Ruby
  new THREE.Color("#50C878"), // Emerald
];

interface HeartSceneProps {
  isScattered?: boolean;
  displayText?: string;
  themeColor?: string;
  intensity?: number;
}

export const HeartScene = ({
  isScattered = false,
  displayText = "2026 521",
  themeColor = "#FFD700",
  intensity = 0.8,
}: HeartSceneProps) => {
  // Compute derived colors from themeColor
  const themeColorObj = useMemo(
    () => new THREE.Color(themeColor),
    [themeColor],
  );
  const darkerThemeColor = useMemo(() => {
    const hsl = { h: 0, s: 0, l: 0 };
    themeColorObj.getHSL(hsl);
    return new THREE.Color().setHSL(hsl.h, hsl.s * 0.8, hsl.l * 0.4);
  }, [themeColorObj]);
  const textRef = useRef<THREE.Group>(null);

  // Create geometries - Smaller size for higher density
  const geometries = useMemo(
    () => ({
      sphere: new THREE.SphereGeometry(0.19, 12, 12),
      cone: new THREE.ConeGeometry(0.19, 0.38, 12),
      cylinder: new THREE.CylinderGeometry(0.13, 0.13, 0.38, 12),
    }),
    [],
  );

  return (
    <group>
      {/* Increased count significantly for fuller volume */}
      <InstancedHeartShape
        geometry={geometries.sphere}
        type='sphere'
        count={4000}
        isScattered={isScattered}
        themeColor={themeColor}
        intensity={intensity}
      />
      <InstancedHeartShape
        geometry={geometries.cone}
        type='cone'
        count={3000}
        isScattered={isScattered}
        themeColor={themeColor}
        intensity={intensity}
      />
      <InstancedHeartShape
        geometry={geometries.cylinder}
        type='cylinder'
        count={3000}
        isScattered={isScattered}
        themeColor={themeColor}
        intensity={intensity}
      />

      {/* Background Star System */}
      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />

      {/* Floating Text */}
      {/* Floating Text - Billboard to always face camera */}
      <Billboard
        position={[0, 23, 0]}
        follow={true}
        lockX={false}
        lockY={false}
        lockZ={false}
      >
        <Float
          speed={2}
          rotationIntensity={0}
          floatIntensity={1}
        >
          <Text
            fontSize={3}
            color={themeColor}
            font='https://cdn.jsdelivr.net/npm/inter-ui@3.19.3/Inter%20(web)/Inter-Regular.woff'
            characters={displayText}
            anchorX='center'
            anchorY='middle'
            outlineWidth={0.02}
            outlineColor={`#${darkerThemeColor.getHexString()}`}
            material-toneMapped={false} // Important for bloom
          >
            {displayText}
            <meshPhysicalMaterial
              color={themeColor}
              emissive={themeColor}
              emissiveIntensity={1.5 * intensity}
              metalness={1}
              roughness={0}
              clearcoat={1}
              clearcoatRoughness={0}
              envMapIntensity={2}
              toneMapped={false}
            />
          </Text>
          <Text
            fontSize={3}
            color={themeColor}
            font='https://cdn.jsdelivr.net/npm/inter-ui@3.19.3/Inter%20(web)/Inter-Regular.woff'
            characters={displayText}
            anchorX='center'
            anchorY='middle'
            position={[0, 0, -0.1]}
            fillOpacity={0.5 * intensity}
          >
            {displayText}
          </Text>
        </Float>
      </Billboard>
    </group>
  );
};

const InstancedHeartShape = ({
  geometry,
  type,
  count,
  isScattered,
  themeColor = "#FFD700",
  intensity = 0.8,
}: {
  geometry: THREE.BufferGeometry;
  type: string;
  count: number;
  isScattered: boolean;
  themeColor?: string;
  intensity?: number;
}) => {
  // Compute emissive color from theme
  const emissiveColor = useMemo(() => {
    const c = new THREE.Color(themeColor);
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    return new THREE.Color().setHSL(hsl.h, hsl.s * 0.5, hsl.l * 0.2);
  }, [themeColor]);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Calculate fixed positions for the heart shape
  const particles = useMemo(() => {
    const data = [];
    for (let i = 0; i < count; i++) {
      // Rejection sampling for Heart Volume
      // Standard Formula: (x^2 + 9/4y^2 + z^2 - 1)^3 - x^2z^3 - 9/80y^2z^3 < 0
      // NOTE: In this formula, Z is actually the up/down vertical axis of the heart typically.
      // But in Three.js, Y is up.
      // We need to map:
      // Formula Z -> Three.js Y (Vertical)
      // Formula Y -> Three.js Z (Depth/Thickness)
      // Formula X -> Three.js X (Width)

      let x, y, z, val;
      let attempts = 0;

      // We use a biased sampling to ensure we find points
      do {
        // Range roughly [-1.5, 1.5]
        x = Math.random() * 3 - 1.5;
        // Formula Y (depth) is usually thinner
        y = Math.random() * 3 - 1.5;
        // Formula Z (vertical)
        z = Math.random() * 3 - 1.5;

        // Compute the heart implicit function value
        // Swap Y and Z for the formula check
        // Formula uses (x, y, z) where z is vertical.
        // Our Three.js coords: (px, py, pz) -> Formula (x=px, y=pz, z=py)

        const fx = x;
        const fy = z; // Formula Y is depth (z in threejs)
        const fz = y; // Formula Z is height (y in threejs)

        const a = fx * fx + (9 / 4) * fy * fy + fz * fz - 1;
        val =
          a * a * a -
          fx * fx * fz * fz * fz -
          (9 / 80) * fy * fy * fz * fz * fz;

        attempts++;
      } while (val > 0 && attempts < 5000);

      // Scale up to world size
      const scale = 10; // Increased from 7

      // Random scatter position - Irregular Cloud
      // Use spherical coordinates with randomized radius to avoid box corners
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);

      // Radius with variation for irregularity and larger size
      const radius = 90 + Math.random() * 60;
      const dist = Math.cbrt(Math.random()) * radius;

      const scatterPos = new THREE.Vector3(
        dist * Math.sin(phi) * Math.cos(theta) * 1.6, // Wider X axis
        dist * Math.sin(phi) * Math.sin(theta),
        dist * Math.cos(phi),
      );

      // Assign a random color
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];

      // Initial random rotation
      const rot = new THREE.Euler(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      );

      data.push({
        heartPos: new THREE.Vector3(x * scale, y * scale, z * scale),
        scatterPos,
        color,
        rot,
        speed: Math.random() * 0.5 + 0.5,
      });
    }
    return data;
  }, [count]);

  useEffect(() => {
    if (!meshRef.current) return;
    particles.forEach((p, i) => {
      meshRef.current!.setColorAt(i, p.color);
    });
    meshRef.current.instanceColor!.needsUpdate = true;
  }, [particles]);

  // Current animation phase (0 = heart, 1 = scattered)
  const phase = useRef(0);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();

    // Smoothly interpolate phase
    const targetPhase = isScattered ? 1 : 0;
    phase.current = THREE.MathUtils.lerp(
      phase.current,
      targetPhase,
      delta * 2.0,
    );

    particles.forEach((p, i) => {
      // Interpolate position
      const currentPos = new THREE.Vector3()
        .copy(p.heartPos)
        .lerp(p.scatterPos, phase.current);

      dummy.position.copy(currentPos);
      dummy.rotation.set(
        p.rot.x + time * 0.5 * p.speed,
        p.rot.y + time * 0.3 * p.speed,
        p.rot.z,
      );
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, count]}
    >
      <meshPhysicalMaterial
        roughness={0.2}
        metalness={0.9}
        reflectivity={1}
        clearcoat={1}
        clearcoatRoughness={0.1}
        emissive={`#${emissiveColor.getHexString()}`}
        emissiveIntensity={0.2 * intensity}
      />
    </instancedMesh>
  );
};
