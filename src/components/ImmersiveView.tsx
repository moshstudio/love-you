"use client";

import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import {
  OrbitControls,
  Stars,
  Instances,
  Instance,
  Text3D,
  Center,
  Float,
  useTexture,
  Html,
} from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useTranslations } from "next-intl";
import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { FontLoader } from "three-stdlib";

// Type definitions for props
interface ParticleProps {
  phase: GamePhase;
  onPhaseComplete: () => void;
}

type GamePhase = "intro" | "warp" | "fireworks" | "main";

// Color Palette
const COLORS = {
  gold: new THREE.Color("#FFD700"),
  silver: new THREE.Color("#C0C0C0"),
  ruby: new THREE.Color("#E0115F"),
  emerald: new THREE.Color("#50C878"),
  dark: new THREE.Color("#050505"),
};

// -----------------------------------------------------------------------------
// 0. Resources & Utils
// -----------------------------------------------------------------------------
const FONT_URL = "/fonts/helvetiker_bold.typeface.json";

function useCountdownParticles(fontUrl: string, texts: string[]) {
  const [pointsData, setPointsData] = useState<THREE.Vector3[][]>([]);

  useEffect(() => {
    const loader = new FontLoader();
    loader.load(fontUrl, (font) => {
      const data = texts.map((text) => {
        const shapes = font.generateShapes(text, 5);
        const geometry = new THREE.ShapeGeometry(shapes);
        geometry.center();
        geometry.computeBoundingBox();

        // Sample points from the geometry surface/vertices
        // Simplified: use vertices directly (might be uneven) or sample.
        // For 'ShapeGeometry', vertices are mostly on the contour.
        // Better: Create positions randomly inside the shape.

        const posAttribute = geometry.attributes.position;
        const vectors: THREE.Vector3[] = [];

        // Sampling strategy: simpler - just take vertices.
        // For denser particles, we might want to fill the shape.
        // Let's just take vertices for now and maybe subdivide or random sample if needed.
        for (let i = 0; i < posAttribute.count; i++) {
          vectors.push(
            new THREE.Vector3(
              posAttribute.getX(i),
              posAttribute.getY(i),
              posAttribute.getZ(i),
            ),
          );
        }

        // Resample/Fill to a constant high number (e.g. 2000) for morphing
        const targetCount = 3000;
        const resampled: THREE.Vector3[] = [];
        if (vectors.length > 0) {
          for (let i = 0; i < targetCount; i++) {
            const randIndex = Math.floor(Math.random() * vectors.length);
            // Add some jitter
            const v = vectors[randIndex].clone();
            v.x += (Math.random() - 0.5) * 0.2;
            v.y += (Math.random() - 0.5) * 0.2;
            resampled.push(v);
          }
        }
        return resampled;
      });
      setPointsData(data);
    });
  }, [fontUrl, texts]);

  return pointsData;
}

// -----------------------------------------------------------------------------
// 1. Particle Intro System
// -----------------------------------------------------------------------------
function IntroCookies({ onComplete }: { onComplete: () => void }) {
  const steps = ["5", "4", "3", "2", "1", "2026"];
  const shapes = useCountdownParticles(FONT_URL, steps);

  // Particle System
  const pointsRef = useRef<THREE.Points>(null);
  const [geometry] = useState(() => {
    const geo = new THREE.BufferGeometry();
    // Initialize with 3000 particles at 0,0,0
    const positions = new Float32Array(3000 * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  });

  // Animation State
  useFrame(() => {
    TWEEN.update();
    if (pointsRef.current) {
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  useEffect(() => {
    if (shapes.length === 0) return;

    let currentStep = 0;
    let isWarping = false;

    const animateToShape = (stepIndex: number) => {
      if (stepIndex >= shapes.length) {
        // Start Warp
        startWarp();
        return;
      }

      const targetPositions = shapes[stepIndex];
      const positions = geometry.attributes.position.array as Float32Array;

      // Create tweens for each particle
      // Note: animating 3000 particles individually via TWEEN can be heavy.
      // Optimization: Animate a progress variable 0->1 and Lerp in useFrame?
      // Let's do the UseFrame Lerp approach for performance.
    };

    // We will use a controller object to Tween
    const animState = { t: 0, step: 0 };

    // Sequence Logic
    const runSequence = async () => {
      for (let i = 0; i < shapes.length; i++) {
        // Prepare transition
        const startPos = new Float32Array(
          geometry.attributes.position.array as Float32Array,
        );
        const targetPoints = shapes[i];

        // Tween 't' from 0 to 1
        await new Promise<void>((resolve) => {
          const tween = new TWEEN.Tween({ t: 0 })
            .to({ t: 1 }, 1000) // 1 second transform
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(({ t }) => {
              const arr = geometry.attributes.position.array as Float32Array;
              for (let p = 0; p < 3000; p++) {
                // Start coords
                const sx = startPos[p * 3];
                const sy = startPos[p * 3 + 1];
                const sz = startPos[p * 3 + 2];
                // Target coords (wrap around if shape needs fewer points)
                const tp = targetPoints[p % targetPoints.length];

                arr[p * 3] = sx + (tp.x - sx) * t;
                arr[p * 3 + 1] = sy + (tp.y - sy) * t;
                arr[p * 3 + 2] = sz + (tp.z - sz) * t;
              }
            })
            .onComplete(() => resolve())
            .start();
        });

        // Hold for a bit
        await new Promise((r) => setTimeout(r, 500));
      }

      // After loop -> Warp
      startWarp();
    };

    const startWarp = () => {
      // Particles stretch back (Z axis)
      const startPos = new Float32Array(
        geometry.attributes.position.array as Float32Array,
      );
      new TWEEN.Tween({ z: 0 })
        .to({ z: 50 }, 2000)
        .easing(TWEEN.Easing.Exponential.In)
        .onUpdate(({ z }) => {
          const arr = geometry.attributes.position.array as Float32Array;
          for (let p = 0; p < 3000; p++) {
            arr[p * 3 + 2] += z * Math.random(); // Stretch Z
            arr[p * 3] *= 1.05; // Expand out
            arr[p * 3 + 1] *= 1.05;
          }
        })
        .onComplete(() => {
          onComplete();
        })
        .start();
    };

    runSequence();
  }, [shapes, geometry, onComplete]);

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
    >
      <pointsMaterial
        size={0.15}
        color={COLORS.gold}
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// -----------------------------------------------------------------------------
// 2. Fireworks System
// -----------------------------------------------------------------------------
function Fireworks({ onComplete }: { onComplete: () => void }) {
  // A simple firework system
  const system = useRef<
    {
      pos: THREE.Vector3;
      vel: THREE.Vector3;
      life: number;
      color: THREE.Color;
      isParticle: boolean;
    }[]
  >([]);

  const pointsRef = useRef<THREE.Points>(null);
  const MAX_PARTICLES = 2000;

  const [geo] = useState(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3),
    );
    g.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3),
    );
    return g;
  });

  useFrame((state, delta) => {
    // Logic: Spawn rocket -> explode -> particles
    // Simplified: Just spawn explosions for the transition

    if (Math.random() < 0.05 && system.current.length < MAX_PARTICLES - 100) {
      // Spawn Explosion directly for impact
      const color = Math.random() > 0.5 ? COLORS.gold : COLORS.ruby;
      const cx = (Math.random() - 0.5) * 20;
      const cy = (Math.random() - 0.5) * 10;
      const cz = (Math.random() - 0.5) * 10;

      for (let i = 0; i < 50; i++) {
        const vel = new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5,
        )
          .normalize()
          .multiplyScalar(5 + Math.random() * 5);
        system.current.push({
          pos: new THREE.Vector3(cx, cy, cz),
          vel: vel,
          life: 1.0 + Math.random(),
          color: color,
          isParticle: true,
        });
      }
    }

    // Update physics
    let activeCount = 0;
    const positions = geo.attributes.position.array as Float32Array;
    const colors = geo.attributes.color.array as Float32Array;

    for (let i = system.current.length - 1; i >= 0; i--) {
      const p = system.current[i];
      p.life -= delta;
      p.vel.y -= 9.8 * delta * 0.5; // Gravity
      p.pos.addScaledVector(p.vel, delta);

      p.vel.multiplyScalar(0.98); // Drag

      if (p.life <= 0) {
        system.current.splice(i, 1);
      } else {
        positions[activeCount * 3] = p.pos.x;
        positions[activeCount * 3 + 1] = p.pos.y;
        positions[activeCount * 3 + 2] = p.pos.z;

        colors[activeCount * 3] = p.color.r;
        colors[activeCount * 3 + 1] = p.color.g;
        colors[activeCount * 3 + 2] = p.color.b;

        activeCount++;
      }
    }

    geo.setDrawRange(0, activeCount);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  });

  // Auto finish after 5 seconds
  useEffect(() => {
    const t = setTimeout(onComplete, 4000);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <points
      ref={pointsRef}
      geometry={geo}
    >
      <pointsMaterial
        size={0.3}
        vertexColors
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        transparent
        opacity={1}
      />
    </points>
  );
}

// -----------------------------------------------------------------------------
// 3. Main Scene (Cake + Media)
// -----------------------------------------------------------------------------
function CakeScene({
  userTexture,
  festiveGreeting,
}: {
  userTexture: THREE.Texture | null;
  festiveGreeting: string;
}) {
  // 3 Layers of instances
  // Shapes: Sphere, Cylinder, Cone

  const count = 1000; // Particles per layer
  const layers = [
    { radius: 6, y: -4, height: 3 }, // Bottom
    { radius: 4, y: -1, height: 3 }, // Middle
    { radius: 2, y: 2, height: 2 }, // Top
  ];

  // Floating text
  // Floating particles (Gold Dust)

  return (
    <group rotation={[0, 0, 0]}>
      <Center position={[0, 5, 0]}>
        <Text3D
          font={FONT_URL}
          size={0.8}
          height={0.2}
          curveSegments={12}
          bevelEnabled
          bevelThickness={0.02}
          bevelSize={0.02}
          bevelOffset={0}
          bevelSegments={5}
        >
          {festiveGreeting}
          <meshStandardMaterial
            color={COLORS.gold}
            emissive={COLORS.gold}
            emissiveIntensity={2}
            toneMapped={false}
          />
        </Text3D>
      </Center>

      {/* The Cake Structure */}
      {layers.map((layer, idx) => (
        <LayerInstances
          key={idx}
          layerConfig={layer}
        />
      ))}

      {/* User Photo Plane */}
      {userTexture && (
        <group position={[0, 0, 8]}>
          <mesh>
            <planeGeometry args={[4, 3]} />
            <meshBasicMaterial map={userTexture} />
          </mesh>
          {/* Frame */}
          <mesh position={[0, 0, -0.05]}>
            <boxGeometry args={[4.2, 3.2, 0.1]} />
            <meshStandardMaterial
              color={COLORS.gold}
              metalness={1}
              roughness={0.2}
            />
          </mesh>
        </group>
      )}

      {/* Simple Gold Dust */}
      <Stars
        radius={20}
        depth={10}
        count={2000}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />
    </group>
  );
}

function LayerInstances({
  layerConfig,
}: {
  layerConfig: { radius: number; y: number; height: number };
}) {
  // We scatter instances in a cylinder volume
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 400;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    // Maybe slowly rotate the layer?
    meshRef.current.rotation.y = t * 0.1 * (layerConfig.y % 2 === 0 ? 1 : -1);
  });

  useMemo(() => {
    // Initial setup for static positions (or we can animate in useFrame for 'alive' feel)
    // Let's do static for now to save FPS, rotation handled by group
  }, []);

  useEffect(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * layerConfig.radius; // uniform disk distribution
      const h = (Math.random() - 0.5) * layerConfig.height;

      dummy.position.set(
        Math.cos(angle) * r,
        layerConfig.y + h,
        Math.sin(angle) * r,
      );

      const scale = Math.random() * 0.3 + 0.1;
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      // Randomize colors slightly? InstancedMesh needs setColorAt for that
      const colOptions = [
        COLORS.gold,
        COLORS.silver,
        COLORS.ruby,
        COLORS.emerald,
      ];
      const col = colOptions[Math.floor(Math.random() * colOptions.length)];
      meshRef.current.setColorAt(i, col);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor)
      meshRef.current.instanceColor.needsUpdate = true;
  }, [dummy, layerConfig]); // Added dependencies

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
    >
      <sphereGeometry args={[1, 16, 16]} />
      <meshPhysicalMaterial
        metalness={0.9}
        roughness={0.1}
        clearcoat={1}
        clearcoatRoughness={0.1}
      />
    </instancedMesh>
  );
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------
export default function ImmersiveView() {
  const t = useTranslations("Gallery");
  const detailT = useTranslations("AlbumDetail");
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [userTexture, setUserTexture] = useState<THREE.Texture | null>(null);

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (typeof ev.target?.result === "string") {
          const loader = new THREE.TextureLoader();
          loader.load(ev.target.result, (tex) => {
            setUserTexture(tex);
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        background: "#000",
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 15], fov: 60 }}
        gl={{
          antialias: false,
          toneMapping: THREE.ReinhardToneMapping,
          toneMappingExposure: 1.5,
        }}
      >
        <color
          attach='background'
          args={["#000000"]}
        />

        {/* Scene Content based on Phase */}
        <Suspense fallback={null}>
          {phase === "intro" && (
            <IntroCookies onComplete={() => setPhase("warp")} />
          )}

          {phase === "warp" && (
            <Fireworks onComplete={() => setPhase("main")} />
          )}

          {/* For smoother transition, we might want to overlap specific phases or just hard switch. 
                        The prompt says "transition to main scene".
                        'warp' was described as "camera warp", but I simplified to direct transition logic in particle finish.
                        Actually let's mix Fireworks and Warp.
                        Step 2 says: Fireworks trigger AFTER warp.
                    */}

          {/* We can keep Fireworks slightly during Main if we want */}
          {(phase === "fireworks" || phase === "main") && (
            <>
              {phase === "fireworks" && (
                <Fireworks onComplete={() => setPhase("main")} />
              )}
              {phase === "main" && (
                <CakeScene
                  userTexture={userTexture}
                  festiveGreeting={t("festiveGreeting")}
                />
              )}
            </>
          )}

          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <pointLight
            position={[10, 10, 10]}
            intensity={1}
            color={COLORS.gold}
          />
          <pointLight
            position={[-10, -10, -10]}
            intensity={0.5}
            color='blue'
          />

          {/* Post Processing */}
          <EffectComposer enableNormalPass={false}>
            {/* Unreal Bloom style */}
            <Bloom
              luminanceThreshold={0.2}
              mipmapBlur
              intensity={1.5}
              radius={0.6}
            />
          </EffectComposer>

          <OrbitControls
            enableZoom={true}
            autoRotate={phase === "main"}
            autoRotateSpeed={0.5}
          />
        </Suspense>
      </Canvas>

      {/* UI Overlay */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          display: "flex",
          gap: "20px",
          pointerEvents: "none", // Allow click through normally, but buttons need pointer-events-auto
        }}
      >
        {phase === "main" && (
          <div
            style={{
              pointerEvents: "auto",
              background: "rgba(255, 215, 0, 0.1)",
              backdropFilter: "blur(10px)",
              padding: "15px 30px",
              borderRadius: "30px",
              border: "1px solid rgba(255, 215, 0, 0.3)",
            }}
          >
            <label
              style={{
                color: COLORS.gold.getStyle(),
                fontFamily: "sans-serif",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "bold",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              {detailT("uploadPhoto")}
              <input
                type='file'
                accept='image/*'
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
