"use client";

import React from "react";
import { motion } from "framer-motion";

interface LoadingOverlayProps {
  message?: string;
  progress?: number;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = "Loading...",
  progress,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className='fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md'
    >
      <div className='relative flex flex-col items-center w-64'>
        {/* Premium Spinner */}
        <div className='w-24 h-24 relative mb-12'>
          <motion.div
            className='absolute inset-0 border-2 border-[#FFD700]/20 rounded-full'
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className='absolute inset-0 border-t-2 border-[#FFD700] rounded-full shadow-[0_0_15px_rgba(255,215,0,0.5)]'
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className='absolute inset-4 border-b-2 border-[#FFD700]/60 rounded-full'
            initial={{ rotate: 0 }}
            animate={{ rotate: -360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Loading Text & Progress */}
        <motion.div
          className='flex flex-col items-center w-full'
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <span className='text-white/90 text-sm font-light tracking-[0.3em] uppercase mb-4 text-center px-4'>
            {message}
          </span>

          <div className='w-full px-4'>
            <div className='w-full h-[1px] bg-white/10 relative overflow-hidden mb-2'>
              {progress !== undefined ? (
                <motion.div
                  className='absolute left-0 top-0 h-full bg-[#FFD700] shadow-[0_0_8px_rgba(255,215,0,0.5)]'
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: "spring", stiffness: 50, damping: 20 }}
                />
              ) : (
                <motion.div
                  className='absolute left-0 top-0 h-full w-1/3 bg-[#FFD700]'
                  animate={{
                    left: ["-40%", "110%"],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              )}
            </div>
          </div>

          {progress !== undefined && (
            <span className='text-[10px] text-[#FFD700] font-mono opacity-50 tabular-nums'>
              {Math.round(progress)}%
            </span>
          )}
        </motion.div>
      </div>

      {/* Decorative particles (optional, but premium) */}
      <div className='absolute inset-0 overflow-hidden pointer-events-none opacity-20'>
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className='absolute w-1 h-1 bg-[#FFD700] rounded-full'
            initial={{
              x: Math.random() * 100 + "%",
              y: Math.random() * 100 + "%",
              opacity: 0,
            }}
            animate={{
              y: [null, "-20%"],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};
