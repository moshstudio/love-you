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
  onLoading?: (loading: boolean) => void;
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
  onLoading,
  onError,
  labels,
}: GestureHandlerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasHand, setHasHand] = useState(false);
  const [debugStatus, setDebugStatus] = useState<string>("Initializing...");
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
      if (onLoading) onLoading(true);
      try {
        console.log("[Gesture] Initializing MediaPipe Hand Landmarker...");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm",
        );

        // 尝试使用 GPU，如果失败则回退到 CPU
        let delegate: "GPU" | "CPU" = "GPU";
        try {
          handLandmarkerRef.current = await HandLandmarker.createFromOptions(
            vision,
            {
              baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                delegate: "GPU",
              },
              runningMode: "VIDEO",
              numHands: 1,
              minHandDetectionConfidence: 0.3,
              minHandPresenceConfidence: 0.3,
              minTrackingConfidence: 0.3,
            },
          );
          console.log("[Gesture] Using GPU delegate");
        } catch (gpuError) {
          console.warn(
            "[Gesture] GPU delegate failed, falling back to CPU:",
            gpuError,
          );
          delegate = "CPU";
          handLandmarkerRef.current = await HandLandmarker.createFromOptions(
            vision,
            {
              baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                delegate: "CPU",
              },
              runningMode: "VIDEO",
              numHands: 1,
              minHandDetectionConfidence: 0.3,
              minHandPresenceConfidence: 0.3,
              minTrackingConfidence: 0.3,
            },
          );
          console.log("[Gesture] Using CPU delegate");
        }

        console.log(
          "[Gesture] MediaPipe Hand Landmarker loaded successfully with",
          delegate,
        );
        setIsLoaded(true);
        setDebugStatus("Model Loaded");
        if (onClientReady) onClientReady();
      } catch (error) {
        console.error("[Gesture] Error initializing MediaPipe:", error);
        setError("Failed to load AI models. Please check your connection.");
        setDebugStatus("Model Error");
        if (onError) onError("Failed to load AI models.");
      } finally {
        if (onLoading) onLoading(false);
      }
    };

    if (enabled && !handLandmarkerRef.current) {
      initMediaPipe();
    }
  }, [enabled, onClientReady]);

  // Camera stream
  useEffect(() => {
    let isMounted = true;
    if (!enabled || !isLoaded) {
      if (!enabled) setDebugStatus("Disabled");
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
        setDebugStatus("Starting Camera...");
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

        if (!isMounted) {
          console.log("[Gesture] Component unmounted, stopping stream");
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        console.log("[Gesture] Camera stream obtained successfully");

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            console.log("[Gesture] Video metadata loaded, starting playback");
            videoRef.current
              ?.play()
              .then(() => console.log("[Gesture] Video playback started"))
              .catch((e) => console.error("[Gesture] Video play error:", e));
          };

          let hasStarted = false;
          const onVideoLoaded = () => {
            if (hasStarted) return;
            hasStarted = true;

            console.log(
              "[Gesture] Video data loaded, starting prediction loop",
            );
            setDebugStatus("Running");
            predictWebcam();
          };

          videoRef.current.addEventListener("loadeddata", onVideoLoaded);

          // Fallback: if loadeddata doesn't fire but state is ready (common on some mobile browsers)
          if (videoRef.current.readyState >= 2) {
            console.log("[Gesture] Video ready state check passed");
            onVideoLoaded();
          }
        }
      } catch (err: any) {
        console.error("[Gesture] Error accessing webcam:", err);
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
      isMounted = false;
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [enabled, isLoaded]);

  // 帧率限制（避免过度检测）
  const lastDetectionTime = useRef<number>(0);
  const minDetectionInterval = 50; // 最多每 50ms 检测一次 (约 20fps)
  const frameCount = useRef<number>(0);

  const predictWebcam = async () => {
    if (!handLandmarkerRef.current || !videoRef.current || !canvasRef.current) {
      console.log("[Gesture] Missing refs, skipping frame");
      return;
    }

    if (
      !videoRef.current ||
      !videoRef.current.videoWidth ||
      !videoRef.current.videoHeight
    ) {
      // 视频尚未准备好，继续等待
      // 此处不更新状态以免闪烁，但在 Loop 中如果长期处于此状态说明有问题
      if (enabled) {
        requestRef.current = requestAnimationFrame(predictWebcam);
      }
      return;
    }

    if (canvasRef.current.width !== videoRef.current.videoWidth) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      console.log(
        "[Gesture] Canvas size set to:",
        videoRef.current.videoWidth,
        "x",
        videoRef.current.videoHeight,
      );
    }

    const now = performance.now();

    // 帧率限制：避免过于频繁地检测
    if (now - lastDetectionTime.current < minDetectionInterval) {
      if (enabled) {
        requestRef.current = requestAnimationFrame(predictWebcam);
      }
      return;
    }
    lastDetectionTime.current = now;
    frameCount.current++;

    // 每 60 帧输出一次调试信息
    const shouldLog = frameCount.current % 60 === 0;

    let results;
    try {
      results = handLandmarkerRef.current.detectForVideo(videoRef.current, now);

      if (shouldLog) {
        console.log(
          "[Gesture] Frame",
          frameCount.current,
          "- Detection ran, landmarks:",
          results.landmarks?.length || 0,
        );
      }
    } catch (detectError) {
      console.error("[Gesture] Detection error:", detectError);
      if (enabled) {
        requestRef.current = requestAnimationFrame(predictWebcam);
      }
      return;
    }

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
        if (shouldLog) {
          console.log("[Gesture] Hand detected!");
        }
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

    if (enabled) {
      requestRef.current = requestAnimationFrame(predictWebcam);
    }
  };

  const detectGesture = (landmarks: any[]) => {
    const now = Date.now();

    // 计算两点之间的距离
    const getDistance = (p1: any, p2: any) => {
      return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    };

    // 改进的手指伸展检测：使用指尖到掌根的距离比例
    // 这种方法不依赖手的方向，适用于任何角度
    const wrist = landmarks[0]; // 掌根

    const isFingerExtended = (
      tipIdx: number,
      mcpIdx: number,
      pipIdx: number,
    ) => {
      const tip = landmarks[tipIdx];
      const mcp = landmarks[mcpIdx];
      const pip = landmarks[pipIdx];

      // 计算指尖到MCP（掌指关节）的距离
      const tipToMcp = getDistance(tip, mcp);
      // 计算PIP（近节指关节）到MCP的距离
      const pipToMcp = getDistance(pip, mcp);

      // 如果指尖到MCP的距离大于PIP到MCP距离的1.5倍，则认为手指伸展
      // 这个方法不依赖于手的角度
      return tipToMcp > pipToMcp * 1.5;
    };

    const isThumbExtended = () => {
      const thumbTip = landmarks[4];
      const thumbMcp = landmarks[2];
      const indexMcp = landmarks[5];

      // 拇指伸展：拇指尖到食指MCP的距离大于阈值
      const thumbSpread = getDistance(thumbTip, indexMcp);
      // 拇指尖到拇指MCP的距离
      const thumbLength = getDistance(thumbTip, thumbMcp);

      return thumbSpread > 0.08 || thumbLength > 0.1;
    };

    // 使用正确的 landmark 索引:
    // 食指: tip=8, pip=6, mcp=5
    // 中指: tip=12, pip=10, mcp=9
    // 无名指: tip=16, pip=14, mcp=13
    // 小指: tip=20, pip=18, mcp=17
    const indexExtended = isFingerExtended(8, 5, 6);
    const middleExtended = isFingerExtended(12, 9, 10);
    const ringExtended = isFingerExtended(16, 13, 14);
    const pinkyExtended = isFingerExtended(20, 17, 18);
    const thumbExtended = isThumbExtended();

    const extendedCount = [
      indexExtended,
      middleExtended,
      ringExtended,
      pinkyExtended,
      thumbExtended,
    ].filter(Boolean).length;

    // 调试日志（每秒最多输出一次）
    if (now - (detectGesture as any).lastLogTime > 1000) {
      console.log("[Gesture] Fingers extended:", {
        index: indexExtended,
        middle: middleExtended,
        ring: ringExtended,
        pinky: pinkyExtended,
        thumb: thumbExtended,
        total: extendedCount,
      });
      (detectGesture as any).lastLogTime = now;
    }

    const palmPos = {
      x: landmarks[0].x,
      y: landmarks[0].y,
    };

    // 放宽握拳检测条件：最多2根手指伸展且食指未伸展
    const isFist = extendedCount <= 2 && !indexExtended && !middleExtended;
    // 放宽张开手检测条件：至少4根手指伸展
    const isOpenHand = extendedCount >= 4;
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
        {error
          ? error
          : hasHand
            ? labels?.active || "Gesture Active"
            : debugStatus}
      </div>
    </div>
  );
};
