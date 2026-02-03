"use client";

import { motion, AnimatePresence } from "framer-motion";
import ParticleBackground from "./ParticleBackground";
import { useTranslations } from "next-intl";
import { RealTimeClock } from "./RealTimeClock";
import { Link } from "@/i18n/routing";

const HeartIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox='0 0 24 24'
    fill='currentColor'
    className={className}
  >
    <path d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' />
  </svg>
);

export default function LandingPage() {
  const t = useTranslations("Game.UI");
  const navT = useTranslations("Navigation");

  return (
    <div className='relative w-full h-screen text-slate-800 dark:text-white overflow-hidden font-sans selection:bg-rose-500/30'>
      <ParticleBackground />

      <div className='relative z-10 w-full h-full flex flex-col'>
        {/* Header */}
        <header className='fixed top-0 w-full p-6 flex justify-between items-center z-50'>
          <div className='flex items-center gap-3'>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <HeartIcon className='w-5 h-5 text-rose-500' />
            </motion.div>
            <span className='text-rose-500 text-xs tracking-[0.3em] font-black uppercase'>
              {t("systemOnline")}
            </span>
          </div>
          <div className='flex items-center gap-6'>
            <div className='text-[10px] text-rose-300 font-bold uppercase tracking-widest'>
              {t("locUnknown")} • <RealTimeClock />
            </div>
          </div>
        </header>

        <main className='flex-1 flex items-center justify-center p-6'>
          <AnimatePresence mode='wait'>
            <motion.div
              key='intro'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
              className='text-center max-w-4xl'
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12 }}
                className='mb-8 flex justify-center'
              >
                <div className='bg-rose-100 p-4 rounded-full shadow-xl shadow-rose-100'>
                  <HeartIcon className='w-12 h-12 text-rose-500' />
                </div>
              </motion.div>

              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className='text-6xl md:text-9xl font-black tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-br from-rose-400 via-rose-600 to-purple-600 drop-shadow-sm'
              >
                {t("project")}
                <br />
                OUR STORY
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className='text-rose-400 font-bold tracking-[0.4em] text-xs md:text-sm mb-16 uppercase'
              >
                {t("initializingUplink")}
              </motion.p>

              <Link href='/albums'>
                <motion.button
                  whileHover={{
                    scale: 1.05,
                    y: -5,
                  }}
                  whileTap={{ scale: 0.95 }}
                  className='px-16 py-6 bg-rose-500 text-white font-black tracking-[0.2em] text-xl uppercase rounded-full shadow-2xl shadow-rose-200 hover:bg-rose-600 transition-all flex items-center gap-4 mx-auto'
                >
                  {t("initialize")}
                  <ChevronRightIcon className='w-6 h-6' />
                </motion.button>
              </Link>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className='mt-16 flex items-center justify-center gap-10'
              >
                <Link
                  href='/login'
                  className='text-rose-300 hover:text-rose-500 text-xs font-black tracking-[0.3em] transition-all uppercase'
                >
                  {navT("login")}
                </Link>
                <div className='w-1.5 h-1.5 bg-rose-100 rounded-full' />
                <Link
                  href='/register'
                  className='text-rose-300 hover:text-rose-500 text-xs font-black tracking-[0.3em] transition-all uppercase'
                >
                  {navT("register")}
                </Link>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      fill='none'
      viewBox='0 0 24 24'
      strokeWidth={3}
      stroke='currentColor'
      className={className}
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M8.25 4.5l7.5 7.5-7.5 7.5'
      />
    </svg>
  );
}
