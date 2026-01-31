"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ParticleBackground from "./ParticleBackground";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export default function LandingPage() {
  const t = useTranslations("Game.UI");
  const navT = useTranslations("Navigation");

  return (
    <div className='relative w-full h-screen text-white overflow-hidden font-mono selection:bg-cyan-500/30'>
      <ParticleBackground />

      <div className='relative z-10 w-full h-full flex flex-col'>
        {/* HUD Header */}
        <header className='fixed top-0 w-full p-4 flex justify-between items-center border-b border-white/10 bg-slate-900/50 backdrop-blur-sm z-50'>
          <div className='flex items-center gap-2'>
            <div className='w-3 h-3 bg-cyan-500 rounded-full animate-pulse' />
            <span className='text-cyan-400 text-xs tracking-[0.2em] font-bold'>
              {t("systemOnline")}
            </span>
          </div>
          <div className='flex items-center gap-4'>
            <div className='text-xs text-slate-400'>
              {t("locUnknown")} // {t("time")}:{" "}
              {new Date().toLocaleTimeString()}
            </div>
            {/* Language Switcher could go here if needed, but it's usually in layout or handled globally */}
          </div>
        </header>

        <main className='flex-1 flex items-center justify-center p-6 pt-20'>
          <AnimatePresence mode='wait'>
            <motion.div
              key='intro'
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
              className='text-center'
            >
              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className='text-6xl md:text-8xl font-black tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 via-white to-purple-500 max-w-[90vw]'
              >
                {t("project")}
                <br />
                LOVE-YOU
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className='text-cyan-300/60 tracking-[0.5em] text-sm mb-12'
              >
                {t("initializingUplink")}
              </motion.p>

              <Link href='/albums'>
                <motion.button
                  whileHover={{
                    scale: 1.05,
                    backgroundColor: "rgba(34, 211, 238, 0.2)",
                  }}
                  whileTap={{ scale: 0.95 }}
                  className='px-12 py-4 border border-cyan-500 text-cyan-400 font-bold tracking-widest text-lg uppercase bg-cyan-950/30 hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] transition-all'
                >
                  [ {t("initialize")} ]
                </motion.button>
              </Link>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className='mt-12 flex items-center justify-center gap-8'
              >
                <Link
                  href='/login'
                  className='text-cyan-500/60 hover:text-cyan-400 text-xs md:text-sm tracking-[0.2em] transition-colors hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] px-4 py-2 border border-transparent hover:border-cyan-500/30'
                >
                  // {navT("login")}
                </Link>
                <Link
                  href='/register'
                  className='text-cyan-500/60 hover:text-cyan-400 text-xs md:text-sm tracking-[0.2em] transition-colors hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] px-4 py-2 border border-transparent hover:border-cyan-500/30'
                >
                  // {navT("register")}
                </Link>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
