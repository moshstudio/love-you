"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

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
      ctx.fillStyle = "rgba(0, 0, 0, 0.1)"; // Trails
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = 100;

      angle += 0.02;

      // Draw a "Galaxy" or "Tree" structure
      for (let i = 0; i < 50; i++) {
        const offset = (i / 50) * Math.PI * 2;
        const r = radius + Math.sin(angle * 3 + offset * 5) * 20;

        const x = cx + Math.cos(angle + offset) * r;
        const y = cy + Math.sin(angle + offset) * r * 0.5; // Flattened for 3D effect

        const size = Math.sin(angle + offset) * 2 + 3;
        const alpha = (Math.sin(angle + offset) + 1) / 2;

        ctx.beginPath();
        ctx.arc(x, y, size > 0 ? size : 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34, 211, 238, ${alpha})`;
        ctx.fill();

        // Vertical lines for "Tree" feel
        if (i % 5 === 0) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + 50);
          ctx.strokeStyle = `rgba(167, 139, 250, ${alpha * 0.5})`;
          ctx.stroke();
        }
      }

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
    <div className='w-full h-96 relative flex items-center justify-center'>
      <div className='absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10' />
      <canvas
        ref={canvasRef}
        className='w-full h-full'
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className='absolute bottom-10 text-center z-20'
      >
        <h3 className='text-xl font-bold text-white mb-2'>
          {t("memoryStored")}
        </h3>
        <p className='text-cyan-400 text-xs tracking-widest'>
          {t("coordinates")}
        </p>
      </motion.div>
    </div>
  );
}
