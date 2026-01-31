"use client";

import { motion } from "framer-motion";

export default function Background() {
  return (
    <div className='fixed inset-0 -z-50 overflow-hidden pointer-events-none'>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
        className='absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-rose-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950'
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: [0.3, 0.5, 0.3],
          scale: [1, 1.2, 1],
          x: [0, 50, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className='absolute -top-[20%] -left-[10%] w-[600px] h-[600px] rounded-full bg-indigo-300/20 dark:bg-indigo-500/10 blur-[100px]'
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: [0.2, 0.4, 0.2],
          scale: [1, 1.1, 1],
          x: [0, -40, 0],
          y: [0, 40, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        className='absolute top-[20%] -right-[10%] w-[500px] h-[500px] rounded-full bg-rose-300/20 dark:bg-rose-500/10 blur-[100px]'
      />

      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
    </div>
  );
}
