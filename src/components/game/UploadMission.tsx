"use client";

import { useState, useRef, DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

interface UploadMissionProps {
  onComplete: (file: File) => void;
  onBack: () => void;
}

export function UploadMission({ onComplete, onBack }: UploadMissionProps) {
  const t = useTranslations("Game.UI");
  const [isDragging, setIsDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;

    setScanning(true);
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 5;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setTimeout(() => onComplete(file), 500);
      }
      setProgress(p);
    }, 50);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className='w-full max-w-2xl mx-auto p-4 z-20'>
      <div className='flex justify-between items-center mb-10 border-b border-rose-100/50 pb-4'>
        <h2 className='text-2xl text-rose-500 font-black tracking-tight'>
          {t("uploadProtocol")}
        </h2>
        <button
          onClick={onBack}
          className='text-rose-300 hover:text-rose-500 transition-colors text-sm font-bold uppercase tracking-widest'
        >
          {t("abort")}
        </button>
      </div>

      <AnimatePresence mode='wait'>
        {!scanning ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`
              relative h-96 border-4 border-dashed rounded-[3rem] flex flex-col items-center justify-center cursor-pointer transition-all duration-500
              ${isDragging ? "border-rose-400 bg-rose-50 shadow-2xl shadow-rose-100" : "border-rose-100 bg-white/40 hover:border-rose-300 hover:bg-white/60"}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              type='file'
              ref={inputRef}
              className='hidden'
              accept='image/*'
              onChange={handleFileSelect}
            />

            <motion.div
              animate={{ y: isDragging ? -10 : 0 }}
              className='mb-6 bg-rose-100/50 p-6 rounded-full'
            >
              <Heart
                className={`w-16 h-16 ${isDragging ? "text-rose-500 fill-rose-200" : "text-rose-300"}`}
              />
            </motion.div>

            <p className='text-2xl text-rose-500 font-bold tracking-tight mb-2'>
              {t("dragData")}
            </p>
            <p className='text-sm text-rose-300 font-medium'>
              {t("clickToTransfer")}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='h-96 w-full flex flex-col items-center justify-center glass-panel border-rose-100 rounded-[3rem] relative overflow-hidden'
          >
            <div className='relative mb-8'>
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className='absolute inset-0 bg-rose-200 blur-2xl rounded-full'
              />
              <Sparkles className='w-16 h-16 text-rose-500 relative z-10' />
            </div>

            <div className='w-64 space-y-4 text-center'>
              <div className='flex justify-between text-xs text-rose-400 font-bold uppercase tracking-widest'>
                <span>{t("encrypting")}</span>
                <span>{Math.floor(progress)}%</span>
              </div>
              <div className='h-3 bg-rose-50 w-full rounded-full overflow-hidden shadow-inner'>
                <motion.div
                  className='h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full'
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className='mt-10 text-xs text-rose-400/80 font-bold text-center w-72 space-y-2 uppercase tracking-tight'>
              <p className='flex items-center justify-center gap-2'>
                <Heart className='w-3 h-3 fill-rose-200' />{" "}
                {t("analyzingBitmap")}
              </p>
              {progress > 30 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className='text-rose-500 flex items-center justify-center gap-2'
                >
                  <Heart className='w-3 h-3 fill-rose-300' />{" "}
                  {t("metadataExtracted")}
                </motion.p>
              )}
              {progress > 60 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className='text-rose-500 flex items-center justify-center gap-2'
                >
                  <Heart className='w-3 h-3 fill-rose-400' />{" "}
                  {t("locationSecured")}
                </motion.p>
              )}
              {progress > 90 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className='text-rose-600 flex items-center justify-center gap-2'
                >
                  <Heart className='w-3 h-3 fill-rose-500' />{" "}
                  {t("readyForUplink")}
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
