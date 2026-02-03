"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart, Stars, Sparkles, Camera } from "lucide-react";
import { useTranslations } from "next-intl";

interface AnalysisHUDProps {
  onComplete: () => void;
}

const HeartIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox='0 0 24 24'
    fill='currentColor'
    className={className}
  >
    <path d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' />
  </svg>
);

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
      {/* Visual Placeholder (The Memory being integrated) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className='aspect-square glass-panel rounded-3xl relative overflow-hidden flex items-center justify-center p-8'
      >
        <div className='absolute inset-6 border-2 border-dashed border-rose-200/50 rounded-2xl animate-pulse' />

        {/* Decorative Hearts in corners */}
        <HeartIcon className='absolute top-4 left-4 w-4 h-4 text-rose-300 opacity-40' />
        <HeartIcon className='absolute top-4 right-4 w-4 h-4 text-rose-300 opacity-40' />
        <HeartIcon className='absolute bottom-4 left-4 w-4 h-4 text-rose-300 opacity-40' />
        <HeartIcon className='absolute bottom-4 right-4 w-4 h-4 text-rose-300 opacity-40' />

        <div className='absolute top-6 right-6 text-[10px] text-rose-500 font-bold uppercase tracking-widest flex flex-col items-end gap-1'>
          <span>{t("UI.targetLocked")}</span>
          <span className='animate-pulse text-rose-400'>
            {t("UI.recording")}
          </span>
        </div>

        <FileImagePlaceholder t={t} />

        {/* Soft Scan Line */}
        <motion.div
          animate={{ y: [0, 300, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className='absolute left-0 right-0 h-10 bg-gradient-to-b from-transparent via-rose-300/20 to-transparent pointer-events-none'
        />
      </motion.div>

      {/* Data Feed */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className='p-8 rounded-3xl bg-white/30 dark:bg-rose-950/20 border border-rose-100/30 backdrop-blur-md relative overflow-hidden'
      >
        <div className='absolute top-0 right-0 p-3 bg-rose-500 text-white text-[10px] font-bold tracking-widest uppercase rounded-bl-xl'>
          {t("UI.liveFeed")}
        </div>

        <div className='space-y-6'>
          <div className='grid grid-cols-2 gap-3 mb-4'>
            <Metric
              label={t("HUD.gps")}
              value={t("HUD.locked")}
              icon={Heart}
              color='text-rose-500'
            />
            <Metric
              label={t("HUD.time")}
              value={t("HUD.synced")}
              icon={Sparkles}
              color='text-amber-400'
            />
            <Metric
              label={t("HUD.lens")}
              value='Full Focus'
              icon={Camera}
              color='text-purple-400'
            />
            <Metric
              label='Sentiment'
              value='Positive'
              icon={Stars}
              color='text-blue-400'
            />
          </div>

          <div className='h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar'>
            {dataLines.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className='text-rose-700 dark:text-rose-200 text-sm py-1 flex gap-3'
              >
                <Heart className='w-3 h-3 mt-1 text-rose-400 flex-shrink-0' />
                <span
                  className={
                    i === 12 ? "text-rose-600 dark:text-rose-400 font-bold" : ""
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

interface MetricProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

function Metric({ label, value, icon: Icon, color }: MetricProps) {
  return (
    <div className='bg-white/40 dark:bg-black/20 p-3 rounded-2xl border border-rose-100/50 flex items-center gap-3'>
      <Icon className={`w-5 h-5 ${color}`} />
      <div>
        <div className='text-[10px] text-rose-400/80 font-bold uppercase tracking-wider'>
          {label}
        </div>
        <div className='font-bold text-rose-600 dark:text-rose-300 text-xs'>
          {value}
        </div>
      </div>
    </div>
  );
}

function FileImagePlaceholder({ t }: { t: (key: string) => string }) {
  return (
    <div className='text-rose-200 dark:text-rose-800 flex flex-col items-center'>
      <HeartIcon className='w-24 h-24 mb-4 opacity-20' />
      <span className='font-bold text-xs tracking-[0.2em] opacity-50 uppercase'>
        {t("UI.noData")}
      </span>
    </div>
  );
}
