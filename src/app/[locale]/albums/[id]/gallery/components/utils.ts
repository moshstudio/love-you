import * as THREE from "three";

// Configuration
export const GALLERY_PARTICLE_COUNT = 25000; // Increased for higher density
export const CANVAS_WIDTH = 400; // Increased resolution
export const WORLD_SCALE = 90.0;
export const SHARED_TEXT_KEY = "immersive_shared_greeting_text";
export const DEFAULT_GREETING_TEXT = "2026 521";

// Helper to get brightness from color
const getBrightness = (r: number, g: number, b: number) => {
  return 0.299 * r + 0.587 * g + 0.114 * b;
};

interface ParticleData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  ratio: number;
}

// Generate spiral/galaxy distribution for initial state
export const generateGalaxyPositions = (
  count: number,
  spread: number = 100,
): Float32Array => {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2 * 3; // 3 turns
    const radius = Math.random() * spread;
    const spiralOffset = angle * 2.0;

    // Spiral Galaxy shape
    positions[i * 3] = Math.cos(angle + spiralOffset) * radius; // x
    positions[i * 3 + 1] = (Math.random() - 0.5) * (spread * 0.5); // y (thickness)
    positions[i * 3 + 2] = Math.sin(angle + spiralOffset) * radius; // z
  }
  return positions;
};

export const getImageParticleData = (
  url: string,
  targetCount: number = GALLERY_PARTICLE_COUNT,
): Promise<ParticleData> => {
  return new Promise((resolve, reject) => {
    console.log(`[utils] getImageParticleData: Starting for ${url}`);
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = `/api/image-proxy?url=${encodeURIComponent(url)}`;

    img.onload = () => {
      console.log(`[utils] Image loaded: ${img.width}x${img.height}`);
      const ratio = img.width / img.height;

      // Calculate dimensions maintaining aspect ratio
      let w = CANVAS_WIDTH;
      let h = Math.floor(w / ratio);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        console.error("[utils] Failed to get canvas context");
        reject(new Error("Could not create canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h).data;

      // Temporary arrays
      const validPixels: {
        x: number;
        y: number;
        r: number;
        g: number;
        b: number;
        a: number;
        brightness: number;
      }[] = [];
      const totalPixels = w * h;

      // Scan pixels
      // Optimization: stride if too many pixels, but here we want detail
      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        const r = imageData[idx] / 255;
        const g = imageData[idx + 1] / 255;
        const b = imageData[idx + 2] / 255;
        const a = imageData[idx + 3] / 255;

        if (a > 0.1) {
          const x = (i % w) / w - 0.5;
          const y = 0.5 - Math.floor(i / w) / h; // Flip Y

          validPixels.push({
            x: x * WORLD_SCALE,
            y: y * (WORLD_SCALE / ratio),
            r,
            g,
            b,
            a,
            brightness: getBrightness(r, g, b),
          });
        }
      }

      // Shuffle pixels for random distribution when filling buffer
      // Fisher-Yates shuffle
      for (let i = validPixels.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [validPixels[i], validPixels[j]] = [validPixels[j], validPixels[i]];
      }

      console.log(
        `[utils] Valid pixels found: ${validPixels.length} (total scanned: ${totalPixels})`,
      );

      // Fill buffers
      const positions = new Float32Array(targetCount * 3);
      const colors = new Float32Array(targetCount * 3);
      const sizes = new Float32Array(targetCount);

      for (let i = 0; i < targetCount; i++) {
        const ptr = i * 3;

        if (i < validPixels.length) {
          const p = validPixels[i];
          positions[ptr] = p.x;
          positions[ptr + 1] = p.y;
          // Add slight depth based on brightness (Emboss effect)
          positions[ptr + 2] = p.brightness * 5.0;

          colors[ptr] = p.r;
          colors[ptr + 1] = p.g;
          colors[ptr + 2] = p.b;

          // Size based on brightness
          sizes[i] = 0.5 + p.brightness * 1.5;
        } else {
          // If we have more particles than pixels, reuse pixels randomly or hide?
          // Reusing looks better as it keeps volume, but might look cluttered.
          // Let's reset to a "hidden" state or just loop.
          // Hiding is cleaner for crisp text/shapes.

          // Option A: Hide
          sizes[i] = 0.0;
          positions[ptr] = 0;
          positions[ptr + 1] = 0;
          positions[ptr + 2] = 0;

          // Option B: Loop (commented out)
          // const p = validPixels[i % validPixels.length];
          // ...
        }
      }

      resolve({ positions, colors, sizes, ratio });
    };

    img.onerror = (err) => {
      console.error("[utils] Failed to load image for particles", url, err);
      reject(err);
    };
  });
};
