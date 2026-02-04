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
import { Stars } from "@react-three/drei";
import { Photo } from "./types";
import { ParticleGallery } from "./ParticleGallery";

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

// 使用 Canvas 生成文字粒子位置（支持中文）
const generateCanvasTextParticles = (
  text: string,
  particleCount: number = PARTICLE_COUNT,
  activeRatio: number = 0.95,
  scatterSpread: number = 60,
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

  const measurements = ctx.measureText(text);
  const textWidth = measurements.width;
  const textHeight = fontSize;

  // 增加一些 Padding
  canvas.width = textWidth + 40;
  canvas.height = textHeight + 40;

  // 重新设置 Font (因为调整 Canvas 大小后 Context 会重置)
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

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
  // Scale factor: Canvas pixel -> World Unit
  const scale = 0.2;
  const offsetX = canvas.width / 2;
  const offsetY = canvas.height / 2;

  for (let i = 0; i < particleCount; i++) {
    if (i < activeCount && validPixels.length > 0) {
      // 随机采样有效的像素点
      const idx = Math.floor(Math.random() * (validPixels.length / 2)) * 2;
      const px = validPixels[idx];
      const py = validPixels[idx + 1];

      // 映射到 3D 坐标，Y轴反转 (Canvas Y向下, 3D Y向上)
      // 加入少量随机抖动，避免像素感太强
      positions[i * 3] = (px - offsetX) * scale + (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 1] =
        -(py - offsetY) * scale + (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2.0;
    } else {
      // 散开的粒子
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
  const { camera } = useThree();
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
        // 使用 Canvas 生成粒子
        precomputedParticles.current[txt] = generateCanvasTextParticles(
          txt,
          PARTICLE_COUNT,
        );
        generateNext(index + 1);
      }, 20);
    };
    generateNext(0);
  }, [text]);

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
            target = generateCanvasTextParticles(txt, PARTICLE_COUNT);
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
            void main() { gl_FragColor = vec4(vColor, 1.0) * texture2D(pointTexture, gl_PointCoord); }
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
  const [text, setText] = useState(initialText);

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  if (!isOpen) return null;

  return (
    <div className='absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm'>
      <div className='w-96 bg-black/80 border border-[#FFD700]/30 rounded-xl p-6 shadow-[0_0_30px_rgba(255,215,0,0.1)]'>
        <h3 className='text-[#FFD700] text-lg font-light tracking-widest mb-6 text-center'>
          SETTINGS
        </h3>

        <div className='flex flex-col gap-4'>
          <div>
            <label className='block text-white/50 text-xs uppercase tracking-wider mb-2'>
              Greeting Text
            </label>
            <input
              type='text'
              value={text}
              onChange={(e) => setText(e.target.value)}
              className='w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-[#FFD700] focus:outline-none focus:border-[#FFD700]/50 transition-colors'
              placeholder='Enter text...'
              maxLength={10}
            />
          </div>

          <div className='flex gap-3 mt-4'>
            <button
              onClick={onClose}
              className='flex-1 px-4 py-2 rounded-lg border border-white/10 text-white/50 hover:bg-white/5 hover:text-white transition-all text-sm uppercase tracking-wider'
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(text)}
              className='flex-1 px-4 py-2 rounded-lg bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] hover:bg-[#FFD700]/20 hover:border-[#FFD700]/50 transition-all text-sm uppercase tracking-wider'
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- UI Overlay ---
const UIOverlay = () => {
  return (
    <div className='absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-8'>
      <div />
      <div className='absolute top-1/2 left-8 w-[1px] h-32 bg-gradient-to-b from-transparent via-[#FFD700]/50 to-transparent' />
      <div className='absolute top-1/2 right-8 w-[1px] h-32 bg-gradient-to-b from-transparent via-[#FFD700]/50 to-transparent' />
      <div className='w-full flex justify-center pb-8'>
        <div className='relative px-8 py-3 overflow-hidden rounded-lg backdrop-blur-md bg-black/40 border border-[#FFD700]/10 group'>
          <span className='text-[#FFD700] font-light tracking-[0.3em] text-sm group-hover:text-white transition-colors duration-500'>
            IMMERSIVE EXPERIENCE
          </span>
          <div className='absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#FFD700] to-transparent opacity-50' />
        </div>
      </div>
    </div>
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
}: {
  photos: Photo[];
  currentIndex: number;
  onChangeIndex: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onClose: () => void;
  isActive: boolean;
}) {
  const [scenePhase, setScenePhase] = useState<"intro" | "fireworks" | "main">(
    "intro",
  );
  const [targetText, setTargetText] = useState("2026");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("immersive_greeting_text");
    if (saved) setTargetText(saved);
  }, []);

  useEffect(() => {
    if (isActive) {
      setScenePhase("intro");
      setResetKey((prev) => prev + 1);
    }
  }, [isActive]);

  const handleSaveSettings = (text: string) => {
    setTargetText(text);
    localStorage.setItem("immersive_greeting_text", text);
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
      {scenePhase !== "main" && <UIOverlay />}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialText={targetText}
        onSave={handleSaveSettings}
      />

      {scenePhase === "main" && (
        <>
          {/* 左侧导航按钮 - 上一张 */}
          <button
            onClick={() =>
              onChangeIndex((currentIndex - 1 + photos.length) % photos.length)
            }
            className='absolute left-8 top-1/2 -translate-y-1/2 z-50 w-14 h-14 rounded-full border border-[#FFD700]/30 text-[#FFD700] hover:bg-[#FFD700]/20 hover:border-[#FFD700]/60 backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center'
            aria-label='上一张'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='w-6 h-6'
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
          </button>

          {/* 右侧导航按钮 - 下一张 */}
          <button
            onClick={() => onChangeIndex((currentIndex + 1) % photos.length)}
            className='absolute right-8 top-1/2 -translate-y-1/2 z-50 w-14 h-14 rounded-full border border-[#FFD700]/30 text-[#FFD700] hover:bg-[#FFD700]/20 hover:border-[#FFD700]/60 backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center'
            aria-label='下一张'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='w-6 h-6'
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
          </button>

          {/* 底部控制栏 */}
          <div className='absolute bottom-12 left-1/2 -translate-x-1/2 z-50 flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500'>
            <button
              onClick={onTogglePlay}
              className='px-6 py-2 rounded-full border border-[#FFD700]/50 text-[#FFD700] hover:bg-[#FFD700]/20 backdrop-blur-md transition-all uppercase text-xs tracking-widest font-bold'
            >
              {isPlaying ? "Pause" : "Auto-Play"}
            </button>
            {/* 显示当前图片索引 */}
            <span className='px-4 py-2 rounded-full border border-white/10 text-white/60 backdrop-blur-md text-xs tracking-widest flex items-center'>
              {currentIndex + 1} / {photos.length}
            </span>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className='px-6 py-2 rounded-full border border-white/20 text-white/50 hover:bg-white/10 hover:text-white backdrop-blur-md transition-all uppercase text-xs tracking-widest'
            >
              Settings
            </button>
            <button
              onClick={onClose}
              className='px-6 py-2 rounded-full border border-white/20 text-white/50 hover:bg-white/10 hover:text-white backdrop-blur-md transition-all uppercase text-xs tracking-widest'
            >
              Exit
            </button>
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
            luminanceThreshold={0.2}
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
