import React, { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const GRAVITY = new THREE.Vector3(0, -9.8, 0);
const MAX_PARTICLES = 2000;

export const Fireworks = ({ isActive }: { isActive: boolean }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Physics State
  // We use a flat array of objects to track state CPU side
  const particles = useMemo(() => {
    return new Array(MAX_PARTICLES).fill(0).map(() => ({
      position: new THREE.Vector3(0, -100, 0),
      velocity: new THREE.Vector3(),
      color: new THREE.Color(),
      scale: 0,
      life: 0,
      type: "dead" as "dead" | "rocket" | "spark",
    }));
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current || !isActive) return;

    // Spawn Logic
    // 5% chance per frame to launch a rocket if we have capacity
    if (Math.random() < 0.05) {
      // Find a dead particle to be the rocket
      // Better: Find a group of dead to reserve for explosion later?
      // Simple: Just launch one rocket particle. When it explodes, it converts OTHER dead particles to sparks.

      const rocket = particles.find((p) => p.type === "dead");
      if (rocket) {
        rocket.type = "rocket";
        rocket.position.set(
          (Math.random() - 0.5) * 60,
          -30,
          (Math.random() - 0.5) * 20 - 20,
        );
        rocket.velocity.set(0, 40 + Math.random() * 20, 0);
        rocket.velocity.x += (Math.random() - 0.5) * 5;
        rocket.velocity.z += (Math.random() - 0.5) * 5;
        rocket.color.setHSL(Math.random(), 1, 0.6);
        rocket.life = 1.0 + Math.random() * 0.5; // Seconds until explode
        rocket.scale = 1.0;
      }
    }

    // Update Logic
    let i = 0;
    for (const p of particles) {
      if (p.type === "dead") {
        p.scale = 0;
      } else {
        // Apply Velocity
        p.position.addScaledVector(p.velocity, delta);
        p.velocity.addScaledVector(GRAVITY, delta);

        if (p.type === "rocket") {
          p.velocity.multiplyScalar(0.99); // Light drag
          p.life -= delta;

          // Explode condition
          if (p.velocity.y < 0 || p.life <= 0) {
            p.type = "dead"; // Rocket disappears
            p.scale = 0;

            // Spawn Sparks (Explosion)
            // Find ~50 dead particles
            let spawned = 0;
            const count = 50 + Math.floor(Math.random() * 50);
            // Color matches rocket
            const explosionColor = p.color.clone();

            for (const spark of particles) {
              if (spawned >= count) break;
              if (spark.type === "dead") {
                spark.type = "spark";
                spark.position.copy(p.position);
                // Radial velocity
                const speed = 10 + Math.random() * 20;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;

                spark.velocity.set(
                  speed * Math.sin(phi) * Math.cos(theta),
                  speed * Math.cos(phi),
                  speed * Math.sin(phi) * Math.sin(theta),
                );
                spark.velocity.add(p.velocity.clone().multiplyScalar(0.5)); // Inherit momentum

                spark.color.copy(explosionColor);
                // Add variation
                spark.color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.2);

                spark.life = 1.0 + Math.random();
                spark.scale = 0.5 + Math.random() * 0.5;
                spawned++;
              }
            }
          }
        } else if (p.type === "spark") {
          p.velocity.multiplyScalar(0.95); // Heavy drag
          p.life -= delta;
          p.scale *= 0.96; // Shrink
          if (p.life <= 0 || p.scale < 0.05) {
            p.type = "dead";
            p.scale = 0;
          }
        }
      }

      // Update Instance
      dummy.position.copy(p.position);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, p.color);
      i++;
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor)
      meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[null as any, null as any, MAX_PARTICLES]}
    >
      <sphereGeometry args={[0.3, 8, 8]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
};
