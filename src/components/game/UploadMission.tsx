"use client";

import { useState, useRef, DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Scan, FileImage } from "lucide-react";
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
      <div className='flex justify-between items-center mb-8 border-b border-cyan-900/50 pb-2'>
        <h2 className='text-xl text-cyan-500 font-bold tracking-widest'>
          // {t("uploadProtocol")}
        </h2>
        <button
          onClick={onBack}
          className='text-slate-500 hover:text-white transition-colors text-sm'
        >
          [ {t("abort")} ]
        </button>
      </div>

      <AnimatePresence mode='wait'>
        {!scanning ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`
              relative h-96 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-300
              ${isDragging ? "border-cyan-400 bg-cyan-900/20 shadow-[0_0_50px_rgba(34,211,238,0.2)]" : "border-slate-700 bg-black/40 hover:border-slate-500"}
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

            <div
              className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${isDragging ? "opacity-100" : "opacity-0"}`}
            >
              <div className='absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400'></div>
              <div className='absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400'></div>
              <div className='absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400'></div>
              <div className='absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400'></div>
            </div>

            <Upload
              className={`w-16 h-16 mb-4 ${isDragging ? "text-cyan-400" : "text-slate-600"}`}
            />
            <p className='text-lg text-slate-300 font-mono tracking-wider'>
              {t("dragData")}
            </p>
            <p className='text-xs text-slate-500 mt-2'>
              {t("clickToTransfer")}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='h-96 w-full flex flex-col items-center justify-center bg-black/60 border border-slate-700 rounded-lg relative overflow-hidden'
          >
            {/* Scan line animation */}
            <motion.div
              animate={{ top: ["0%", "100%", "0%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className='absolute left-0 w-full h-1 bg-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.8)] z-10'
            />

            <Scan className='w-16 h-16 text-cyan-400 animate-pulse mb-6' />

            <div className='w-64 space-y-2'>
              <div className='flex justify-between text-xs text-cyan-300 font-mono'>
                <span>{t("encrypting")}</span>
                <span>{Math.floor(progress)}%</span>
              </div>
              <div className='h-1 bg-slate-800 w-full overflow-hidden'>
                <motion.div
                  className='h-full bg-cyan-500'
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className='mt-8 text-xs text-slate-500 font-mono text-left w-64 space-y-1'>
              <p>
                {">>"} {t("analyzingBitmap")}
              </p>
              {progress > 30 && (
                <p className='text-cyan-600'>
                  {">>"} {t("metadataExtracted")}
                </p>
              )}
              {progress > 60 && (
                <p className='text-cyan-600'>
                  {">>"} {t("locationSecured")}
                </p>
              )}
              {progress > 90 && (
                <p className='text-green-500'>
                  {">>"} {t("readyForUplink")}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
