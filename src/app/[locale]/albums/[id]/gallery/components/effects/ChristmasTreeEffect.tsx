import React, { useMemo, useRef, useLayoutEffect, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Float, Stars, Billboard } from "@react-three/drei";
import * as THREE from "three";

// Re-export a dummy logic object to satisfy the types if needed,
// though we will modify ChristmasMode to not use it for rendering.
// Logic for Photo positioning (Particles are handled by InstancedMesh in the scene)
export const ChristmasTreeEffectLogic = {
  getTargetPosition: (
    index: number,
    total: number,
    isPhoto: boolean,
    time: number,
    isScattered?: boolean,
  ) => {
    const p = new THREE.Vector3();

    // Tree dimensions for photos
    const height = 40; // Increased from 28
    const baseRadius = 15; // Increased from 10

    if (isPhoto) {
      // Spiral up
      const h_norm = index / total; // 0..1
      const angle = h_norm * Math.PI * 12 + time * 0.1; // 6 rotations, slight rotation over time

      let r = baseRadius * (1 - h_norm) + 2; // Offset slightly outward

      const y = (h_norm - 0.5) * height;

      if (isScattered) {
        // Scatter photos into a ring/halo layout (same as HeartEffect)
        // Photos form a horizontal ring around the center
        const angle = (index / total) * Math.PI * 2 + time * 0.1;
        const radius = 28; // Ring radius - increased to match others
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = Math.sin(index * 0.5 + time) * 2; // Slight vertical wave

        p.set(x, y, z);
      } else {
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        p.set(x, y, z);
      }
    } else {
      // Should not happen if we don't use ParticleSystem for TREE, but fallback:
      p.set(0, 0, 0);
    }
    return p;
  },
  getParticleColor: (index: number, total: number, baseColor: THREE.Color) => {
    // Not used for InstancedMesh tree, but valid fallback
    return baseColor;
  },
};

const COUNT = 1500; // Number of instances per geometry type
const TREE_HEIGHT = 45; // Increased from 30
const TREE_RADIUS = 18; // Increased from 12

// Colors
const COLORS = [
  new THREE.Color("#FFD700"), // Gold
  new THREE.Color("#C0C0C0"), // Silver
  new THREE.Color("#E0115F"), // Ruby
  new THREE.Color("#50C878"), // Emerald
];

const tempObject = new THREE.Object3D();

function TreeInstances({
  geometry,
  count,
  scaleMultiplier = 1,
  isScattered,
  themeColor = "#FFD700",
  intensity = 0.8,
}: {
  geometry: THREE.BufferGeometry;
  count: number;
  scaleMultiplier?: number;
  isScattered: boolean;
  themeColor?: string;
  intensity?: number;
}) {
  // Compute emissive color from theme
  const emissiveColor = useMemo(() => {
    const c = new THREE.Color(themeColor);
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    return new THREE.Color().setHSL(hsl.h, hsl.s * 0.5, hsl.l * 0.15);
  }, [themeColor]);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const phase = useRef(0); // 0 = tree, 1 = scattered

  const data = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      // --- Tree Position (Target 0) ---
      // Golden spiral distribution for Volume
      const t = Math.random();
      // y goes from -height/2 to height/2
      const h = t * TREE_HEIGHT;
      const y = h - TREE_HEIGHT / 2;

      // Radius at height h
      // Linear taper:
      const r = (1 - t) * TREE_RADIUS * Math.sqrt(Math.random()); // sqrt for uniform disk density at slice

      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const treePos = new THREE.Vector3(x, y, z);

      // --- Scatter Position (Target 1) ---
      // Random cloud distribution - more scattered and irregular
      // Use spherical coordinates with random variations for organic look

      // Random direction in 3D space (uniform on sphere surface)
      const theta = Math.random() * Math.PI * 2; // horizontal angle
      const phi = Math.acos(2 * Math.random() - 1); // vertical angle (uniform on sphere)

      // Variable distance from center for cloud-like density
      // Use a mix of distances to create depth
      const minRadius = 60;
      const maxRadius = 120;
      // Bias towards middle range for cloud effect
      const radiusFactor = Math.pow(Math.random(), 0.6);
      const scatterRadius = minRadius + radiusFactor * (maxRadius - minRadius);

      // Convert spherical to cartesian with added noise
      const sx =
        Math.sin(phi) * Math.cos(theta) * scatterRadius +
        (Math.random() - 0.5) * 20;
      const sy =
        Math.cos(phi) * scatterRadius * 0.7 + (Math.random() - 0.5) * 15; // Slightly flattened vertically
      const sz =
        Math.sin(phi) * Math.sin(theta) * scatterRadius +
        (Math.random() - 0.5) * 20;
      const scatterPos = new THREE.Vector3(sx, sy, sz);

      const scale = (0.5 + Math.random() * 0.5) * scaleMultiplier;

      // Select random color
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];

      return {
        treePos,
        scatterPos,
        rotation: new THREE.Euler(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          0,
        ),
        scale,
        color,
        speed: Math.random() * 0.5 + 0.5,
      };
    });
  }, [count, scaleMultiplier]);

  useLayoutEffect(() => {
    if (!meshRef.current) return;

    data.forEach((d, i) => {
      meshRef.current!.setColorAt(i, d.color);
    });
    meshRef.current.instanceColor!.needsUpdate = true;
  }, [data]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Smoothly interpolate phase
    const targetPhase = isScattered ? 1 : 0;
    phase.current = THREE.MathUtils.lerp(
      phase.current,
      targetPhase,
      delta * 2.0,
    );

    const time = state.clock.getElapsedTime();

    // Rotate whole system slightly if tree
    if (phase.current < 0.9) {
      meshRef.current.rotation.y += 0.002 * (1 - phase.current);
    }
    // If fully scattered, maybe slow rotation or different movement?
    // Let's keep the particles moving individually mostly.

    data.forEach((d, i) => {
      // Interpolate position
      const currentPos = new THREE.Vector3()
        .copy(d.treePos)
        .lerp(d.scatterPos, phase.current);

      // Add floating motion
      const floatAmp = 0.5 + phase.current * 1.5; // Float more when scattered
      currentPos.y += Math.sin(time * d.speed + i) * floatAmp;
      currentPos.x += Math.cos(time * d.speed * 0.5 + i) * floatAmp * 0.2;

      tempObject.position.copy(currentPos);

      tempObject.rotation.set(
        d.rotation.x + time * 0.5 * d.speed,
        d.rotation.y + time * 0.3 * d.speed,
        d.rotation.z,
      );

      tempObject.scale.setScalar(d.scale);
      tempObject.updateMatrix();

      meshRef.current!.setMatrixAt(i, tempObject.matrix);
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
        emissiveIntensity={0.5 * intensity}
        emissive={`#${emissiveColor.getHexString()}`}
      />
    </instancedMesh>
  );
}

interface ChristmasTreeSceneProps {
  isScattered?: boolean;
  displayText?: string;
  themeColor?: string;
  intensity?: number;
}

export const ChristmasTreeScene = ({
  isScattered = false,
  displayText = "2026 521",
  themeColor = "#FFD700",
  intensity = 0.8,
}: ChristmasTreeSceneProps) => {
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
  // Geometries
  const sphereGeo = useMemo(() => new THREE.SphereGeometry(0.5, 16, 16), []);
  const coneGeo = useMemo(() => new THREE.ConeGeometry(0.4, 1.2, 8), []);
  const cylGeo = useMemo(() => new THREE.CylinderGeometry(0.1, 0.1, 2, 8), []);
  const boxGeo = useMemo(() => new THREE.BoxGeometry(0.5, 0.5, 0.5), []);

  return (
    <group position={[0, -5, 0]}>
      {/* Ambient environment */}
      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />

      {/* Floating Text - Billboard to always face camera */}
      <Billboard
        position={[0, 33, 0]}
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
            fontSize={3.4}
            color={themeColor}
            font='/fonts/inter-latin-400-normal.woff'
            characters={displayText}
            anchorX='center'
            anchorY='middle'
            outlineWidth={0.02}
            outlineColor={`#${darkerThemeColor.getHexString()}`}
            material-toneMapped={false}
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
            fontSize={3.4}
            color={themeColor}
            font='/fonts/inter-latin-400-normal.woff'
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

      {/* Tree Layers - Composition of shapes */}
      <TreeInstances
        geometry={sphereGeo}
        count={2000}
        scaleMultiplier={0.6}
        isScattered={isScattered}
        themeColor={themeColor}
        intensity={intensity}
      />
      <TreeInstances
        geometry={coneGeo}
        count={2400}
        scaleMultiplier={0.8}
        isScattered={isScattered}
        themeColor={themeColor}
        intensity={intensity}
      />
      <TreeInstances
        geometry={cylGeo}
        count={1600}
        scaleMultiplier={0.5}
        isScattered={isScattered}
        themeColor={themeColor}
        intensity={intensity}
      />
      <TreeInstances
        geometry={boxGeo}
        count={1000}
        scaleMultiplier={0.4}
        isScattered={isScattered}
        themeColor={themeColor}
        intensity={intensity}
      />

      {/* Central glowing core (trunk-ish) - Hide when scattered */}
      {!isScattered && (
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[1, 8, 30, 16]} />
          <meshBasicMaterial
            color='#FF4500'
            transparent
            opacity={0.1}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* Floor Reflection/Platform - Hide when scattered */}
      {!isScattered && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -TREE_HEIGHT / 2 - 2, 0]}
        >
          <circleGeometry args={[30, 64]} />
          <meshStandardMaterial
            color='#000'
            roughness={0}
            metalness={0.8}
          />
        </mesh>
      )}
    </group>
  );
};
