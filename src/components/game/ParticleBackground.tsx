"use client";

import { useEffect, useRef } from "react";

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationFrameId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      type: "heart" | "sparkle";
      opacity: number;
      rotation: number;
      rotationSpeed: number;

      constructor() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.size = 0;
        this.color = "";
        this.type = "heart";
        this.opacity = 0;
        this.rotation = 0;
        this.rotationSpeed = 0;

        this.reset();
        // Randomize initial position
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
      }

      reset() {
        this.x = Math.random() * canvas!.width;
        this.y = canvas!.height + 20;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = -(Math.random() * 0.5 + 0.3); // Rise slowly
        this.size = Math.random() * 8 + 4;
        this.opacity = Math.random() * 0.5 + 0.2;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02;
        this.type = Math.random() > 0.3 ? "heart" : "sparkle";

        const colors = [
          "rgba(255, 107, 129, ", // Rose
          "rgba(255, 182, 193, ", // Light Pink
          "rgba(255, 255, 255, ", // White
          "rgba(255, 143, 163, ", // Pastel Pink
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;

        if (this.y < -20) {
          this.reset();
        }
      }

      draw() {
        if (!ctx) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color + "1)";

        if (this.type === "heart") {
          this.drawHeart(0, 0, this.size);
        } else {
          this.drawSparkle(0, 0, this.size / 2);
        }

        ctx.restore();
      }

      drawHeart(x: number, y: number, size: number) {
        ctx!.beginPath();
        const d = size;
        ctx!.moveTo(x, y + d / 4);
        ctx!.bezierCurveTo(x, y, x - d / 2, y, x - d / 2, y + d / 4);
        ctx!.bezierCurveTo(x - d / 2, y + d / 2, x, y + d * 0.75, x, y + d);
        ctx!.bezierCurveTo(
          x,
          y + d * 0.75,
          x + d / 2,
          y + d / 2,
          x + d / 2,
          y + d / 4,
        );
        ctx!.bezierCurveTo(x + d / 2, y, x, y, x, y + d / 4);
        ctx!.fill();
      }

      drawSparkle(x: number, y: number, size: number) {
        ctx!.beginPath();
        for (let i = 0; i < 4; i++) {
          ctx!.rotate(Math.PI / 2);
          ctx!.lineTo(size, 0);
          ctx!.lineTo(0, size / 4);
        }
        ctx!.fill();
      }
    }

    const init = () => {
      particles = [];
      const particleCount = Math.min(window.innerWidth / 20, 50);
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.update();
        p.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener("resize", resize);
    resize();
    init();
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className='fixed inset-0 pointer-events-none z-0'
      style={{
        background:
          "linear-gradient(to bottom, var(--background), var(--secondary))",
      }}
    />
  );
}
