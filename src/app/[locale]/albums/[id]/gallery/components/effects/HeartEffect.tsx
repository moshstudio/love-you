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
      const radius = 22; // Reduced halo radius to keep in view
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
    const finalScale = 0.55;

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
        position={[0, 18, 0]}
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
            font='https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff'
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
              emissive={`#${darkerThemeColor.getHexString()}`}
              emissiveIntensity={0.2 * intensity}
              metalness={0.9}
              roughness={0.1}
              clearcoat={1}
              clearcoatRoughness={0.1}
              toneMapped={false}
            />
          </Text>
          <Text
            fontSize={3}
            color={themeColor}
            font='https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff'
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

      // Scale up to world size (e.g. 15 units wide)
      const scale = 7;

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

// --- Gesture Control Component ---
import {
  HandLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

interface HeartGestureHandlerProps {
  enabled: boolean;
  onClientReady?: () => void;
  setIsScattered: (val: boolean) => void;
  setFocusedIndex: (cb: (prev: number | null) => number | null) => void;
  onNavigate: (direction: "next" | "prev") => void;
  onPalmDrag?: (deltaX: number, deltaY: number, isDragging: boolean) => void;
  onError?: (error: string) => void;
}

export const HeartGestureHandler = ({
  enabled,
  onClientReady,
  setIsScattered,
  setFocusedIndex,
  onNavigate,
  onPalmDrag,
  onError,
}: HeartGestureHandlerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);

  // Keep latest callbacks in refs to avoid stale closures in the animation loop
  const onNavigateRef = useRef(onNavigate);
  const setFocusedIndexRef = useRef(setFocusedIndex);
  const setIsScatteredRef = useRef(setIsScattered);
  const onPalmDragRef = useRef(onPalmDrag);

  useEffect(() => {
    onNavigateRef.current = onNavigate;
    setFocusedIndexRef.current = setFocusedIndex;
    setIsScatteredRef.current = setIsScattered;
    onPalmDragRef.current = onPalmDrag;
  }, [onNavigate, setFocusedIndex, setIsScattered, onPalmDrag]);

  // State for gesture debouncing
  const lastGestureTime = useRef<number>(0);
  const gestureCooldown = 500; // ms
  const swipeCooldown = 800;
  const lastSwipeTime = useRef<number>(0);

  // Swipe detection
  const lastIndexX = useRef<number | null>(null);

  // Palm drag detection (for open hand / fist drag)
  const lastPalmPos = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef<boolean>(false);
  const currentDragGesture = useRef<"fist" | "open" | null>(null);
  const gestureHistory = useRef<number[]>([]); // To smooth out detection jitter

  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm",
        );
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numHands: 1,
          },
        );

        setIsLoaded(true);
        if (onClientReady) onClientReady();
      } catch (error) {
        console.error("Error initializing MediaPipe:", error);
      }
    };

    if (enabled && !handLandmarkerRef.current) {
      initMediaPipe();
    }

    return () => {
      // Cleanup if needed
    };
  }, [enabled, onClientReady]);

  // Camera stream
  useEffect(() => {
    if (!enabled || !isLoaded) {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      if (requestRef.current) cancelAnimationFrame(requestRef.current);

      // Reset drag state when gesture is disabled
      if (isDragging.current && onPalmDragRef.current) {
        onPalmDragRef.current(0, 0, false);
      }
      lastPalmPos.current = null;
      isDragging.current = false;
      currentDragGesture.current = null;
      lastIndexX.current = null;

      return;
    }

    const startCamera = async () => {
      try {
        setError(null);
        // Check if mediaDevices is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          const msg = "浏览器不支持摄像头 (需使用 HTTPS)";
          setError(msg);
          if (onError) onError(msg);
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240 },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener("loadeddata", predictWebcam);
        }
      } catch (err: any) {
        console.error("Error accessing webcam:", err);
        let msg = "无法访问摄像头";
        if (err.name === "NotAllowedError") {
          msg = "摄像头权限被拒绝";
        } else if (err.name === "NotFoundError") {
          msg = "未找到摄像头设备";
        }
        setError(msg);
        if (onError) onError(msg);
      }
    };

    startCamera();

    // Cleanup function to stop tracks when component unmounts or disabled
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [enabled, isLoaded]);

  const predictWebcam = async () => {
    if (!handLandmarkerRef.current || !videoRef.current || !canvasRef.current)
      return;

    // Resize canvas to match video
    if (canvasRef.current.width !== videoRef.current.videoWidth) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
    }

    const startTimeMs = performance.now();
    if (lastVideoTimeRef.current !== videoRef.current.currentTime) {
      lastVideoTimeRef.current = videoRef.current.currentTime;
      const results = handLandmarkerRef.current.detectForVideo(
        videoRef.current,
        startTimeMs,
      );

      const canvasCtx = canvasRef.current.getContext("2d");
      if (canvasCtx) {
        canvasCtx.save();
        canvasCtx.clearRect(
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height,
        );

        // Optional: Draw landmarks
        if (results.landmarks && results.landmarks.length > 0) {
          const drawingUtils = new DrawingUtils(canvasCtx);
          for (const landmarks of results.landmarks) {
            drawingUtils.drawConnectors(
              landmarks,
              HandLandmarker.HAND_CONNECTIONS,
              { color: "#FFD700", lineWidth: 2 },
            );
            drawingUtils.drawLandmarks(landmarks, {
              color: "#FFFFFF",
              lineWidth: 1,
              radius: 2,
            });

            detectGesture(landmarks);
          }
        } else {
          // No hand detected - reset drag state
          if (isDragging.current && onPalmDragRef.current) {
            onPalmDragRef.current(0, 0, false);
          }
          lastPalmPos.current = null;
          isDragging.current = false;
          currentDragGesture.current = null;
          lastIndexX.current = null;
        }
        canvasCtx.restore();
      }
    }

    if (enabled) {
      requestRef.current = requestAnimationFrame(predictWebcam);
    }
  };

  const detectGesture = (landmarks: any[]) => {
    const now = Date.now();

    // Helper to check if finger is extended
    const isFingerExtended = (tipIdx: number, pipIdx: number) => {
      return landmarks[tipIdx].y < landmarks[pipIdx].y;
    };

    const isThumbExtended = () => {
      const thumbTip = landmarks[4];
      const indexMCP = landmarks[5];
      const distance = Math.sqrt(
        Math.pow(thumbTip.x - indexMCP.x, 2) +
          Math.pow(thumbTip.y - indexMCP.y, 2),
      );
      return distance > 0.05;
    };

    const indexExtended = isFingerExtended(8, 6);
    const middleExtended = isFingerExtended(12, 10);
    const ringExtended = isFingerExtended(16, 14);
    const pinkyExtended = isFingerExtended(20, 18);
    const thumbExtended = isThumbExtended();

    const extendedCount = [
      indexExtended,
      middleExtended,
      ringExtended,
      pinkyExtended,
      thumbExtended,
    ].filter(Boolean).length;

    // Get palm center (wrist landmark 0)
    const palmPos = {
      x: landmarks[0].x,
      y: landmarks[0].y,
    };

    // Determine current gesture type for drag
    const isFist = extendedCount <= 1 && !indexExtended;
    const isOpenHand = extendedCount === 5;
    const isDragGesture = isFist || isOpenHand;

    // Handle palm drag for fist or open hand gestures
    if (isDragGesture && onPalmDragRef.current) {
      const newGestureType = isFist ? "fist" : "open";

      // If gesture type changed, reset drag state
      if (currentDragGesture.current !== newGestureType) {
        lastPalmPos.current = null;
        isDragging.current = false;
      }
      currentDragGesture.current = newGestureType;

      if (lastPalmPos.current !== null) {
        const deltaX = (palmPos.x - lastPalmPos.current.x) * -1; // Invert X for natural feel (mirror effect)
        const deltaY = (palmPos.y - lastPalmPos.current.y) * -1; // Invert Y for natural feel

        // Apply sensitivity multiplier for smoother control
        const sensitivity = 3.0;
        const smoothDeltaX = deltaX * sensitivity;
        const smoothDeltaY = deltaY * sensitivity;

        // Only trigger drag if movement is significant
        if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) {
          isDragging.current = true;
          onPalmDragRef.current(smoothDeltaX, smoothDeltaY, true);
        }
      }

      lastPalmPos.current = palmPos;
    } else {
      // Not a drag gesture, reset drag state
      if (isDragging.current && onPalmDragRef.current) {
        onPalmDragRef.current(0, 0, false);
      }
      lastPalmPos.current = null;
      isDragging.current = false;
      currentDragGesture.current = null;
    }

    // Logic 1: Fist (0 or 1 finger) -> Heart (Aggregate)
    // Only trigger state change on gesture start, not during drag
    if (isFist) {
      if (now - lastGestureTime.current > gestureCooldown) {
        setIsScatteredRef.current(false);
        lastGestureTime.current = now;
      }
    }

    // Logic 2: Open Hand (5 fingers) -> Scatter
    // Only trigger state change on gesture start, not during drag
    if (isOpenHand) {
      if (now - lastGestureTime.current > gestureCooldown) {
        setIsScatteredRef.current(true);
        lastGestureTime.current = now;
      }
    }

    // Logic 3: Index Finger Only -> Select / Navigate
    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      // Action A: Select (Focus) - Only if not swiping
      // We'll prioritize swiping. If movement is minimal, then select.

      const currentX = landmarks[8].x;

      if (lastIndexX.current !== null) {
        const diff = currentX - lastIndexX.current;
        // Increase threshold slightly to avoid accidental swipes during "select"
        const swipeThreshold = 0.03;

        if (now - lastSwipeTime.current > swipeCooldown) {
          // Invert logic:
          // Raw Diff > 0 means x increased (moved to Camera's RIGHT, which is USER'S LEFT).
          // User: "Move Left 👈: Switches to the Next photo." -> So Diff > 0 -> Next.

          if (diff > swipeThreshold) {
            onNavigateRef.current("next");
            lastSwipeTime.current = now;
            // Also update gesture time to prevent selection triggering immediately after
            lastGestureTime.current = now;
          } else if (diff < -swipeThreshold) {
            onNavigateRef.current("prev");
            lastSwipeTime.current = now;
            lastGestureTime.current = now;
          }
        }
      }

      // Select only if stable
      if (
        now - lastGestureTime.current > gestureCooldown &&
        now - lastSwipeTime.current > 500
      ) {
        // Wait after swipe
        setFocusedIndexRef.current((prev: number | null) =>
          prev !== null ? prev : 0,
        );
        lastGestureTime.current = now;
      }

      lastIndexX.current = currentX;
    } else {
      lastIndexX.current = null;
    }
  };

  if (!enabled) return null;

  return (
    <div className='fixed bottom-4 right-4 z-50 flex flex-col items-center pointer-events-none'>
      <div className='relative rounded-lg overflow-hidden border-2 border-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.3)] bg-black'>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className='w-32 h-24 object-cover rotate-y-180 transform -scale-x-100'
        />
        <canvas
          ref={canvasRef}
          className='absolute inset-0 w-full h-full transform -scale-x-100'
        />
      </div>
      <div
        className={`mt-2 text-xs font-mono bg-black/50 px-2 py-1 rounded backdrop-blur-sm ${error ? "text-red-400 border border-red-400/30" : "text-[#FFD700]"}`}
      >
        {error ? error : "Gesture Active"}
      </div>
    </div>
  );
};
