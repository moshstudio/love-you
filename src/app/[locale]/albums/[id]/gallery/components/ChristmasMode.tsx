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
  Lightformer,
  useTexture,
  Html,
  useProgress,
} from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
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
  LogOut,
} from "lucide-react";
import { Photo } from "./types";
import { EffectType, EffectLogic } from "./effects/types";
import { HeartLogic, HeartScene } from "./effects/HeartEffect";
import { GestureHandler } from "./effects/GestureHandler";
import { GalaxyEffect, GalaxyScene } from "./effects/GalaxyEffect";
import {
  ChristmasTreeScene,
  ChristmasTreeEffectLogic,
} from "./effects/ChristmasTreeEffect"; // Updated import
import { SHARED_TEXT_KEY, DEFAULT_GREETING_TEXT } from "./utils";
import { LoadingOverlay } from "@/components/game/LoadingOverlay";

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

      // Max 85% of view height, max 90% of view width (88% / 90% on narrow)
      const marginH = cam.aspect < 1 ? 0.88 : 0.85;
      const marginW = cam.aspect < 1 ? 0.9 : 0.9;
      let scaleH = vHeight * marginH;
      let scaleW = scaleH * aspectRatio;

      // Clamp width if exceeds viewport
      if (scaleW > vWidth * marginW) {
        scaleW = vWidth * marginW;
        scaleH = scaleW / aspectRatio;
      }

      // 3. Apply updates with proper aspect ratio
      mesh.current.scale.lerp(new THREE.Vector3(scaleW, scaleH, 1), delta * 6);
      mesh.current.position.lerp(targetPos.current, delta * 6);

      // Make photo face the camera perfectly
      mesh.current.quaternion.copy(state.camera.quaternion);
      mesh.current.renderOrder = 100;

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
    mesh.current.renderOrder = 0;

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
    const dist = 12.0;

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
    mesh.current.renderOrder = 50;
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
  initialText?: string;
  albumId?: string;
}

export const ChristmasMode = ({
  photos,
  onClose,
  isActive,
  initialText,
  albumId,
}: ChristmasModeProps) => {
  const t = useTranslations("Gallery");
  const [mode, setMode] = useState<EffectType>("HEART");
  const [color, setColor] = useState("#FFD700");
  const [intensity, setIntensity] = useState(0.8);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScattered, setIsScattered] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [isGestureEnabled, setIsGestureEnabled] = useState(false);
  const [isGestureLoading, setIsGestureLoading] = useState(false);
  const [gestureFeedback, setGestureFeedback] = useState<string | null>(null);

  // 记住切换页面前的手势识别状态，用于恢复
  const gestureEnabledBeforeHiddenRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll thumbnails when index changes
  useEffect(() => {
    if (focusedIndex !== null && scrollContainerRef.current) {
      const activeElement = scrollContainerRef.current.children[
        focusedIndex
      ] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [focusedIndex]);
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

  const { progress, active } = useProgress();
  const [isInitializing, setIsInitializing] = useState(true);

  // 当 R3F 所有的资源（纹理、模型等）加载完成，关闭加载层
  useEffect(() => {
    if (isActive) {
      if (!active && isInitializing) {
        // 500ms 缓冲，确保渲染稳定
        const timer = setTimeout(() => setIsInitializing(false), 500);
        return () => clearTimeout(timer);
      }
    } else {
      setIsInitializing(true);
    }
  }, [isActive, active, isInitializing]);
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

  // 使用惰性初始化从 props 或 localStorage 读取
  const [displayText, setDisplayText] = useState(() => {
    if (initialText) return initialText;
    if (typeof window !== "undefined") {
      const savedText = localStorage.getItem(SHARED_TEXT_KEY);
      return savedText !== null ? savedText : DEFAULT_GREETING_TEXT;
    }
    return DEFAULT_GREETING_TEXT;
  });

  // 当 initialText 改变时更新 displayText (用于分享页面动态更新)
  useEffect(() => {
    if (initialText) {
      setDisplayText(initialText);
    }
  }, [initialText]);

  // Handle saving to database
  useEffect(() => {
    if (!albumId || !isActive) return;

    const timer = setTimeout(async () => {
      try {
        const { albumsApi } = await import("@/lib/api");
        await albumsApi.update(albumId, { customText: displayText });
        console.log("Album custom text updated");
      } catch (error) {
        console.error("Failed to update album custom text", error);
      }
    }, 1000); // 1s debounce

    return () => clearTimeout(timer);
  }, [displayText, albumId, isActive]);

  // 跟踪是否已初始化，避免初始渲染时覆盖
  const isInitializedRef = useRef(false);

  // 持久化 displayText 到 localStorage（仅在用户修改后保存）
  useEffect(() => {
    if (isInitializedRef.current) {
      localStorage.setItem(SHARED_TEXT_KEY, displayText);
    } else {
      isInitializedRef.current = true;
    }
  }, [displayText]);

  // Debug logs removed

  // Double tap logic for touch devices
  const lastTapTime = useRef(0);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const lastToggleTime = useRef(0);

  const handleToggleScattered = useCallback(() => {
    const now = Date.now();
    if (now - lastToggleTime.current < 500) return;
    setIsScattered((prev) => !prev);
    lastToggleTime.current = now;
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const now = Date.now();
    const touch = e.changedTouches[0];
    const distX = Math.abs(touch.clientX - touchStartPos.current.x);
    const distY = Math.abs(touch.clientY - touchStartPos.current.y);

    // If moved more than 10px, it's a drag/pan, not a tap
    if (distX > 10 || distY > 10) return;

    if (now - lastTapTime.current < 300) {
      handleToggleScattered();
      lastTapTime.current = 0; // Reset to avoid triple tap
      if (e.cancelable) e.preventDefault(); // Stop browser dblclick
    } else {
      lastTapTime.current = now;
    }
  };

  const handleNext = () => {
    if (focusedIndex === null) return;
    setFocusedIndex((prev) => (prev! + 1) % photos.length);
  };

  const handlePrev = () => {
    if (focusedIndex === null) return;
    setFocusedIndex((prev) => (prev! - 1 + photos.length) % photos.length);
  };

  const effectOptions = useMemo(
    () => [
      {
        id: "HEART" as EffectType,
        icon: <Heart size={18} />,
        label: t("effects.heart"),
      },
      {
        id: "GALAXY" as EffectType,
        icon: <Orbit size={18} />,
        label: t("effects.galaxy"),
      },
      {
        id: "TREE" as EffectType,
        icon: <Trees size={18} />,
        label: t("effects.christmas"),
      },
    ],
    [t],
  );

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
      className='fixed inset-0 z-50 bg-black text-white font-sans select-none overflow-hidden touch-manipulation'
      style={{
        visibility: isActive ? "visible" : "hidden",
        pointerEvents: isActive ? "auto" : "none",
        touchAction: "manipulation",
      }}
      onDoubleClick={handleToggleScattered}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence>
        {(isInitializing || isGestureLoading) && (
          <LoadingOverlay
            message={
              isGestureLoading ? t("loadingGestures") : t("loadingFestive")
            }
            progress={isGestureLoading ? undefined : progress}
          />
        )}
      </AnimatePresence>
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
          position={[
            0,
            mode === "GALAXY" ? 20 : 10,
            mode === "GALAXY" ? 90 : mode === "TREE" ? 75 : 65,
          ]}
        />
        <ambientLight intensity={0.5} />
        <pointLight
          position={[10, 10, 10]}
          intensity={1}
        />

        <Suspense
          fallback={
            <Html center>
              <LoadingOverlay message={t("initializing")} />
            </Html>
          }
        >
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
            onScatter={() => {
              setIsScattered(true);
              lastToggleTime.current = Date.now();
            }}
          />
          <Environment resolution={256}>
            <group rotation={[-Math.PI / 3, 0, 0]}>
              <Lightformer
                intensity={4}
                rotation-x={Math.PI / 2}
                position={[0, 5, -9]}
                scale={[10, 10, 1]}
              />
              <Lightformer
                intensity={2}
                rotation-y={Math.PI / 2}
                position={[-5, 1, -1]}
                scale={[10, 2, 1]}
              />
              <Lightformer
                intensity={2}
                rotation-y={Math.PI / 2}
                position={[10, 10, 10]}
                scale={[10, 2, 1]}
              />
            </group>
          </Environment>
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

      {/* Main UI Controls */}
      <AnimatePresence>
        {focusedIndex === null && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className='absolute inset-0 pointer-events-none z-50 py-4 md:p-8 flex flex-col justify-end'
          >
            {/* Bottom Control Area */}
            <div className='flex flex-col items-center gap-6 pointer-events-auto'>
              {/* Settings Panel */}
              <AnimatePresence>
                {isMenuOpen && (
                  <>
                    {/* Backdrop */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsMenuOpen(false)}
                      className='fixed inset-0 bg-black/20 backdrop-blur-sm z-[45] pointer-events-auto'
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 100, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 100, scale: 0.95 }}
                      className='w-[92vw] md:w-full md:max-w-xl bg-black/60 backdrop-blur-3xl border border-white/10 rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 md:p-10 shadow-2xl overflow-hidden z-50 mb-0 md:mb-4'
                    >
                      {/* Mobile Drag Handle */}
                      <div className='w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6 md:hidden' />

                      <div className='flex items-center justify-between mb-8'>
                        <div className='flex flex-col'>
                          <h3 className='text-sm font-black uppercase tracking-[0.2em] text-[#FFD700] text-shadow-glow'>
                            {t("settings")}
                          </h3>
                          <span className='text-[10px] text-white/20 uppercase tracking-widest mt-1'>
                            Personalize your experience
                          </span>
                        </div>
                        <button
                          onClick={() => setIsMenuOpen(false)}
                          className='p-2 rounded-full bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all'
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div className='space-y-8'>
                        {/* Mode Selector - Enhanced with Layout Animation */}
                        <div className='space-y-4'>
                          <label className='text-[10px] text-white/30 uppercase tracking-[0.3em] font-black ml-1'>
                            {t("visualMode")}
                          </label>
                          <div className='grid grid-cols-3 gap-3 p-1 bg-white/5 rounded-[1.5rem] border border-white/5'>
                            {effectOptions.map((opt) => {
                              const isSelected = mode === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  onClick={() => setMode(opt.id)}
                                  className={`relative flex flex-col items-center gap-2 py-4 rounded-[1.2rem] transition-all duration-500 ${
                                    isSelected
                                      ? "text-[#FFD700]"
                                      : "text-white/40 hover:text-white"
                                  }`}
                                >
                                  {isSelected && (
                                    <motion.div
                                      layoutId='mode-pill'
                                      className='absolute inset-0 bg-gradient-to-br from-[#FFD700]/20 to-[#FFD700]/5 border border-[#FFD700]/30 rounded-[1.2rem] shadow-lg'
                                      transition={{
                                        type: "spring",
                                        bounce: 0.2,
                                        duration: 0.6,
                                      }}
                                    />
                                  )}
                                  <div
                                    className={`relative z-10 transition-transform duration-500 ${isSelected ? "scale-110" : ""}`}
                                  >
                                    {opt.icon}
                                  </div>
                                  <span className='relative z-10 text-[10px] font-bold uppercase tracking-widest'>
                                    {opt.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Input Field - Refined */}
                        <div className='space-y-3'>
                          <label className='text-[10px] text-white/30 uppercase tracking-[0.3em] font-black ml-1'>
                            {t("customText")}
                          </label>
                          <div className='relative group'>
                            <input
                              type='text'
                              value={displayText}
                              onChange={(e) => setDisplayText(e.target.value)}
                              className='w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:border-[#FFD700]/40 focus:bg-white/10 transition-all placeholder:text-white/10'
                              placeholder={t("enterText")}
                              maxLength={12}
                            />
                            <div className='absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono text-white/10'>
                              {displayText.length}/12
                            </div>
                          </div>
                        </div>

                        {/* Performance / Appearance */}
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                          <div className='space-y-3'>
                            <div className='flex justify-between items-end px-1'>
                              <label className='text-[10px] text-white/30 uppercase tracking-[0.3em] font-black'>
                                {t("intensity")}
                              </label>
                              <span className='text-[10px] font-mono text-[#FFD700] font-bold'>
                                {Math.round(intensity * 100)}%
                              </span>
                            </div>
                            <div className='relative h-6 flex items-center'>
                              <input
                                type='range'
                                min='0'
                                max='1'
                                step='0.01'
                                value={intensity}
                                onChange={(e) =>
                                  setIntensity(parseFloat(e.target.value))
                                }
                                className='w-full accent-[#FFD700] h-1 bg-white/10 rounded-full appearance-none cursor-pointer hover:bg-white/20 transition-all'
                              />
                            </div>
                          </div>

                          <div className='space-y-3'>
                            <label className='text-[10px] text-white/30 uppercase tracking-[0.3em] font-black ml-1 block'>
                              {t("theme")}
                            </label>
                            <div
                              className='relative h-12 rounded-2xl border border-white/10 overflow-hidden flex items-center justify-between px-4 group'
                              style={{
                                background: `linear-gradient(135deg, ${color}22, ${color}11)`,
                              }}
                            >
                              <div className='flex items-center gap-3'>
                                <div
                                  className='w-6 h-6 rounded-full shadow-inner border border-white/20'
                                  style={{ backgroundColor: color }}
                                />
                                <span className='text-[11px] text-white/60 font-mono font-bold tracking-widest'>
                                  {color.toUpperCase()}
                                </span>
                              </div>

                              <div className='relative'>
                                <div className='p-1.5 rounded-lg bg-white/5 text-white/40 group-hover:text-white group-hover:bg-white/10 transition-all'>
                                  <Settings2 size={14} />
                                </div>
                                <input
                                  type='color'
                                  value={color}
                                  onChange={(e) => setColor(e.target.value)}
                                  className='absolute inset-0 opacity-0 cursor-pointer w-full h-full'
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* Control Dock */}
              <div className='w-full max-w-full flex justify-center px-1 md:px-4'>
                <div className='flex items-center gap-1 md:gap-1.5 p-1 md:p-1.5 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl overflow-x-auto no-scrollbar max-w-full'>
                  <div className='flex items-center gap-1 md:gap-1.5 flex-shrink-0'>
                    <DockButton
                      active={isScattered}
                      onClick={() => setIsScattered(!isScattered)}
                      icon={
                        isScattered ? (
                          <Minimize2 size={18} />
                        ) : (
                          <Shuffle size={18} />
                        )
                      }
                      label={isScattered ? t("converge") : t("scatter")}
                    />
                    <div className='w-px h-5 bg-white/10 mx-0.5 sm:mx-1 flex-shrink-0' />

                    {/* 核心特效快捷切换 */}
                    {effectOptions.map((opt) => (
                      <DockButton
                        key={opt.id}
                        active={mode === opt.id}
                        onClick={() => setMode(opt.id)}
                        icon={opt.icon}
                        label={opt.label}
                      />
                    ))}

                    <div className='w-px h-5 bg-white/10 mx-0.5 sm:mx-1 flex-shrink-0' />
                    <DockButton
                      active={isGestureEnabled}
                      onClick={() => setIsGestureEnabled(!isGestureEnabled)}
                      icon={<Hand size={18} />}
                      label={t("gesture")}
                    />
                    <div className='w-px h-5 bg-white/10 mx-0.5 sm:mx-1 flex-shrink-0' />
                    <DockButton
                      active={isMenuOpen}
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      icon={<Settings2 size={18} />}
                      label={t("settings")}
                    />
                    <div className='w-px h-5 bg-white/10 mx-0.5 sm:mx-1 flex-shrink-0' />
                    <DockButton
                      active={false}
                      onClick={() => {
                        if (document.fullscreenElement)
                          document.exitFullscreen();
                        else document.documentElement.requestFullscreen();
                      }}
                      icon={<Maximize2 size={18} />}
                      label={t("fullscreen")}
                    />
                    <div className='w-px h-5 bg-white/10 mx-0.5 sm:mx-1 flex-shrink-0' />
                    <DockButton
                      active={false}
                      onClick={() => onClose?.()}
                      icon={<LogOut size={18} />}
                      label={t("exit")}
                      className='text-red-400/60 hover:text-red-400'
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Info (Auto-fades) */}
      <div className='absolute bottom-6 left-0 right-0 text-center pointer-events-none'>
        <p className='text-[10px] text-[#FFD700]/50 uppercase tracking-[0.3em] font-light animate-pulse'>
          Love You 2026 -{" "}
          {effectOptions.find((o) => o.id === mode)?.label || mode}
        </p>
      </div>

      {/* Navigation Controls (When Focused) */}
      {/* Navigation Controls (When Focused) */}
      <AnimatePresence>
        {focusedIndex !== null && (
          <div className='absolute inset-0 z-50 overflow-hidden pointer-events-none'>
            {/* Backdrop to close - Making it visually empty but keeping click detection */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFocusedIndex(null)}
              className='absolute inset-0 z-0 pointer-events-auto'
            />

            {/* Bottom Close Button for Focused View (Mobile Optimized) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className='absolute bottom-[180px] left-1/2 -translate-x-1/2 z-[60] pointer-events-auto shadow-2xl'
            >
              <button
                onClick={() => setFocusedIndex(null)}
                className='flex items-center gap-2 px-6 py-2.5 rounded-full bg-black/60 border border-white/20 text-white hover:text-[#FFD700] hover:border-[#FFD700]/50 backdrop-blur-xl transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
              >
                <Minimize2 size={18} />
                <span className='text-[11px] font-black uppercase tracking-[0.2em]'>
                  {t("exitFocus")}
                </span>
              </button>
            </motion.div>

            {/* Left/Right Navigation Area - 全屏热区支持 PC 和 移动端 */}
            <div className='absolute inset-x-0 top-0 bottom-[180px] pointer-events-none flex items-center justify-between px-2 md:px-8'>
              {/* Left Area */}
              <div
                className='w-[20%] md:w-[15%] h-full pointer-events-auto cursor-pointer group/nav flex items-center justify-start pl-2 md:pl-0'
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
              >
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className='p-3 md:p-4 rounded-full bg-black/20 hover:bg-black/40 border border-white/5 group-hover/nav:border-[#FFD700]/30 text-white/30 group-hover/nav:text-[#FFD700] backdrop-blur-md transition-all'
                >
                  <ChevronLeft className='w-6 h-6 md:w-8 md:h-8' />
                </motion.div>
              </div>

              {/* Right Area */}
              <div
                className='w-[20%] md:w-[15%] h-full pointer-events-auto cursor-pointer group/nav flex items-center justify-end pr-2 md:pr-0'
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
              >
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className='p-3 md:p-4 rounded-full bg-black/20 hover:bg-black/40 border border-white/5 group-hover/nav:border-[#FFD700]/30 text-white/30 group-hover/nav:text-[#FFD700] backdrop-blur-md transition-all'
                >
                  <ChevronRight className='w-6 h-6 md:w-8 md:h-8' />
                </motion.div>
              </div>
            </div>

            {/* Improved Thumbnail Strip (Bottom) */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className='absolute bottom-0 left-0 right-0 z-50 pointer-events-auto'
            >
              <div className='bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-20 pb-8 px-4'>
                <div className='max-w-4xl mx-auto space-y-4'>
                  <div className='flex justify-center'>
                    <span className='px-4 py-1 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] text-[10px] font-bold tracking-widest'>
                      {focusedIndex + 1} / {photos.length}
                    </span>
                  </div>

                  <div
                    ref={scrollContainerRef}
                    className='flex gap-3 overflow-x-auto pt-4 pb-4 px-4 no-scrollbar scroll-smooth justify-start md:justify-center'
                  >
                    {photos.slice(0, 50).map((photo, index) => (
                      <button
                        key={photo.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFocusedIndex(index);
                        }}
                        className={`relative flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden transition-all duration-300 ${
                          focusedIndex === index
                            ? "ring-2 ring-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.4)] scale-110 -translate-y-1"
                            : "opacity-40 hover:opacity-100 ring-1 ring-white/10"
                        }`}
                      >
                        <img
                          src={
                            photo.url.startsWith("http")
                              ? `/api/image-proxy?url=${encodeURIComponent(photo.url)}`
                              : photo.url
                          }
                          className='w-full h-full object-cover'
                          alt=''
                          loading='lazy'
                        />
                        {focusedIndex === index && (
                          <div className='absolute inset-0 bg-[#FFD700]/10 border border-white/20 rounded-xl' />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <GestureHandler
        enabled={isGestureEnabled}
        setIsScattered={(val: boolean) => {
          // Visual change is obvious enough, no need for text feedback
          setIsScattered(val);
          if (!val) setFocusedIndex(null);
        }}
        setFocusedIndex={(val: (prev: number | null) => number | null) => {
          // Assuming val is updater function from HeartGestureHandler
          // Only show feedback if we are NOT currently focused (focusedIndex === null)
          // If we ARE focused, pinch probably just refreshes or does nothing visible,
          // so avoiding "OK Focused" spam when holding pinch is good.
          if (focusedIndex === null) {
            showFeedback(t("feedback.focused"));
          }
          setFocusedIndex(val);
        }}
        onNavigate={(dir: "next" | "prev") => {
          if (dir === "next") {
            handleNext();
            showFeedback(t("feedback.next"), 800);
          } else {
            handlePrev();
            showFeedback(t("feedback.prev"), 800);
          }
        }}
        onPalmDrag={handlePalmDrag}
        onLoading={setIsGestureLoading}
        onError={(msg: string) => showFeedback(`⚠️ ${msg}`, 3000)}
        labels={{
          noSupport: t("gestures.noSupport"),
          noAccess: t("gestures.noAccess"),
          denied: t("gestures.denied"),
          notFound: t("gestures.notFound"),
          active: t("gestures.active"),
        }}
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
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className='fixed top-24 right-6 w-64 z-40 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 text-white/70 shadow-2xl pointer-events-none hidden md:block'
          >
            <h3 className='text-xs font-bold uppercase tracking-widest border-b border-white/10 pb-2 mb-4 flex items-center gap-2 text-[#FFD700]'>
              <Hand size={14} /> {t("gestureGuide.title")}
            </h3>
            <div className='space-y-4 text-[11px] font-light leading-relaxed'>
              <div className='flex items-center gap-4'>
                <span className='text-xl w-6'>✊</span>
                <div>
                  <p className='font-bold text-white/90'>
                    {t("gestureGuide.converge")}
                  </p>
                  <p className='text-white/40'>
                    {t("gestureGuide.convergeDesc")}
                  </p>
                </div>
              </div>
              <div className='flex items-center gap-4'>
                <span className='text-xl w-6'>✋</span>
                <div>
                  <p className='font-bold text-white/90'>
                    {t("gestureGuide.scatter")}
                  </p>
                  <p className='text-white/40'>
                    {t("gestureGuide.scatterDesc")}
                  </p>
                </div>
              </div>
              <div className='flex items-center gap-4'>
                <span className='text-xl w-6'>👉</span>
                <div>
                  <p className='font-bold text-white/90'>
                    {t("gestureGuide.switch")}
                  </p>
                  <p className='text-white/40'>
                    {t("gestureGuide.switchDesc")}
                  </p>
                </div>
              </div>
              <div className='flex items-center gap-4'>
                <span className='text-xl w-6'>👌</span>
                <div>
                  <p className='font-bold text-white/90'>
                    {t("gestureGuide.select")}
                  </p>
                  <p className='text-white/40'>
                    {t("gestureGuide.selectDesc")}
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

// --- Sub-components for better organization ---
const DockButton = ({
  active,
  onClick,
  icon,
  label,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  className?: string;
}) => (
  <button
    onClick={onClick}
    className={`relative group flex items-center justify-center gap-1 md:gap-2 p-2 sm:px-3 sm:py-2 md:px-4 rounded-full sm:rounded-2xl transition-all duration-300 flex-shrink-0 ${
      active
        ? "bg-[#FFD700]/20 text-[#FFD700] ring-1 ring-[#FFD700]/50"
        : "text-white/40 hover:text-white hover:bg-white/5 active:scale-95"
    } ${className}`}
  >
    <div
      className={`flex items-center justify-center transition-transform duration-300 ${active ? "scale-110" : ""}`}
    >
      {icon}
    </div>
    <span
      className={`text-[10px] font-bold uppercase tracking-[0.1em] overflow-hidden whitespace-nowrap transition-all duration-300 ${
        active
          ? "max-w-0 md:max-w-[80px] opacity-0 md:opacity-100 hidden md:block" // Mobile always hides label
          : "max-w-0 opacity-0 md:group-hover:max-w-[80px] md:group-hover:opacity-100 hidden md:block"
      }`}
    >
      {label}
    </span>
    {active && (
      <motion.div
        layoutId='dock-indicator'
        className='absolute inset-0 bg-[#FFD700]/5 rounded-full sm:rounded-2xl -z-10'
        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
      />
    )}
  </button>
);
