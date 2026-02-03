"use client";

import React, { useEffect, useRef, useState, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  Environment,
  useTexture,
} from "@react-three/drei";
import * as THREE from "three";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Maximize2,
  Settings2,
  Heart,
  Trees,
  Orbit,
  Sun,
  Clock,
  Minimize2,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  Hand,
} from "lucide-react";
import { Photo } from "./types";
import { EffectType, EffectLogic } from "./effects/types";
import {
  HeartLogic,
  HeartScene,
  HeartGestureHandler,
} from "./effects/HeartEffect";
import { GalaxyEffect } from "./effects/GalaxyEffect";
import { ChristmasTreeEffect } from "./effects/ChristmasTreeEffect";
import { StarSystemEffect } from "./effects/StarSystemEffect";
import { TimeTravelEffect } from "./effects/TimeTravelEffect";

// --- Configuration ---
const PARTICLE_COUNT = 4000;
const PARTICLE_SIZE = 0.12;
const BASE_SPEED = 2.0;
const HEART_SPEED = 8.0;

const EFFECTS: Record<EffectType, EffectLogic> = {
  HEART: HeartLogic,
  GALAXY: GalaxyEffect,
  TREE: ChristmasTreeEffect,
  STAR_SYSTEM: StarSystemEffect,
  TIME_TRAVEL: TimeTravelEffect,
};

// --- Particle System Component ---
const ParticleSystem = ({
  mode,
  color,
  intensity,
}: {
  mode: EffectType;
  color: string;
  intensity: number;
}) => {
  const points = useRef<THREE.Points>(null);

  // Data for positions and colors
  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const cols = new Float32Array(PARTICLE_COUNT * 3);
    const baseColorObj = new THREE.Color(color);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Init
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50;

      cols[i * 3] = baseColorObj.r;
      cols[i * 3 + 1] = baseColorObj.g;
      cols[i * 3 + 2] = baseColorObj.b;
    }
    return { positions: pos, colors: cols };
  }, []);

  // Target positions ref
  const targetPositions = useMemo(
    () => new Float32Array(PARTICLE_COUNT * 3),
    [],
  );

  // Helper to update colors when mode/color changes
  useEffect(() => {
    if (points.current) {
      const colorsAttr = points.current.geometry.attributes
        .color as THREE.BufferAttribute;
      const effect = EFFECTS[mode];
      const baseColorObj = new THREE.Color(color);

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        // Logic might override color
        let c = baseColorObj;
        if (effect.getParticleColor) {
          c = effect.getParticleColor(i, PARTICLE_COUNT, baseColorObj);
        }
        colorsAttr.setXYZ(i, c.r, c.g, c.b);
      }
      colorsAttr.needsUpdate = true;
    }
  }, [mode, color]);

  useFrame((state, delta) => {
    if (!points.current) return;

    const positionsAttr = points.current.geometry.attributes
      .position as THREE.BufferAttribute;
    const currentPositions = positionsAttr.array as Float32Array;
    const time = state.clock.getElapsedTime();

    // Update targets every frame because some effects are time-dependent
    const effect = EFFECTS[mode];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = effect.getTargetPosition(i, PARTICLE_COUNT, false, time);
      targetPositions[i * 3] = p.x;
      targetPositions[i * 3 + 1] = p.y;
      targetPositions[i * 3 + 2] = p.z;
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3;
      const iy = i * 3 + 1;
      const iz = i * 3 + 2;

      const tx = targetPositions[ix];
      const ty = targetPositions[iy];
      const tz = targetPositions[iz];

      // Breathing/Pulse effect
      // For HEART, we disable generic wave pulse because it has its own synchronous heartbeat in getTargetPosition
      const pulse =
        mode === "HEART" ? 1 : 1 + Math.sin(time * 2 + i) * 0.05 * intensity;

      // Noise
      const noiseAmp = intensity * 0.2;
      const nx = Math.sin(time * 3 + i * 0.1) * noiseAmp;
      const ny = Math.cos(time * 2 + i * 0.2) * noiseAmp;
      const nz = Math.sin(time * 4 + i * 0.3) * noiseAmp;

      const speed = mode === "HEART" ? HEART_SPEED : BASE_SPEED;

      currentPositions[ix] +=
        (tx * pulse + nx - currentPositions[ix]) * speed * delta;
      currentPositions[iy] +=
        (ty * pulse + ny - currentPositions[iy]) * speed * delta;
      currentPositions[iz] +=
        (tz * pulse + nz - currentPositions[iz]) * speed * delta;
    }

    positionsAttr.needsUpdate = true;

    // Rotate entire system for generic movement unless it's Time Travel (user might want straight tunnel)
    // We can add condition if needed, but slow rotation is usually fine
    if (mode !== "TIME_TRAVEL") {
      points.current.rotation.y += 0.02 * delta * intensity;
    } else {
      // Reset rotation for tunnel so we don't get dizzy or it looks wrong
      points.current.rotation.y *= 0.95;
      points.current.rotation.z += 0.05 * delta * intensity; // Barrel roll instead
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach='attributes-position'
          args={[positions, 3]}
        />
        <bufferAttribute
          attach='attributes-color'
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={PARTICLE_SIZE}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

// --- Photo Gallery Component ---
const PhotoGallery = ({
  photos,
  mode,
  isScattered,
  focusedIndex,
  onFocus,
}: {
  photos: Photo[];
  mode: EffectType;
  isScattered: boolean;
  focusedIndex: number | null;
  onFocus: (index: number | null) => void;
}) => {
  if (!photos.length) return null;
  const displayPhotos = useMemo(() => photos.slice(0, 50), [photos]);

  return (
    <group>
      {displayPhotos.map((photo, i) => (
        <PhotoItem
          key={photo.id}
          url={photo.url}
          index={i}
          total={displayPhotos.length}
          mode={mode}
          isScattered={isScattered}
          focused={focusedIndex === i}
          onFocus={() => onFocus(i)}
        />
      ))}
    </group>
  );
};

const PhotoItem = ({
  url,
  index,
  total,
  mode,
  isScattered,
  focused,
  onFocus,
}: {
  url: string;
  index: number;
  total: number;
  mode: EffectType;
  isScattered: boolean;
  focused: boolean;
  onFocus: () => void;
}) => {
  const mesh = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Proxy URL
  const proxiedUrl = useMemo(() => {
    if (!url) return "";
    return url.startsWith("http")
      ? `/api/image-proxy?url=${encodeURIComponent(url)}`
      : url;
  }, [url]);

  const tex = useTexture(proxiedUrl);
  const targetPos = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    if (!mesh.current) return;

    const time = state.clock.getElapsedTime();
    const effect = EFFECTS[mode];

    // Focus Logic
    if (focused) {
      // 1. Calculate fixed position relative to camera (HUD-like)
      const dist = 10; // Fixed distance from camera

      // Calculate position: Camera Pos + Camera Forward * dist
      // Camera forward is (0, 0, -1) in local space
      const targetVec = new THREE.Vector3(0, 0, -dist);
      targetVec.applyQuaternion(state.camera.quaternion);
      targetVec.add(state.camera.position);

      targetPos.current.copy(targetVec);

      // 2. Calculate Scale to fit 60% of view height at that distance
      // Height = 2 * tan(fov / 2) * distance
      // Note: check if camera is perspective
      const cam = state.camera as THREE.PerspectiveCamera;
      const fov = cam.fov || 50;
      const vHeight = 2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2) * dist;
      const scale = vHeight * 0.6;

      // 3. Apply updates
      mesh.current.scale.lerp(
        new THREE.Vector3(scale, scale, scale),
        delta * 5,
      );
      mesh.current.position.lerp(targetPos.current, delta * 5);

      // Make photo face the camera perfectly
      mesh.current.quaternion.copy(state.camera.quaternion);

      return;
    }

    const p = effect.getTargetPosition(index, total, true, time, isScattered);
    targetPos.current.copy(p);

    // Smooth lerp to position
    mesh.current.position.lerp(targetPos.current, delta * 2);

    // Look at camera
    mesh.current.lookAt(state.camera.position);

    // Scale logic
    const baseScale = hovered ? 3.5 : 1.2;
    const float = Math.sin(time * 2 + index) * 0.1;
    const finalScale = baseScale + float;

    mesh.current.scale.lerp(
      new THREE.Vector3(finalScale, finalScale, finalScale),
      delta * 5,
    );
  });

  return (
    <mesh
      ref={mesh}
      onClick={(e) => {
        e.stopPropagation();
        if (isScattered) {
          onFocus();
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={tex}
        side={THREE.DoubleSide}
        transparent
        opacity={0.95}
      />
      {/* Frame */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[1.05, 1.05]} />
        <meshBasicMaterial
          color={focused ? "#FFD700" : "#ffffff"}
          transparent
          opacity={focused ? 0.8 : 0.3}
        />
      </mesh>
    </mesh>
  );
};

interface ChristmasModeProps {
  photos: Photo[];
  onClose?: () => void;
}

export const ChristmasMode = ({ photos, onClose }: ChristmasModeProps) => {
  const [mode, setMode] = useState<EffectType>("HEART");
  const [color, setColor] = useState("#ff4d6d");
  const [intensity, setIntensity] = useState(0.8);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScattered, setIsScattered] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [isGestureEnabled, setIsGestureEnabled] = useState(false);

  const handleNext = () => {
    if (focusedIndex === null) return;
    setFocusedIndex((prev) => (prev! + 1) % photos.length);
  };

  const handlePrev = () => {
    if (focusedIndex === null) return;
    setFocusedIndex((prev) => (prev! - 1 + photos.length) % photos.length);
  };

  const effectOptions: {
    id: EffectType;
    icon: React.ReactNode;
    label: string;
  }[] = [
    { id: "HEART", icon: <Heart size={16} />, label: "Heart" },
    { id: "GALAXY", icon: <Orbit size={16} />, label: "Galaxy" },
    { id: "TREE", icon: <Trees size={16} />, label: "Tree" },
    { id: "STAR_SYSTEM", icon: <Sun size={16} />, label: "System" },
    { id: "TIME_TRAVEL", icon: <Clock size={16} />, label: "Time" },
  ];

  return (
    <div className='fixed inset-0 z-50 bg-black text-white font-sans select-none'>
      {/* 3D Canvas */}
      <Canvas
        dpr={[1, 2]}
        gl={{
          antialias: false,
          toneMapping: THREE.ReinhardToneMapping,
          toneMappingExposure: 1.5,
        }}
        className='absolute inset-0'
      >
        <PerspectiveCamera
          makeDefault
          position={[0, 0, 35]}
        />
        <ambientLight intensity={0.5} />
        <pointLight
          position={[10, 10, 10]}
          intensity={1}
        />

        <Suspense fallback={null}>
          {mode === "HEART" ? (
            <HeartScene isScattered={isScattered} />
          ) : (
            <ParticleSystem
              mode={mode}
              color={color}
              intensity={intensity}
            />
          )}

          <PhotoGallery
            photos={photos}
            mode={mode}
            isScattered={isScattered}
            focusedIndex={focusedIndex}
            onFocus={setFocusedIndex}
          />
          <Environment preset='city' />
          <EffectComposer>
            <Bloom
              luminanceThreshold={0.2}
              mipmapBlur
              luminanceSmoothing={0.0}
              intensity={2.0}
            />
            <Vignette
              eskil={false}
              offset={0.1}
              darkness={1.1}
            />
          </EffectComposer>
        </Suspense>

        <OrbitControls
          enableZoom={true}
          autoRotate={focusedIndex === null} // Disable rotation when locked
          autoRotateSpeed={0.5}
          enableDamping
          dampingFactor={0.05}
          maxDistance={100}
          minDistance={5}
        />
      </Canvas>

      {/* Modern Minimal Interface */}
      <div className='absolute top-6 right-6 flex flex-col gap-4 items-end z-50 pointer-events-none'>
        {/* Main Toggle & Controls Container */}
        <div className='flex items-start gap-4 pointer-events-auto'>
          {/* Settings Panel (Collapsible) */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                className='bg-black/80 backdrop-blur-xl border border-[#FFD700]/30 p-4 rounded-2xl w-64 shadow-[0_0_30px_rgba(255,215,0,0.15)] origin-top-right'
              >
                <div className='space-y-5'>
                  {/* Shape Selector */}
                  <div>
                    <label className='text-[10px] text-[#FFD700]/60 uppercase tracking-widest font-bold mb-3 block border-b border-[#FFD700]/20 pb-1'>
                      Effect Mode
                    </label>
                    <div className='grid grid-cols-3 gap-2'>
                      {effectOptions.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setMode(opt.id)}
                          className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all border ${
                            mode === opt.id
                              ? "bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700] shadow-[0_0_10px_rgba(255,215,0,0.2)]"
                              : "bg-transparent text-[#FFD700]/40 border-transparent hover:bg-[#FFD700]/10 hover:text-[#FFD700]"
                          }`}
                        >
                          {opt.icon}
                          <span className='text-[9px] mt-1'>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sliders & Colors */}
                  <div className='space-y-4'>
                    <div className='flex items-center justify-between'>
                      <span className='text-[10px] text-[#FFD700]/60 uppercase tracking-widest font-bold'>
                        Theme Color
                      </span>
                      <div className='relative'>
                        <div className='w-6 h-6 rounded-full border border-[#FFD700]/40 overflow-hidden relative shadow-[0_0_10px_rgba(255,215,0,0.2)]'>
                          <input
                            type='color'
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 m-0 cursor-pointer opacity-0'
                          />
                          <div
                            className='w-full h-full'
                            style={{ backgroundColor: color }}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className='flex justify-between text-[10px] text-[#FFD700]/60 mb-1'>
                        <span className='uppercase tracking-widest font-bold'>
                          Intensity
                        </span>
                        <span className='font-mono'>
                          {Math.round(intensity * 100)}%
                        </span>
                      </div>
                      <input
                        type='range'
                        min='0'
                        max='1'
                        step='0.01'
                        value={intensity}
                        onChange={(e) =>
                          setIntensity(parseFloat(e.target.value))
                        }
                        className='w-full h-1 bg-[#FFD700]/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[#FFD700] [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 hover:[&::-webkit-slider-thumb]:shadow-[0_0_10px_#FFD700] transition-all'
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Actions Strip */}
          {/* Floating Actions Strip - Gold Theme */}
          <div className='flex flex-col gap-2 pointer-events-auto'>
            <button
              onClick={() => onClose && onClose()}
              className='w-10 h-10 rounded-full border border-[#FFD700]/30 bg-black/40 hover:bg-[#FFD700]/20 text-[#FFD700] flex items-center justify-center backdrop-blur-md transition-all shadow-[0_0_15px_rgba(255,215,0,0.1)]'
              title='Close'
            >
              <X size={20} />
            </button>

            <button
              onClick={() => {
                if (document.fullscreenElement) document.exitFullscreen();
                else document.documentElement.requestFullscreen();
              }}
              className='w-10 h-10 rounded-full border border-[#FFD700]/30 bg-black/40 hover:bg-[#FFD700]/20 text-[#FFD700] flex items-center justify-center backdrop-blur-md transition-all shadow-[0_0_15px_rgba(255,215,0,0.1)]'
              title='Fullscreen'
            >
              <Maximize2 size={18} />
            </button>

            <button
              onClick={() => setIsScattered(!isScattered)}
              className={`w-10 h-10 rounded-full border flex items-center justify-center backdrop-blur-md transition-all shadow-xl ${
                isScattered
                  ? "bg-[#FFD700] text-black border-[#FFD700]"
                  : "bg-black/40 text-[#FFD700] border-[#FFD700]/30 hover:bg-[#FFD700]/20"
              }`}
              title={isScattered ? "Converge" : "Diverge"}
            >
              {isScattered ? <Minimize2 size={20} /> : <Shuffle size={20} />}
            </button>

            <button
              onClick={() => setIsGestureEnabled(!isGestureEnabled)}
              className={`w-10 h-10 rounded-full border flex items-center justify-center backdrop-blur-md transition-all shadow-xl ${
                isGestureEnabled
                  ? "bg-[#FFD700] text-black border-[#FFD700]"
                  : "bg-black/40 text-[#FFD700] border-[#FFD700]/30 hover:bg-[#FFD700]/20"
              }`}
              title='Gestures'
            >
              <Hand size={20} />
            </button>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`w-10 h-10 rounded-full border flex items-center justify-center backdrop-blur-md transition-all shadow-xl ${
                isMenuOpen
                  ? "bg-[#FFD700] text-black border-[#FFD700]"
                  : "bg-black/40 text-[#FFD700] border-[#FFD700]/30 hover:bg-[#FFD700]/20"
              }`}
              title='Settings'
            >
              <Settings2 size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info (Auto-fades) */}
      <div className='absolute bottom-6 left-0 right-0 text-center pointer-events-none'>
        <p className='text-[10px] text-[#FFD700]/50 uppercase tracking-[0.3em] font-light animate-pulse'>
          Love You 2026 - {mode.replace("_", " ")}
        </p>
      </div>

      {/* Navigation Controls (When Focused) */}
      <AnimatePresence>
        {focusedIndex !== null && (
          <>
            {/* Backdrop to close (Invisible touch layer) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFocusedIndex(null)}
              className='absolute inset-0 z-40 bg-transparent pointer-events-auto cursor-pointer'
            />

            {/* Left Arrow */}
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className='absolute left-8 top-1/2 -translate-y-1/2 z-50 text-[#FFD700] hover:text-white transition-colors p-4 rounded-full bg-black/20 hover:bg-black/50 backdrop-blur-md border border-[#FFD700]/30'
            >
              <ChevronLeft size={48} />
            </motion.button>

            {/* Right Arrow */}
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className='absolute right-8 top-1/2 -translate-y-1/2 z-50 text-[#FFD700] hover:text-white transition-colors p-4 rounded-full bg-black/20 hover:bg-black/50 backdrop-blur-md border border-[#FFD700]/30'
            >
              <ChevronRight size={48} />
            </motion.button>

            {/* Current Index Indicator */}
            <div className='absolute bottom-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none'>
              <span className='text-[#FFD700] text-sm tracking-widest font-light'>
                {focusedIndex + 1} / {photos.length}
              </span>
            </div>
          </>
        )}
      </AnimatePresence>

      <HeartGestureHandler
        enabled={isGestureEnabled}
        setIsScattered={setIsScattered}
        setFocusedIndex={setFocusedIndex}
        onNavigate={(dir) => {
          if (dir === "next") handleNext();
          else handlePrev();
        }}
      />
    </div>
  );
};
