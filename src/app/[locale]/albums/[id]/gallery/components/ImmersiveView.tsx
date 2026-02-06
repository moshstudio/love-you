"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import TWEEN from "@tweenjs/tween.js";
import { Stars, useProgress } from "@react-three/drei";
import { Photo } from "./types";
import { ParticleGallery } from "./ParticleGallery";
import { SHARED_TEXT_KEY, DEFAULT_GREETING_TEXT } from "./utils";
import { LoadingOverlay } from "@/components/game/LoadingOverlay";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

// 向 R3F 注册 TextGeometry - Removed as we use Canvas now
// extend({ TextGeometry });

// --- 配置 ---
const PARTICLE_COUNT = 12000; // Intro particle count
const ACTIVE_PARTICLE_RATIO = 0.95; // 参与组合变换的粒子比例
// ACTIVE_PARTICLE_COUNT is defined below

const ACTIVE_PARTICLE_COUNT = Math.floor(
  PARTICLE_COUNT * ACTIVE_PARTICLE_RATIO,
);

const GOLD_COLOR = new THREE.Color("#FFD700");

// 烟花常量
const FIREWORKS_COUNT = 5;
const PARTICLES_PER_FIREWORK = 400;
const FIREWORK_GRAVITY = -0.025;
const FIREWORK_DRAG = 0.91;
const FIREWORK_COLORS = [
  new THREE.Color("#FFD700"),
  new THREE.Color("#FDB931"),
  new THREE.Color("#FFFFFF"),
  new THREE.Color("#FF4500"),
  new THREE.Color("#C0C0C0"),
];

// --- 辅助函数 ---

// 使用 Canvas 生成文字粒子位置（支持中文，支持自动换行和缩放）
const generateCanvasTextParticles = (
  text: string,
  particleCount: number = PARTICLE_COUNT,
  activeRatio: number = 0.95,
  scatterSpread: number = 60,
  maxWidthUnits: number = 40,
  maxHeightUnits: number = 40,
): Float32Array => {
  if (typeof document === "undefined")
    return new Float32Array(particleCount * 3);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return new Float32Array(particleCount * 3);

  const fontSize = 120;
  // 使用支持中文的系统字体栈
  const fontFamily =
    '"Microsoft YaHei", "Heiti SC", "PingFang SC", "WenQuanYi Micro Hei", sans-serif';
  ctx.font = `bold ${fontSize}px ${fontFamily}`;

  // 1. 自动换行逻辑
  // 计算基础参考宽度：在 0.2 缩放比例下，maxWidthUnits 对应的像素宽度
  const baseScale = 0.2;
  const maxCanvasWidth = (maxWidthUnits * 0.85) / baseScale;
  const lines: string[] = [];

  // 按照字符分割进行换行处理（支持中英文混合）
  const chars = text.split("");
  let currentLine = "";

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const testLine = currentLine + char;
    const testWidth = ctx.measureText(testLine).width;

    // 如果超过最大宽度且当前行不为空且总长度大于1，则换行
    if (
      testWidth > maxCanvasWidth &&
      currentLine.length > 0 &&
      text.length > 1
    ) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);

  // 2. 根据行数计算总宽高
  const lineHeight = fontSize * 1.2;
  const textHeight = lines.length * lineHeight;
  let textWidth = 0;
  lines.forEach((line) => {
    textWidth = Math.max(textWidth, ctx.measureText(line).width);
  });

  // 增加一些 Padding
  canvas.width = textWidth + 80;
  canvas.height = textHeight + 80;

  // 重新设置 Font
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // 逐行绘制
  lines.forEach((line, index) => {
    const y =
      (canvas.height - textHeight) / 2 + index * lineHeight + fontSize / 2;
    ctx.fillText(line, canvas.width / 2, y);
  });

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const validPixels: number[] = [];

  // 获取所有非透明像素坐标
  for (let y = 0; y < canvas.height; y += 2) {
    for (let x = 0; x < canvas.width; x += 2) {
      const i = (y * canvas.width + x) * 4;
      if (data[i + 3] > 128) {
        validPixels.push(x, y);
      }
    }
  }

  const positions = new Float32Array(particleCount * 3);
  const activeCount = Math.floor(particleCount * activeRatio);

  // 3. 动态计算缩放 scale，确保在 3D 空间中不超出屏幕
  let scale = baseScale;
  const worldWidth = canvas.width * scale;
  const worldHeight = canvas.height * scale;

  if (worldWidth > maxWidthUnits * 0.9) {
    scale = (maxWidthUnits * 0.9) / canvas.width;
  }
  if (canvas.height * scale > maxHeightUnits * 0.8) {
    scale = Math.min(scale, (maxHeightUnits * 0.8) / canvas.height);
  }

  const offsetX = canvas.width / 2;
  const offsetY = canvas.height / 2;

  for (let i = 0; i < particleCount; i++) {
    if (i < activeCount && validPixels.length > 0) {
      const idx = Math.floor(Math.random() * (validPixels.length / 2)) * 2;
      const px = validPixels[idx];
      const py = validPixels[idx + 1];

      positions[i * 3] = (px - offsetX) * scale + (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 1] =
        -(py - offsetY) * scale + (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2.0;
    } else {
      positions[i * 3] = (Math.random() - 0.5) * scatterSpread;
      positions[i * 3 + 1] = (Math.random() - 0.5) * scatterSpread;
      positions[i * 3 + 2] = (Math.random() - 0.5) * scatterSpread;
    }
  }

  return positions;
};

// 生成随机爆炸/云场（为 IntroScene 保留此辅助函数）
const generateRandomParticles = (spread: number = 50): Float32Array => {
  const particles = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles[i * 3] = (Math.random() - 0.5) * spread;
    particles[i * 3 + 1] = (Math.random() - 0.5) * spread;
    particles[i * 3 + 2] = (Math.random() - 0.5) * spread;
  }
  return particles;
};

// --- Components ---

const IntroScene = ({
  onSequenceEnd,
  text,
}: {
  onSequenceEnd?: () => void;
  text: string;
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const { camera, viewport } = useThree();
  // Removed font state as we use Canvas now

  const currentPositions = useRef<Float32Array>(generateRandomParticles(100));
  const targetPositions = useRef<Float32Array | null>(null);
  const srcPositions = useRef<Float32Array | null>(null);

  const precomputedParticles = useRef<Record<string, Float32Array>>({});
  const isWarping = useRef(false);
  const warpSpeed = useRef(0);

  // Time ref
  const localTime = useRef(0);
  const sequenceStep = useRef(0);
  const nextStepTime = useRef(1.0); // Start first step at 1s
  const isSequenceActive = useRef(true);

  // Pre-load logic (Canvas based)
  useEffect(() => {
    const sequence = ["5", "4", "3", "2", "1", text];
    const generateNext = (index: number) => {
      if (index >= sequence.length) return;
      const txt = sequence[index];
      if (precomputedParticles.current[txt]) {
        generateNext(index + 1);
        return;
      }
      setTimeout(() => {
        // 使用 Canvas 生成粒子，传入 viewport 宽高以支持适配
        precomputedParticles.current[txt] = generateCanvasTextParticles(
          txt,
          PARTICLE_COUNT,
          ACTIVE_PARTICLE_RATIO,
          60,
          viewport.width,
          viewport.height,
        );
        generateNext(index + 1);
      }, 20);
    };
    generateNext(0);
  }, [text, viewport.width, viewport.height]);

  // Tweens group just for this component instance
  const tweens = useRef(new TWEEN.Group());

  useEffect(() => {
    return () => {
      tweens.current.removeAll();
    };
  }, []);

  const morphTo = useCallback(
    (targetData: Float32Array, duration: number = 1000) => {
      srcPositions.current = Float32Array.from(currentPositions.current);
      targetPositions.current = targetData;

      const tweenState = { t: 0 };
      new TWEEN.Tween(tweenState, tweens.current)
        .to({ t: 1 }, duration)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(() => {
          if (!srcPositions.current || !targetPositions.current) return;
          const output = currentPositions.current;
          const src = srcPositions.current;
          const tgt = targetPositions.current;
          for (let i = 0; i < ACTIVE_PARTICLE_COUNT * 3; i++) {
            output[i] = src[i] + (tgt[i] - src[i]) * tweenState.t;
          }
          if (pointsRef.current) {
            pointsRef.current.geometry.attributes.position.needsUpdate = true;
          }
        })
        .start(localTime.current * 1000); // Start at current local time
    },
    [],
  );

  const triggerWarp = useCallback(() => {
    isWarping.current = true;

    // We must use localTime for these tweens too
    const now = localTime.current * 1000;

    // @ts-ignore
    new TWEEN.Tween(camera.position, tweens.current)
      .to({ z: -100, fov: 100 }, 4000)
      .easing(TWEEN.Easing.Exponential.In)
      .onUpdate(() => camera.updateProjectionMatrix())
      .start(now);

    // @ts-ignore
    new TWEEN.Tween(camera, tweens.current)
      .to({ fov: 100 }, 3000)
      .easing(TWEEN.Easing.Cubic.In)
      .onUpdate(() => camera.updateProjectionMatrix())
      .start(now);

    new TWEEN.Tween({ s: 0 }, tweens.current)
      .to({ s: 5 }, 2000)
      .easing(TWEEN.Easing.Exponential.In)
      .onUpdate((obj) => {
        warpSpeed.current = obj.s;
      })
      .start(now);

    // Instead of setTimeout, we use a delayed tween or just wait in logic
    // But for simplicity/robustness with pause, let's use a dummy tween or check time
    new TWEEN.Tween({}, tweens.current)
      .to({}, 4000)
      .onComplete(() => {
        if (onSequenceEnd) onSequenceEnd();
      })
      .start(now);
  }, [camera, onSequenceEnd]);

  useFrame((state, delta) => {
    const safeDelta = Math.min(delta, 0.1);
    localTime.current += safeDelta;
    const time = localTime.current;

    // Update TWEEN with LOCAL time (converted to ms)
    tweens.current.update(time * 1000);

    // Sequence Logic (replaces setTimeout chain)
    // Sequence Logic
    if (isSequenceActive.current && !isWarping.current) {
      const numbers = ["5", "4", "3", "2", "1", text];

      if (time >= nextStepTime.current) {
        if (sequenceStep.current >= numbers.length) {
          isSequenceActive.current = false;
          triggerWarp();
        } else {
          const txt = numbers[sequenceStep.current];

          let target = precomputedParticles.current[txt];
          if (!target) {
            target = generateCanvasTextParticles(
              txt,
              PARTICLE_COUNT,
              ACTIVE_PARTICLE_RATIO,
              60,
              viewport.width,
              viewport.height,
            );
            precomputedParticles.current[txt] = target;
          }
          morphTo(target, 800);

          sequenceStep.current++;
          nextStepTime.current = time + 1.2; // Next step in 1.2s
        }
      }
    }

    if (pointsRef.current) {
      const positions = pointsRef.current.geometry.attributes.position
        .array as Float32Array;

      if (!isWarping.current) {
        // 整体轻微旋转
        pointsRef.current.rotation.y = Math.sin(time * 0.1) * 0.1;
        pointsRef.current.rotation.x = Math.cos(time * 0.15) * 0.1;

        // 散开粒子（从ACTIVE_PARTICLE_COUNT开始）保持缓慢漂浮移动
        for (let i = ACTIVE_PARTICLE_COUNT; i < PARTICLE_COUNT; i++) {
          const idx = i * 3;
          // 使用正弦函数创造柔和的漂浮效果，每个粒子有不同的相位
          const phase = i * 0.1;
          positions[idx] += Math.sin(time * 0.3 + phase) * 0.005;
          positions[idx + 1] += Math.cos(time * 0.25 + phase * 1.3) * 0.005;
          positions[idx + 2] += Math.sin(time * 0.2 + phase * 0.7) * 0.003;
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
      } else {
        // Warp阶段，所有粒子都参与
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const idx = i * 3;
          if (Math.random() > 0.5) {
            positions[idx + 2] += warpSpeed.current * (Math.random() + 0.5);
          }
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
      }
    }
  });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(currentPositions.current, 3),
    );
    return geo;
  }, []);

  const sprite = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255, 255, 255, 1)");
      grad.addColorStop(0.5, "rgba(255, 215, 0, 0.5)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  return (
    <>
      <points
        ref={pointsRef}
        geometry={geometry}
      >
        <pointsMaterial
          size={0.4}
          map={sprite || undefined}
          transparent={true}
          alphaTest={0.01}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          color={new THREE.Color(10, 8, 0)}
        />
      </points>
      <spotLight
        position={[0, 0, 50]}
        intensity={1}
        color='#FFD700'
      />
    </>
  );
};

// --- 烟花场景 (保留原有逻辑) ---
const FireworksScene = ({
  onComplete,
  continuous = false,
  stopDelay = 5000,
}: {
  onComplete?: () => void;
  continuous?: boolean;
  stopDelay?: number;
}) => {
  const { camera } = useThree();
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = 10000;
  const data = useMemo(() => new Float32Array(particleCount * 10), []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(particleCount * 3), 3),
    );
    geo.setAttribute(
      "aColor",
      new THREE.BufferAttribute(new Float32Array(particleCount * 3), 3),
    );
    geo.setAttribute(
      "size",
      new THREE.BufferAttribute(new Float32Array(particleCount).fill(0), 1),
    );
    return geo;
  }, []);

  const fireworks = useRef<any[]>([]);
  const frameCount = useRef(0);
  const isEnding = useRef(false);

  useEffect(() => {
    camera.position.set(0, 0, 80);
    camera.lookAt(0, 0, 0);
    camera.rotation.set(0, 0, 0);
    if ((camera as THREE.PerspectiveCamera).fov) {
      (camera as THREE.PerspectiveCamera).fov = 60;
      camera.updateProjectionMatrix();
    }
    if (continuous) {
      isEnding.current = false;
    }
    let timer: NodeJS.Timeout;
    if (!continuous) {
      timer = setTimeout(() => {
        isEnding.current = true;
        if (onComplete) setTimeout(onComplete, 2000);
      }, stopDelay);
    }
    return () => clearTimeout(timer);
  }, [camera, onComplete, continuous, stopDelay]);

  const sprite = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, "rgba(255, 255, 255, 1)");
      grad.addColorStop(0.15, "rgba(255, 220, 100, 1)");
      grad.addColorStop(0.4, "rgba(255, 200, 0, 0.4)");
      grad.addColorStop(1, "rgba(255, 100, 0, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 32);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  const launchFirework = useCallback((isInitial = false) => {
    const type =
      Math.random() > 0.6 ? "RING" : Math.random() > 0.5 ? "STAR" : "SPHERE";
    const scale = 0.8 + Math.random() * 1.2;
    const color =
      FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
    const axis = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5,
    ).normalize();

    return {
      x: (Math.random() - 0.5) * 120,
      y: -80,
      z: -30 - Math.random() * 50,
      vx: (Math.random() - 0.5) * 0.2,
      vy: 0.9 + Math.random() * 0.5,
      vz: (Math.random() - 0.5) * 0.2,
      color,
      timer: 0,
      explodeTime: 80 + Math.random() * 50,
      type,
      scale,
      axis,
    };
  }, []);

  useEffect(() => {
    data.fill(0);
    const initialBurstCount = 5;
    for (let b = 0; b < initialBurstCount; b++) {
      fireworks.current.push(launchFirework(true));
    }
  }, [data, launchFirework]);

  const localTime = useRef(0);

  useFrame((state, delta) => {
    const safeDelta = Math.min(delta, 0.1);
    localTime.current += safeDelta;
    const t = localTime.current;
    frameCount.current++;

    if ((continuous || !isEnding.current) && Math.random() < 0.05) {
      fireworks.current.push(launchFirework(false));
    }

    // Update fireworks logic (simplified copy from original)
    for (let i = fireworks.current.length - 1; i >= 0; i--) {
      const fw = fireworks.current[i];
      fw.x += fw.vx;
      fw.y += fw.vy;
      fw.z += fw.vz;
      fw.vy -= 0.005;
      fw.timer++;

      // Trails
      let particlesToSpawn = 3;
      let spawnedCount = 0;
      for (
        let j = 0;
        j < particleCount && spawnedCount < particlesToSpawn;
        j++
      ) {
        const probeIdx = (frameCount.current + j) % particleCount;
        const idx = probeIdx * 10;
        if (data[idx + 6] <= 0) {
          spawnedCount++;
          data[idx] = fw.x + (Math.random() - 0.5) * 0.3;
          data[idx + 1] = fw.y + (Math.random() - 0.5) * 0.3;
          data[idx + 2] = fw.z + (Math.random() - 0.5) * 0.3;
          data[idx + 3] = (Math.random() - 0.5) * 0.1;
          data[idx + 4] = -0.02 - Math.random() * 0.05;
          data[idx + 5] = (Math.random() - 0.5) * 0.1;
          data[idx + 6] = 0.5 + Math.random() * 0.3; // life
          data[idx + 7] = fw.color.r;
          data[idx + 8] = fw.color.g * 0.8;
          data[idx + 9] = fw.color.b;
        }
      }

      if (fw.timer >= fw.explodeTime) {
        const count = PARTICLES_PER_FIREWORK;
        let spawned = 0;
        for (let j = 0; j < particleCount && spawned < count; j++) {
          const probeIdx = (frameCount.current * 13 + j) % particleCount;
          const idx = probeIdx * 10;
          if (data[idx + 6] <= 0) {
            data[idx] = fw.x;
            data[idx + 1] = fw.y;
            data[idx + 2] = fw.z;
            // Simple Sphere explosion for brevity in this re-write, relies on memory
            const speed = (0.8 + Math.random() * 0.8) * fw.scale;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            data[idx + 3] = speed * Math.sin(phi) * Math.cos(theta); // vx
            data[idx + 4] = speed * Math.cos(phi); // vy
            data[idx + 5] = speed * Math.sin(phi) * Math.sin(theta); // vz
            data[idx + 6] = 1.0; // life
            data[idx + 7] = fw.color.r;
            data[idx + 8] = fw.color.g;
            data[idx + 9] = fw.color.b;
            spawned++;
          }
        }
        fireworks.current.splice(i, 1);
      }
    }

    // Update Particles
    const positions = geometry.attributes.position.array as Float32Array;
    const colors = geometry.attributes.aColor.array as Float32Array;
    const sizes = geometry.attributes.size.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 10;
      if (data[idx + 6] > 0) {
        data[idx + 3] *= FIREWORK_DRAG;
        data[idx + 4] *= FIREWORK_DRAG;
        data[idx + 5] *= FIREWORK_DRAG;
        data[idx + 4] += -0.04; // gravity
        data[idx] += data[idx + 3];
        data[idx + 1] += data[idx + 4];
        data[idx + 2] += data[idx + 5];
        data[idx + 6] -= 0.01; // decay

        positions[i * 3] = data[idx];
        positions[i * 3 + 1] = data[idx + 1];
        positions[i * 3 + 2] = data[idx + 2];
        colors[i * 3] = data[idx + 7];
        colors[i * 3 + 1] = data[idx + 8];
        colors[i * 3 + 2] = data[idx + 9];
        sizes[i] = data[idx + 6] * 10.0;
      } else {
        positions[i * 3] = 99999;
        sizes[i] = 0;
      }
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aColor.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
    >
      <shaderMaterial
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{ pointTexture: { value: sprite } }}
        vertexShader={`
            attribute float size; attribute vec3 aColor; varying vec3 vColor;
            void main() { vColor = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (400.0 / -mv.z); gl_Position = projectionMatrix * mv; }
        `}
        fragmentShader={`
            uniform sampler2D pointTexture; varying vec3 vColor;
            void main() { gl_FragColor = vec4(vColor * 3.0, 1.0) * texture2D(pointTexture, gl_PointCoord); }
        `}
      />
    </points>
  );
};

// --- Settings Modal ---
const SettingsModal = ({
  isOpen,
  onClose,
  initialText,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialText: string;
  onSave: (text: string) => void;
}) => {
  const t = useTranslations("Gallery");
  const [text, setText] = useState(initialText);

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className='absolute inset-0 z-[100] flex items-center justify-center p-4'>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className='absolute inset-0 bg-black/40 backdrop-blur-md transition-all duration-300'
          />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className='w-full max-w-sm bg-black/80 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative z-10'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center justify-between mb-8'>
              <h3 className='text-white/90 text-xs font-bold tracking-[0.2em] uppercase'>
                {t("settings")}
              </h3>
              <button
                onClick={onClose}
                className='text-white/40 hover:text-white transition-colors p-2 -mr-2'
              >
                <svg
                  className='w-5 h-5'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={1.5}
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              </button>
            </div>

            <div className='space-y-8'>
              <div className='space-y-3'>
                <label className='block text-white/30 text-[10px] font-bold uppercase tracking-[0.2em] ml-1'>
                  {t("introText")}
                </label>
                <input
                  type='text'
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className='w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-[#FFD700] text-sm focus:outline-none focus:border-[#FFD700]/50 focus:bg-white/10 transition-all placeholder:text-white/20'
                  placeholder={t("enterText")}
                  maxLength={12}
                />
              </div>

              <div className='flex gap-4 pt-4'>
                <button
                  onClick={onClose}
                  className='flex-1 px-4 py-3.5 rounded-2xl border border-white/5 text-white/40 hover:bg-white/5 hover:text-white transition-all text-[11px] font-bold uppercase tracking-widest'
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={() => onSave(text)}
                  className='flex-1 px-4 py-3.5 rounded-2xl bg-[#FFD700] text-black hover:bg-[#FFD700]/90 transition-all text-[11px] font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(255,215,0,0.2)]'
                >
                  {t("save")}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// --- Main Page Component ---
export function ImmersiveView({
  photos,
  currentIndex,
  onChangeIndex,
  isPlaying,
  onTogglePlay,
  onClose,
  isActive,
  initialText,
  albumId,
}: {
  photos: Photo[];
  currentIndex: number;
  onChangeIndex: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onClose: () => void;
  isActive: boolean;
  initialText?: string;
  albumId?: string;
}) {
  const t = useTranslations("Gallery");
  const [scenePhase, setScenePhase] = useState<
    "intro" | "fireworks" | "main" | null
  >(null);
  const [targetText, setTargetText] = useState(
    initialText || DEFAULT_GREETING_TEXT,
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const { progress, active } = useProgress();
  const [isInitializing, setIsInitializing] = useState(true);

  // 当 initialText 改变时更新 targetText
  useEffect(() => {
    if (initialText) {
      setTargetText(initialText);
    }
  }, [initialText]);

  useEffect(() => {
    if (isActive) {
      // 只有在初始加载状态下判断加载是否完成
      // 一旦 isInitializing 变为 false，就不再因为背景资源的加载（如播放时的照片切换）重新开启加载层
      if (!active && isInitializing) {
        const timer = setTimeout(() => setIsInitializing(false), 400);
        return () => clearTimeout(timer);
      }
    } else {
      // 退出沉浸模式时重置状态
      setIsInitializing(true);
    }
  }, [isActive, active, isInitializing]);

  useEffect(() => {
    if (!initialText) {
      const saved = localStorage.getItem(SHARED_TEXT_KEY);
      if (saved) setTargetText(saved);
    }
  }, [initialText]);

  useEffect(() => {
    if (isActive && !isInitializing) {
      // 只有在初始化完成且处于激活状态时，才开始设置场景相位
      if (scenePhase === null) {
        if (!isPlaying) {
          setScenePhase("main");
        } else {
          setScenePhase("intro");
        }
        setResetKey((prev) => prev + 1);
      }
    } else if (!isActive) {
      // 退出激活状态时重置相位
      setScenePhase(null);
    }
  }, [isActive, isInitializing, isPlaying, scenePhase]);

  const handleSaveSettings = async (text: string) => {
    setTargetText(text);
    localStorage.setItem(SHARED_TEXT_KEY, text);

    if (albumId) {
      try {
        const { albumsApi } = await import("@/lib/api");
        await albumsApi.update(albumId, { customText: text });
      } catch (error) {
        console.error("Failed to save custom text to album", error);
      }
    }

    setIsSettingsOpen(false);
  };

  const handleWarpEnd = useCallback(() => {
    setScenePhase("fireworks");
  }, []);

  const handleFireworksEnd = useCallback(() => {
    setScenePhase("main");
  }, []);

  return (
    <div
      className='relative w-full h-screen bg-black overflow-hidden font-sans group'
      style={{
        visibility: isActive ? "visible" : "hidden",
        pointerEvents: isActive ? "auto" : "none",
      }}
    >
      <AnimatePresence>
        {isInitializing && (
          <LoadingOverlay
            message={t("startJourney")}
            progress={progress}
          />
        )}
      </AnimatePresence>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialText={targetText}
        onSave={handleSaveSettings}
      />

      {scenePhase === "main" && (
        <>
          {/* 导航按钮 - 优化后的全屏热区与精致按钮 */}
          {/* 左侧热区 */}
          <div
            className='absolute left-0 top-0 bottom-24 w-[15%] min-w-[60px] md:w-[10%] z-40 group/nav-area cursor-pointer flex items-center justify-start pl-4 md:pl-8'
            onClick={(e) => {
              e.stopPropagation();
              onChangeIndex((currentIndex - 1 + photos.length) % photos.length);
            }}
          >
            <div className='w-12 h-12 md:w-14 md:h-14 rounded-full border border-white/5 text-white/20 group-hover/nav-area:text-[#FFD700] group-hover/nav-area:border-[#FFD700]/30 group-hover/nav-area:bg-[#FFD700]/5 backdrop-blur-sm transition-all flex items-center justify-center group/btn'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                className='w-5 h-5 md:w-6 md:h-6 transition-transform group-hover/btn:-translate-x-1'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={2}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M15 19l-7-7 7-7'
                />
              </svg>
            </div>
          </div>

          {/* 右侧热区 */}
          <div
            className='absolute right-0 top-0 bottom-24 w-[15%] min-w-[60px] md:w-[10%] z-40 group/nav-area cursor-pointer flex items-center justify-end pr-4 md:pr-8'
            onClick={(e) => {
              e.stopPropagation();
              onChangeIndex((currentIndex + 1) % photos.length);
            }}
          >
            <div className='w-12 h-12 md:w-14 md:h-14 rounded-full border border-white/5 text-white/20 group-hover/nav-area:text-[#FFD700] group-hover/nav-area:border-[#FFD700]/30 group-hover/nav-area:bg-[#FFD700]/5 backdrop-blur-sm transition-all flex items-center justify-center group/btn'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                className='w-5 h-5 md:w-6 md:h-6 transition-transform group-hover/btn:translate-x-1'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={2}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M9 5l7 7-7 7'
                />
              </svg>
            </div>
          </div>

          {/* 底部浮动控制带 (Dock) */}
          <div className='absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center p-1.5 bg-black/40 border border-white/10 rounded-2xl backdrop-blur-xl shadow-2xl'>
            <div className='flex items-center gap-1.5 px-2 py-1'>
              <button
                onClick={onTogglePlay}
                className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
                  isPlaying
                    ? "bg-[#FFD700] text-black shadow-[0_0_15px_rgba(255,215,0,0.3)]"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
                title={isPlaying ? t("pause") : t("play")}
              >
                {isPlaying ? (
                  <svg
                    className='w-4 h-4'
                    fill='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <rect
                      x='6'
                      y='4'
                      width='4'
                      height='16'
                    />
                    <rect
                      x='14'
                      y='4'
                      width='4'
                      height='16'
                    />
                  </svg>
                ) : (
                  <svg
                    className='w-4 h-4 ml-0.5'
                    fill='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path d='M8 5v14l11-7z' />
                  </svg>
                )}
              </button>

              <div className='h-4 w-px bg-white/10 mx-1' />

              <span className='flex-shrink-0 px-3 text-[10px] font-medium tracking-[0.2em] text-white/40'>
                {currentIndex + 1} <span className='text-white/20'>/</span>{" "}
                {photos.length}
              </span>

              <div className='h-4 w-px bg-white/10 mx-1' />

              <button
                onClick={() => {
                  if (document.fullscreenElement) document.exitFullscreen();
                  else document.documentElement.requestFullscreen();
                }}
                className='p-2.5 rounded-xl text-white/40 hover:bg-white/10 hover:text-white transition-all'
                title={t("fullscreen")}
              >
                <svg
                  className='w-4 h-4'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5'
                  />
                </svg>
              </button>

              <button
                onClick={() => setIsSettingsOpen(true)}
                className='p-2.5 rounded-xl text-white/40 hover:bg-white/10 hover:text-white transition-all'
                title={t("settings")}
              >
                <svg
                  className='w-4 h-4'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={1.5}
                    d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
                  />
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={1.5}
                    d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                  />
                </svg>
              </button>

              <button
                onClick={onClose}
                className='p-2.5 rounded-xl text-white/40 hover:bg-red-500/20 hover:text-red-400 transition-all flex'
                title={t("exit")}
              >
                <svg
                  className='w-4 h-4'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={1.5}
                    d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
                  />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}

      <Canvas
        frameloop={isActive ? "always" : "never"}
        camera={{ position: [0, 0, 60], fov: 60 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
          alpha: false,
          powerPreference: "high-performance",
        }}
        dpr={[1, 1.5]}
      >
        <color
          args={["#000000"]}
          attach='background'
        />

        <group position={[0, 0, -120]}>
          <Stars
            radius={200}
            depth={50}
            count={5000}
            factor={6}
            saturation={0}
            fade
            speed={1}
          />
        </group>

        {scenePhase === "intro" && (
          <IntroScene
            key={resetKey}
            onSequenceEnd={handleWarpEnd}
            text={targetText}
          />
        )}

        {(scenePhase === "fireworks" || scenePhase === "main") && (
          <FireworksScene
            continuous={scenePhase === "main" && !isPlaying}
            stopDelay={scenePhase === "main" ? 0 : 5000}
            onComplete={handleFireworksEnd}
          />
        )}

        {scenePhase === "main" && (
          <ParticleGallery
            photos={photos}
            currentIndex={currentIndex}
          />
        )}
        <EffectComposer>
          <Bloom
            luminanceThreshold={1.0}
            mipmapBlur
            intensity={1.0}
            radius={0.5}
            levels={8}
          />
          <Vignette
            eskil={false}
            offset={0.1}
            darkness={1.1}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
