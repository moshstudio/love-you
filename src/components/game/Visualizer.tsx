"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";

export function Visualizer() {
  const t = useTranslations("Game.UI");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let angle = 0;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 400;
      canvas.height = canvas.parentElement?.clientHeight || 400;
    };

    const draw = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = 80;

      angle += 0.03;

      // Draw pulsing romantic rings
      for (let i = 0; i < 3; i++) {
        const pulse = Math.sin(angle + i * 2) * 5;
        const r = radius + i * 30 + pulse;
        const alpha = 0.5 - i * 0.15;

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 107, 129, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Add some soft particles on the rings
        for (let j = 0; j < 12; j++) {
          const particleAngle = angle * (i + 1) * 0.5 + (j / 12) * Math.PI * 2;
          const px = cx + Math.cos(particleAngle) * r;
          const py = cy + Math.sin(particleAngle) * r;

          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 182, 193, ${alpha + 0.2})`;
          ctx.fill();
        }
      }

      // Draw a central soft glow
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      gradient.addColorStop(0, "rgba(255, 182, 193, 0.4)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      animationId = requestAnimationFrame(draw);
    };

    window.addEventListener("resize", resize);
    resize();
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className='w-full h-96 relative flex items-center justify-center overflow-visible'>
      <canvas
        ref={canvasRef}
        className='w-full h-full'
      />
      <div className='absolute inset-0 flex items-center justify-center'>
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Heart className='w-20 h-20 text-rose-500 fill-rose-100/50' />
        </motion.div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className='absolute bottom-0 text-center z-20'
      >
        <h3 className='text-3xl font-black text-rose-500 mb-2'>
          {t("memoryStored")}
        </h3>
        <p className='text-rose-300 text-xs font-bold tracking-[0.3em] uppercase'>
          {t("coordinates")}
        </p>
      </motion.div>
    </div>
  );
}
