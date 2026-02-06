"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  HandLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

export interface GestureHandlerProps {
  enabled: boolean;
  onClientReady?: () => void;
  setIsScattered: (val: boolean) => void;
  setFocusedIndex: (cb: (prev: number | null) => number | null) => void;
  onNavigate: (direction: "next" | "prev") => void;
  onPalmDrag?: (deltaX: number, deltaY: number, isDragging: boolean) => void;
  onError?: (error: string) => void;
  labels?: {
    noSupport: string;
    noAccess: string;
    denied: string;
    notFound: string;
    active: string;
  };
}

export const GestureHandler = ({
  enabled,
  onClientReady,
  setIsScattered,
  setFocusedIndex,
  onNavigate,
  onPalmDrag,
  onError,
  labels,
}: GestureHandlerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasHand, setHasHand] = useState(false);
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

  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        console.log("Initializing MediaPipe Hand Landmarker...");
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
            minHandDetectionConfidence: 0.4,
            minHandPresenceConfidence: 0.4,
            minTrackingConfidence: 0.4,
          },
        );

        console.log("MediaPipe Hand Landmarker loaded successfully.");
        setIsLoaded(true);
        if (onClientReady) onClientReady();
      } catch (error) {
        console.error("Error initializing MediaPipe:", error);
        setError("Failed to load AI models. Please check your connection.");
        if (onError) onError("Failed to load AI models.");
      }
    };

    if (enabled && !handLandmarkerRef.current) {
      initMediaPipe();
    }
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

      if (isDragging.current && onPalmDragRef.current) {
        onPalmDragRef.current(0, 0, false);
      }
      lastPalmPos.current = null;
      isDragging.current = false;
      currentDragGesture.current = null;
      lastIndexX.current = null;
      setHasHand(false);

      return;
    }

    const startCamera = async () => {
      try {
        setError(null);
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          const msg = labels?.noSupport || "Browser doesn't support camera";
          setError(msg);
          if (onError) onError(msg);
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current
              ?.play()
              .catch((e) => console.error("Video play error:", e));
          };
          videoRef.current.addEventListener("loadeddata", predictWebcam);
        }
      } catch (err: any) {
        console.error("Error accessing webcam:", err);
        let msg = labels?.noAccess || "Cannot access camera";
        if (err.name === "NotAllowedError") {
          msg = labels?.denied || "Camera permission denied";
        } else if (err.name === "NotFoundError") {
          msg = labels?.notFound || "Camera device not found";
        }
        setError(msg);
        if (onError) onError(msg);
      }
    };

    startCamera();

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

    if (
      !videoRef.current ||
      !videoRef.current.videoWidth ||
      !videoRef.current.videoHeight
    ) {
      if (enabled) {
        requestRef.current = requestAnimationFrame(predictWebcam);
      }
      return;
    }

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

        const handDetected = results.landmarks && results.landmarks.length > 0;
        setHasHand(handDetected);

        if (handDetected) {
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

    const palmPos = {
      x: landmarks[0].x,
      y: landmarks[0].y,
    };

    const isFist = extendedCount <= 1 && !indexExtended;
    const isOpenHand = extendedCount === 5;
    const isDragGesture = isFist || isOpenHand;

    if (isDragGesture && onPalmDragRef.current) {
      const newGestureType = isFist ? "fist" : "open";

      if (currentDragGesture.current !== newGestureType) {
        lastPalmPos.current = null;
        isDragging.current = false;
      }
      currentDragGesture.current = newGestureType;

      if (lastPalmPos.current !== null) {
        const deltaX = (palmPos.x - lastPalmPos.current.x) * -1;
        const deltaY = (palmPos.y - lastPalmPos.current.y) * -1;

        const sensitivity = 3.0;
        const smoothDeltaX = deltaX * sensitivity;
        const smoothDeltaY = deltaY * sensitivity;

        if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) {
          isDragging.current = true;
          onPalmDragRef.current(smoothDeltaX, smoothDeltaY, true);
        }
      }

      lastPalmPos.current = palmPos;
    } else {
      if (isDragging.current && onPalmDragRef.current) {
        onPalmDragRef.current(0, 0, false);
      }
      lastPalmPos.current = null;
      isDragging.current = false;
      currentDragGesture.current = null;
    }

    if (isFist) {
      if (now - lastGestureTime.current > gestureCooldown) {
        setIsScatteredRef.current(false);
        lastGestureTime.current = now;
      }
    }

    if (isOpenHand) {
      if (now - lastGestureTime.current > gestureCooldown) {
        setIsScatteredRef.current(true);
        lastGestureTime.current = now;
      }
    }

    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      const currentX = landmarks[8].x;

      if (lastIndexX.current !== null) {
        const diff = currentX - lastIndexX.current;
        const swipeThreshold = 0.03;

        if (now - lastSwipeTime.current > swipeCooldown) {
          if (diff > swipeThreshold) {
            onNavigateRef.current("next");
            lastSwipeTime.current = now;
            lastGestureTime.current = now;
          } else if (diff < -swipeThreshold) {
            onNavigateRef.current("prev");
            lastSwipeTime.current = now;
            lastGestureTime.current = now;
          }
        }
      }

      if (
        now - lastGestureTime.current > gestureCooldown &&
        now - lastSwipeTime.current > 500
      ) {
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
    <div
      className={`fixed top-20 right-4 md:top-auto md:bottom-8 md:right-8 z-[60] flex flex-col items-center pointer-events-none transition-all duration-500 ${
        hasHand ? "opacity-100 scale-100" : "opacity-30 scale-90"
      }`}
    >
      <div className='relative rounded-xl overflow-hidden border border-white/20 shadow-2xl bg-black/80 backdrop-blur-md'>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className='w-24 h-18 md:w-32 md:h-24 object-cover rotate-y-180 transform -scale-x-100 sticky'
        />
        <canvas
          ref={canvasRef}
          className='absolute inset-0 w-full h-full transform -scale-x-100'
        />
        {hasHand && (
          <div className='absolute inset-0 border-2 border-[#FFD700]/50 rounded-xl animate-pulse pointer-events-none' />
        )}
      </div>
      <div
        className={`mt-2 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full backdrop-blur-md border transition-colors duration-300 ${
          error
            ? "text-red-400 border-red-400/30 bg-red-400/10"
            : hasHand
              ? "text-[#FFD700] border-[#FFD700]/30 bg-[#FFD700]/10"
              : "text-white/40 border-white/10 bg-white/5"
        }`}
      >
        {error ? error : hasHand ? labels?.active || "Gesture Active" : "..."}
      </div>
    </div>
  );
};
