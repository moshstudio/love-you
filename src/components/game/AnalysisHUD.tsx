"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Copy, MapPin, Clock, Aperture } from "lucide-react";
import { useTranslations } from "next-intl";

interface AnalysisHUDProps {
  onComplete: () => void;
}

export function AnalysisHUD({ onComplete }: AnalysisHUDProps) {
  const t = useTranslations("Game");
  const [dataLines, setDataLines] = useState<string[]>([]);

  useEffect(() => {
    const lines = Array.from({ length: 13 }, (_, i) => t(`HUD.logs.${i}`));

    let currentLine = 0;
    const interval = setInterval(() => {
      if (currentLine < lines.length) {
        setDataLines((prev) => [...prev, lines[currentLine]]);
        currentLine++;
      } else {
        clearInterval(interval);
        setTimeout(onComplete, 1500);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [onComplete, t]);

  return (
    <div className='w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 z-20'>
      {/* Visual Placeholder (The Image being Scanned) */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        className='aspect-square bg-slate-900/80 border border-slate-700 rounded-lg relative overflow-hidden flex items-center justify-center p-4'
      >
        <div className='absolute inset-4 border border-cyan-500/30 rounded-lg'>
          {/* Crosshairs */}
          <div className='absolute top-0 left-1/2 -translate-x-1/2 h-4 w-px bg-cyan-500/50' />
          <div className='absolute bottom-0 left-1/2 -translate-x-1/2 h-4 w-px bg-cyan-500/50' />
          <div className='absolute left-0 top-1/2 -translate-y-1/2 w-4 h-px bg-cyan-500/50' />
          <div className='absolute right-0 top-1/2 -translate-y-1/2 w-4 h-px bg-cyan-500/50' />
        </div>

        <div className='absolute top-4 right-4 text-xs text-cyan-500 font-mono flex flex-col items-end gap-1'>
          <span>{t("UI.targetLocked")}</span>
          <span className='animate-pulse'>{t("UI.recording")}</span>
        </div>

        <FileImagePlaceholder t={t} />
      </motion.div>

      {/* Data Feed */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        className=' bg-black/60 border-l-2 border-cyan-500 p-6 font-mono text-sm relative'
      >
        <div className='absolute top-0 right-0 p-2 bg-cyan-900/20 text-cyan-400 text-xs'>
          {t("UI.liveFeed")} //
        </div>

        <div className='space-y-4'>
          <div className='grid grid-cols-2 gap-4 mb-8'>
            <Metric
              label={t("HUD.gps")}
              value={t("HUD.locked")}
              icon={MapPin}
              color='text-green-400'
            />
            <Metric
              label={t("HUD.time")}
              value={t("HUD.synced")}
              icon={Clock}
              color='text-yellow-400'
            />
            <Metric
              label={t("HUD.lens")}
              value='24mm'
              icon={Aperture}
              color='text-purple-400'
            />
            <Metric
              label={t("HUD.size")}
              value='4.2MB'
              icon={Copy}
              color='text-blue-400'
            />
          </div>

          <div className='h-64 overflow-y-auto space-y-1 pr-2 scrollbar-hide'>
            {dataLines.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className='text-slate-300 border-b border-slate-800/50 pb-1'
              >
                <span className='text-slate-600 mr-2'>
                  [{i.toString().padStart(2, "0")}]
                </span>
                <span
                  className={
                    // Check if line is the "COMPLETED" line (last one)
                    // We compare with translated string for "COMPLETED" or just check index
                    i === 12 ? "text-green-400 font-bold" : ""
                  }
                >
                  {line}
                </span>
              </motion.div>
            ))}
            <div ref={(el) => el?.scrollIntoView({ behavior: "smooth" })} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Metric({ label, value, icon: Icon, color }: any) {
  return (
    <div className='bg-slate-900/50 p-3 rounded border border-slate-800 flex items-center gap-3'>
      <Icon className={`w-5 h-5 ${color}`} />
      <div>
        <div className='text-[10px] text-slate-500 tracking-wider'>{label}</div>
        <div className='font-bold text-slate-200'>{value}</div>
      </div>
    </div>
  );
}

function FileImagePlaceholder({ t }: { t: any }) {
  return (
    <div className='text-slate-700 flex flex-col items-center'>
      <svg
        fill='none'
        viewBox='0 0 24 24'
        strokeWidth={1}
        stroke='currentColor'
        className='w-24 h-24 mb-2'
      >
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          d='M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z'
        />
      </svg>
      <span className='font-mono text-xs opacity-50'>{t("UI.noData")}</span>
    </div>
  );
}
