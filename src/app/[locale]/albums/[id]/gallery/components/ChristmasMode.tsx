"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  Suspense,
  useCallback,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  Environment,
  useTexture,
} from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
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
import { GalaxyEffect, GalaxyScene } from "./effects/GalaxyEffect";
import {
  ChristmasTreeScene,
  ChristmasTreeEffectLogic,
} from "./effects/ChristmasTreeEffect"; // Updated import

// --- Configuration ---
const PARTICLE_COUNT = 25000;
const PARTICLE_SIZE = 0.12;
const BASE_SPEED = 2.0;
const HEART_SPEED = 8.0;

const EFFECTS: Record<EffectType, EffectLogic> = {
  HEART: HeartLogic,
  GALAXY: GalaxyEffect,
  TREE: ChristmasTreeEffectLogic, // Use dummy logic for map, but we won't render ParticleSystem
};

// --- Gesture Orbit Controls Component ---
interface GestureOrbitControlsProps {
  focusedIndex: number | null;
  gestureDrag: { deltaX: number; deltaY: number; isDragging: boolean };
}

const GestureOrbitControls = ({
  focusedIndex,
  gestureDrag,
}: GestureOrbitControlsProps) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();

  // Accumulator for smooth gesture rotation
  const targetAzimuth = useRef(0);
  const targetPolar = useRef(Math.PI / 2); // Start at horizontal
  const isGestureDragging = useRef(false);

  useFrame((state, delta) => {
    if (!controlsRef.current) return;

    // When gesture dragging starts, capture current angles
    if (gestureDrag.isDragging && !isGestureDragging.current) {
      targetAzimuth.current = controlsRef.current.getAzimuthalAngle();
      targetPolar.current = controlsRef.current.getPolarAngle();
      isGestureDragging.current = true;
      // Disable auto-rotate during gesture drag
      controlsRef.current.autoRotate = false;
    }

    // When gesture dragging ends
    if (!gestureDrag.isDragging && isGestureDragging.current) {
      isGestureDragging.current = false;
      // Re-enable auto-rotate if not focused
      if (focusedIndex === null) {
        controlsRef.current.autoRotate = true;
      }
    }

    // Apply gesture rotation
    if (gestureDrag.isDragging && isGestureDragging.current) {
      // Update target angles based on gesture delta
      // deltaX controls horizontal rotation (azimuthal)
      // deltaY controls vertical rotation (polar)
      targetAzimuth.current += gestureDrag.deltaX * 0.5;
      targetPolar.current += gestureDrag.deltaY * 0.3;

      // Clamp polar angle to prevent flipping
      targetPolar.current = Math.max(
        0.1,
        Math.min(Math.PI - 0.1, targetPolar.current),
      );

      // Get current camera position in spherical coordinates
      const spherical = new THREE.Spherical();
      const offset = new THREE.Vector3();
      offset.copy(camera.position).sub(controlsRef.current.target);
      spherical.setFromVector3(offset);

      // Smoothly interpolate to target angles
      spherical.theta = THREE.MathUtils.lerp(
        spherical.theta,
        targetAzimuth.current,
        delta * 8,
      );
      spherical.phi = THREE.MathUtils.lerp(
        spherical.phi,
        targetPolar.current,
        delta * 8,
      );

      // Apply new position
      offset.setFromSpherical(spherical);
      camera.position.copy(controlsRef.current.target).add(offset);
      camera.lookAt(controlsRef.current.target);

      // Update controls
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableZoom={true}
      autoRotate={focusedIndex === null && !gestureDrag.isDragging}
      autoRotateSpeed={0.5}
      enableDamping
      dampingFactor={0.05}
      maxDistance={100}
      minDistance={5}
    />
  );
};

// --- Particle System Component ---
const ParticleSystem = ({
  mode,
  color,
  intensity,
  isScattered,
}: {
  mode: EffectType;
  color: string;
  intensity: number;
  isScattered?: boolean;
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

  // Accumulate time locally to support pausing
  const localTime = useRef(0);

  useFrame((state, delta) => {
    if (!points.current) return;

    // Cap delta to prevent huge jumps if frame was paused for a long time
    const safeDelta = Math.min(delta, 0.1);
    localTime.current += safeDelta;
    const time = localTime.current;

    const positionsAttr = points.current.geometry.attributes
      .position as THREE.BufferAttribute;
    const currentPositions = positionsAttr.array as Float32Array;

    // Update targets every frame because some effects are time-dependent
    const effect = EFFECTS[mode];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = effect.getTargetPosition(
        i,
        PARTICLE_COUNT,
        false,
        time,
        isScattered,
      );
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
    // Rotate entire system for generic movement
    points.current.rotation.y += 0.02 * delta * intensity;
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
  onScatter,
}: {
  photos: Photo[];
  mode: EffectType;
  isScattered: boolean;
  focusedIndex: number | null;
  onFocus: (index: number | null) => void;
  onScatter: () => void;
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
          onScatter={onScatter}
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
  onScatter,
}: {
  url: string;
  index: number;
  total: number;
  mode: EffectType;
  isScattered: boolean;
  focused: boolean;
  onFocus: () => void;
  onScatter: () => void;
}) => {
  const mesh = useRef<THREE.Mesh>(null);
  const frameMesh = useRef<THREE.Mesh>(null);
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

  // Calculate aspect ratio from texture
  const aspectRatio = useMemo(() => {
    if (tex && tex.image) {
      const img = tex.image as HTMLImageElement;
      return img.width / img.height || 1;
    }
    return 1;
  }, [tex]);

  // Time ref for pause support
  const localTime = useRef(0);

  // Frame glow animation
  const glowIntensity = useRef(0);

  useFrame((state, delta) => {
    if (!mesh.current) return;

    const safeDelta = Math.min(delta, 0.1);
    localTime.current += safeDelta;
    const time = localTime.current;

    const effect = EFFECTS[mode];

    // Focus Logic
    if (focused) {
      // 1. Calculate fixed position relative to camera (HUD-like)
      const dist = 8; // Closer distance for larger appearance

      // Calculate position: Camera Pos + Camera Forward * dist
      const targetVec = new THREE.Vector3(0, 0, -dist);
      targetVec.applyQuaternion(state.camera.quaternion);
      targetVec.add(state.camera.position);

      targetPos.current.copy(targetVec);

      // 2. Calculate Scale to fit 85% of view height at that distance, respecting aspect ratio
      const cam = state.camera as THREE.PerspectiveCamera;
      const fov = cam.fov || 50;
      const vHeight = 2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2) * dist;
      const vWidth = vHeight * cam.aspect;

      // Max 85% of view height, max 90% of view width
      let scaleH = vHeight * 0.85;
      let scaleW = scaleH * aspectRatio;

      // Clamp width if exceeds viewport
      if (scaleW > vWidth * 0.9) {
        scaleW = vWidth * 0.9;
        scaleH = scaleW / aspectRatio;
      }

      // 3. Apply updates with proper aspect ratio
      mesh.current.scale.lerp(new THREE.Vector3(scaleW, scaleH, 1), delta * 6);
      mesh.current.position.lerp(targetPos.current, delta * 6);

      // Make photo face the camera perfectly
      mesh.current.quaternion.copy(state.camera.quaternion);

      // Animate glow
      glowIntensity.current = 0.5 + Math.sin(time * 3) * 0.3;
      if (frameMesh.current) {
        const mat = frameMesh.current.material as THREE.MeshBasicMaterial;
        mat.opacity = glowIntensity.current;
      }

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
        if (!isScattered) {
          onScatter();
        }
        onFocus();
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
        opacity={0.98}
      />
      {/* Premium Glowing Frame - Only show when NOT focused */}
      {!focused && (
        <mesh
          ref={frameMesh}
          position={[0, 0, -0.02]}
        >
          <planeGeometry args={[1.03, 1.03]} />
          <meshBasicMaterial
            color={hovered ? "#FFD700" : "#ffffff"}
            transparent
            opacity={hovered ? 0.5 : 0.15}
          />
        </mesh>
      )}
    </mesh>
  );
};

// --- Focus Overlay Component ---
const FocusOverlay = ({ visible }: { visible: boolean }) => {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state, delta) => {
    if (!mesh.current || !material.current) return;

    // Position behind the image (which is at dist=8)
    const dist = 9.0;

    mesh.current.position.copy(state.camera.position);
    mesh.current.quaternion.copy(state.camera.quaternion);
    mesh.current.translateZ(-dist);

    const cam = state.camera as THREE.PerspectiveCamera;
    // Ensure fov exists
    if (cam.fov) {
      const vHeight =
        2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * dist;
      const vWidth = vHeight * cam.aspect;
      // Scale to fill view with some overflow to be safe
      mesh.current.scale.set(vWidth * 1.5, vHeight * 1.5, 1);
    }

    // Animate Opacity
    const targetOpacity = visible ? 0.7 : 0;
    material.current.opacity = THREE.MathUtils.lerp(
      material.current.opacity,
      targetOpacity,
      delta * 5,
    );
    mesh.current.visible = material.current.opacity > 0.01;
  });

  return (
    <mesh ref={mesh}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        ref={material}
        color='black'
        transparent
        opacity={0}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

interface ChristmasModeProps {
  photos: Photo[];
  onClose?: () => void;
  isActive: boolean;
}

export const ChristmasMode = ({
  photos,
  onClose,
  isActive,
}: ChristmasModeProps) => {
  const [mode, setMode] = useState<EffectType>("HEART");
  const [color, setColor] = useState("#FFD700");
  const [intensity, setIntensity] = useState(0.8);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScattered, setIsScattered] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [isGestureEnabled, setIsGestureEnabled] = useState(false);
  const [gestureFeedback, setGestureFeedback] = useState<string | null>(null);

  // 记住切换页面前的手势识别状态，用于恢复
  const gestureEnabledBeforeHiddenRef = useRef(false);

  // 监听页面可见性变化，当页面隐藏时自动关闭手势识别，返回时恢复
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面隐藏：记住当前状态并关闭手势识别
        gestureEnabledBeforeHiddenRef.current = isGestureEnabled;
        if (isGestureEnabled) {
          setIsGestureEnabled(false);
        }
      } else {
        // 页面可见：如果之前开启了手势识别，则恢复
        if (gestureEnabledBeforeHiddenRef.current) {
          setIsGestureEnabled(true);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isGestureEnabled]);
  const [gestureDrag, setGestureDrag] = useState({
    deltaX: 0,
    deltaY: 0,
    isDragging: false,
  });

  // Callback for gesture palm drag
  const handlePalmDrag = useCallback(
    (deltaX: number, deltaY: number, isDragging: boolean) => {
      setGestureDrag({ deltaX, deltaY, isDragging });
    },
    [],
  );

  // 使用惰性初始化从 localStorage 读取
  const [displayText, setDisplayText] = useState(() => {
    if (typeof window !== "undefined") {
      const savedText = localStorage.getItem("christmasMode_displayText");
      return savedText !== null ? savedText : "2026 521";
    }
    return "2026 521";
  });

  // 跟踪是否已初始化，避免初始渲染时覆盖
  const isInitializedRef = useRef(false);

  // 持久化 displayText 到 localStorage（仅在用户修改后保存）
  useEffect(() => {
    if (isInitializedRef.current) {
      localStorage.setItem("christmasMode_displayText", displayText);
    } else {
      isInitializedRef.current = true;
    }
  }, [displayText]);

  // Debug logs removed

  // Double tap logic for touch devices
  const lastTap = useRef(0);

  const handleTouchStart = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      setIsScattered((prev) => !prev);
    }
    lastTap.current = now;
  };

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
  ];

  // Feedback timeout ref to prevent flickering
  const feedbackTimeoutRef = useRef<any>(null);

  const showFeedback = (text: string, duration = 1500) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setGestureFeedback(text);
    feedbackTimeoutRef.current = setTimeout(
      () => setGestureFeedback(null),
      duration,
    );
  };

  return (
    <div
      className='fixed inset-0 z-50 bg-black text-white font-sans select-none'
      style={{
        visibility: isActive ? "visible" : "hidden",
        pointerEvents: isActive ? "auto" : "none",
      }}
      onDoubleClick={() => setIsScattered((prev) => !prev)}
      onTouchStart={handleTouchStart}
    >
      {/* 3D Canvas */}
      <Canvas
        frameloop={isActive ? "always" : "never"}
        dpr={[1, 2]}
        gl={{
          antialias: false,
          toneMapping: THREE.ReinhardToneMapping,
          toneMappingExposure: 1.0,
        }}
        className='absolute inset-0'
      >
        <PerspectiveCamera
          makeDefault
          position={[0, -10, 65]}
        />
        <ambientLight intensity={0.5} />
        <pointLight
          position={[10, 10, 10]}
          intensity={1}
        />

        <Suspense fallback={null}>
          {mode === "HEART" ? (
            <HeartScene
              isScattered={isScattered}
              displayText={displayText}
              themeColor={color}
              intensity={intensity}
            />
          ) : mode === "TREE" ? (
            <ChristmasTreeScene
              isScattered={isScattered}
              displayText={displayText}
              themeColor={color}
              intensity={intensity}
            />
          ) : mode === "GALAXY" ? (
            <>
              <GalaxyScene
                isScattered={isScattered}
                displayText={displayText}
                themeColor={color}
                intensity={intensity}
              />
              <ParticleSystem
                mode={mode}
                color={color}
                intensity={intensity}
                isScattered={isScattered}
              />
            </>
          ) : (
            <ParticleSystem
              mode={mode}
              color={color}
              intensity={intensity}
              isScattered={isScattered}
            />
          )}

          <FocusOverlay visible={focusedIndex !== null} />
          <PhotoGallery
            photos={photos}
            mode={mode}
            isScattered={isScattered}
            focusedIndex={focusedIndex}
            onFocus={setFocusedIndex}
            onScatter={() => setIsScattered(true)}
          />
          <Environment files='https://cdn.jsdelivr.net/gh/pmndrs/drei-assets@master/hdri/potsdamer_platz_1k.hdr' />
          <EffectComposer>
            <Vignette
              eskil={false}
              offset={0.1}
              darkness={1.1}
            />
          </EffectComposer>
        </Suspense>

        <GestureOrbitControls
          focusedIndex={focusedIndex}
          gestureDrag={gestureDrag}
        />
      </Canvas>

      {/* Modern Minimal Interface */}
      <div className='absolute top-6 right-6 flex flex-col gap-4 items-end z-50 pointer-events-none'>
        {/* Main Toggle & Controls Container */}
        <div
          className='flex items-start gap-4 pointer-events-auto'
          onDoubleClick={(e) => e.stopPropagation()}
        >
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

                  {/* Display Text Input */}
                  <div>
                    <label className='text-[10px] text-[#FFD700]/60 uppercase tracking-widest font-bold mb-3 block border-b border-[#FFD700]/20 pb-1'>
                      Display Text
                    </label>
                    <input
                      type='text'
                      value={displayText}
                      onChange={(e) => setDisplayText(e.target.value)}
                      placeholder='Enter custom text...'
                      className='w-full px-3 py-2 bg-black/50 border border-[#FFD700]/30 rounded-lg text-[#FFD700] text-sm placeholder:text-[#FFD700]/30 focus:outline-none focus:border-[#FFD700] focus:shadow-[0_0_10px_rgba(255,215,0,0.2)] transition-all'
                    />
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
              className='absolute inset-0 z-40 pointer-events-auto cursor-pointer'
            />

            {/* Left Arrow */}
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onDoubleClick={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className='absolute left-4 top-1/2 -translate-y-1/2 z-50 text-[#FFD700] hover:text-white hover:scale-110 transition-all p-3 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-[#FFD700]/40 shadow-[0_0_20px_rgba(255,215,0,0.3)]'
            >
              <ChevronLeft size={36} />
            </motion.button>

            {/* Right Arrow */}
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onDoubleClick={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className='absolute right-4 top-1/2 -translate-y-1/2 z-50 text-[#FFD700] hover:text-white hover:scale-110 transition-all p-3 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-[#FFD700]/40 shadow-[0_0_20px_rgba(255,215,0,0.3)]'
            >
              <ChevronRight size={36} />
            </motion.button>

            {/* Bottom Thumbnail Strip */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              onDoubleClick={(e) => e.stopPropagation()}
              className='absolute bottom-0 left-0 right-0 z-50 pointer-events-auto'
            >
              {/* Gradient background */}
              <div className='bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-8 pb-4'>
                {/* Current Index Indicator */}
                <div className='text-center mb-3'>
                  <span className='text-[#FFD700] text-sm tracking-widest font-light px-4 py-1 bg-black/40 rounded-full border border-[#FFD700]/30'>
                    {focusedIndex + 1} / {photos.length}
                  </span>
                </div>

                {/* Thumbnail Scroll Container */}
                <div className='flex justify-center px-4'>
                  <div className='flex gap-2 overflow-x-auto max-w-[90vw] py-2 px-2 scrollbar-thin scrollbar-thumb-[#FFD700]/40 scrollbar-track-transparent'>
                    {photos.slice(0, 50).map((photo, index) => {
                      const proxiedUrl = photo.url.startsWith("http")
                        ? `/api/image-proxy?url=${encodeURIComponent(photo.url)}`
                        : photo.url;
                      const isActive = focusedIndex === index;

                      return (
                        <motion.button
                          key={photo.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setFocusedIndex(index);
                          }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all duration-300 ${
                            isActive
                              ? "ring-2 ring-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.5)] scale-110"
                              : "ring-1 ring-white/20 hover:ring-[#FFD700]/60 opacity-60 hover:opacity-100"
                          }`}
                        >
                          <img
                            src={proxiedUrl}
                            alt={`Photo ${index + 1}`}
                            className='w-full h-full object-cover'
                            loading='lazy'
                          />
                          {isActive && (
                            <div className='absolute inset-0 bg-[#FFD700]/10' />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <HeartGestureHandler
        enabled={isGestureEnabled}
        setIsScattered={(val) => {
          // Visual change is obvious enough, no need for text feedback
          setIsScattered(val);
          if (!val) setFocusedIndex(null);
        }}
        setFocusedIndex={(val) => {
          // Assuming val is updater function from HeartGestureHandler
          // Only show feedback if we are NOT currently focused (focusedIndex === null)
          // If we ARE focused, pinch probably just refreshes or does nothing visible,
          // so avoiding "OK Focused" spam when holding pinch is good.
          if (focusedIndex === null) {
            showFeedback("👌 Focused");
          }
          setFocusedIndex(val);
        }}
        onNavigate={(dir) => {
          if (dir === "next") {
            handleNext();
            showFeedback("👉 Next", 800);
          } else {
            handlePrev();
            showFeedback("👈 Prev", 800);
          }
        }}
        onPalmDrag={handlePalmDrag}
        onError={(msg) => showFeedback(`⚠️ ${msg}`, 3000)}
      />

      {/* Gesture Feedback Toast */}
      <AnimatePresence>
        {gestureFeedback && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className='fixed bottom-32 left-1/2 -translate-x-1/2 z-[60] pointer-events-none'
          >
            <div className='bg-black/40 backdrop-blur-md border border-[#FFD700]/30 px-5 py-2 rounded-full shadow-lg'>
              <span className='text-sm font-medium text-[#FFD700] tracking-wider flex items-center gap-2'>
                {gestureFeedback}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gesture Guide Panel */}
      <AnimatePresence>
        {isGestureEnabled && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className='fixed bottom-36 right-6 z-40 bg-black/60 backdrop-blur-md border border-[#FFD700]/30 rounded-xl p-4 text-[#FFD700] w-64 shadow-[0_0_20px_rgba(255,215,0,0.15)] pointer-events-none'
          >
            <h3 className='text-xs font-bold uppercase tracking-widest border-b border-[#FFD700]/20 pb-2 mb-3 flex items-center gap-2'>
              <Hand size={14} /> Gesture Guide
            </h3>
            <div className='space-y-3 text-xs font-light'>
              <div className='flex items-center gap-3'>
                <span className='text-xl'>✊</span>
                <div>
                  <p className='font-bold text-[#FFD700]/90'>Converge + Drag</p>
                  <p className='text-[#FFD700]/50 text-[10px]'>
                    Fist to gather, move to rotate
                  </p>
                </div>
              </div>
              <div className='flex items-center gap-3'>
                <span className='text-xl'>✋</span>
                <div>
                  <p className='font-bold text-[#FFD700]/90'>Scatter + Drag</p>
                  <p className='text-[#FFD700]/50 text-[10px]'>
                    Open hand to scatter, move to rotate
                  </p>
                </div>
              </div>
              <div className='flex items-center gap-3'>
                <span className='text-xl'>👉 / 👈</span>
                <div>
                  <p className='font-bold text-[#FFD700]/90'>Navigate</p>
                  <p className='text-[#FFD700]/50 text-[10px]'>
                    Point Left/Right to switch
                  </p>
                </div>
              </div>
              <div className='flex items-center gap-3'>
                <span className='text-xl'>👌</span>
                <div>
                  <p className='font-bold text-[#FFD700]/90'>Select</p>
                  <p className='text-[#FFD700]/50 text-[10px]'>
                    Pinch/OK to focus
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
