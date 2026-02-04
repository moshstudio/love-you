import React, { useMemo, useRef, useLayoutEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Float, Stars, Sparkles } from "@react-three/drei";
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
    const height = 40;
    const baseRadius = 15;

    if (isPhoto) {
      // Spiral up
      const h_norm = index / total; // 0..1
      const angle = h_norm * Math.PI * 12 + time * 0.1; // 6 rotations, slight rotation over time

      let r = baseRadius * (1 - h_norm) + 2; // Offset slightly outward

      if (isScattered) {
        r *= 2.5; // Move photos outward when scattered
      }

      const y = (h_norm - 0.5) * height;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      p.set(x, y, z);
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
const TREE_HEIGHT = 45;
const TREE_RADIUS = 18;

// Colors
const COLORS = [
  new THREE.Color("#FFD700"), // Gold
  new THREE.Color("#C0C0C0"), // Silver
  new THREE.Color("#E0115F"), // Ruby
  new THREE.Color("#50C878"), // Emerald
];

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

function TreeInstances({
  geometry,
  count,
  scaleMultiplier = 1,
}: {
  geometry: THREE.BufferGeometry;
  count: number;
  scaleMultiplier?: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const data = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      // Golden spiral distribution for Volume
      const t = Math.random();
      // y goes from -height/2 to height/2
      // actually let's base it on 0 to height
      const h = t * TREE_HEIGHT;
      const y = h - TREE_HEIGHT / 2;

      // Radius at height h
      // Linear taper:
      const r = (1 - t) * TREE_RADIUS * Math.sqrt(Math.random()); // sqrt for uniform disk density at slice

      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      const scale = (0.5 + Math.random() * 0.5) * scaleMultiplier;

      // Select random color
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];

      return {
        position: [x, y, z],
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0],
        scale,
        color,
      };
    });
  }, [count, scaleMultiplier]);

  useLayoutEffect(() => {
    if (!meshRef.current) return;

    data.forEach((d, i) => {
      const { position, rotation, scale, color } = d;
      tempObject.position.set(
        position[0] as number,
        position[1] as number,
        position[2] as number,
      );
      tempObject.rotation.set(
        rotation[0] as number,
        rotation[1] as number,
        rotation[2] as number,
      );
      tempObject.scale.setScalar(scale as number);
      tempObject.updateMatrix();

      meshRef.current!.setMatrixAt(i, tempObject.matrix);
      meshRef.current!.setColorAt(i, color);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.instanceColor!.needsUpdate = true;
  }, [data]);

  useFrame((state) => {
    if (!meshRef.current) return;
    // Gentle rotation of the whole tree layer
    meshRef.current.rotation.y += 0.002;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, count]}
    >
      <meshPhysicalMaterial
        roughness={0.2}
        metalness={0.9}
        emissiveIntensity={0.5}
        emissive='#222' // Slight self emissive for bloom base
      />
    </instancedMesh>
  );
}

export const ChristmasTreeScene = () => {
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
      <Sparkles
        count={500}
        scale={60}
        size={5}
        speed={0.4}
        opacity={0.5}
        color='#FFD700'
      />

      {/* Floating Text */}
      <Float
        speed={2}
        rotationIntensity={0.1}
        floatIntensity={1}
        floatingRange={[1, 2]}
      >
        <Text
          position={[0, 28, 0]}
          fontSize={3}
          maxWidth={200}
          lineHeight={1}
          letterSpacing={0.02}
          textAlign='center'
          anchorX='center'
          anchorY='middle'
        >
          2026 祝你开心
          <meshStandardMaterial
            color='#FFD700'
            emissive='#FFD700'
            emissiveIntensity={2}
            toneMapped={false}
          />
        </Text>
      </Float>

      {/* Tree Layers - Composition of shapes */}
      <TreeInstances
        geometry={sphereGeo}
        count={1000}
        scaleMultiplier={1.2}
      />
      <TreeInstances
        geometry={coneGeo}
        count={1200}
        scaleMultiplier={1.5}
      />
      <TreeInstances
        geometry={cylGeo}
        count={800}
        scaleMultiplier={1}
      />
      <TreeInstances
        geometry={boxGeo}
        count={500}
        scaleMultiplier={0.8}
      />

      {/* Central glowing core (trunk-ish) */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[1, 8, 30, 16]} />
        <meshBasicMaterial
          color='#FF4500'
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Floor Reflection/Platform */}
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
    </group>
  );
};
