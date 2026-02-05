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
    <div className='relative w-full min-h-screen text-slate-800 dark:text-white overflow-hidden font-sans selection:bg-rose-500/30 safe-area-inset-top safe-area-inset-bottom'>
      <ParticleBackground />

      <div className='relative z-10 w-full min-h-screen flex flex-col'>
        {/* Header - Responsive */}
        <header className='fixed top-0 w-full px-4 py-3 sm:p-6 flex justify-between items-center z-50 bg-gradient-to-b from-white/30 to-transparent dark:from-black/30 backdrop-blur-sm'>
          <div className='flex items-center gap-2 sm:gap-3'>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <HeartIcon className='w-4 h-4 sm:w-5 sm:h-5 text-rose-500' />
            </motion.div>
            <span className='text-rose-500 text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.3em] font-black uppercase'>
              {t("systemOnline")}
            </span>
          </div>
          <div className='flex items-center gap-4 sm:gap-6'>
            <div className='text-[9px] sm:text-[10px] text-rose-300 font-bold uppercase tracking-wider sm:tracking-widest'>
              <span className='hidden sm:inline'>{t("locUnknown")} • </span>
              <RealTimeClock />
            </div>
          </div>
        </header>

        <main className='flex-1 flex items-center justify-center px-4 py-20 sm:p-6'>
          <AnimatePresence mode='wait'>
            <motion.div
              key='intro'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
              className='text-center w-full max-w-4xl'
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12 }}
                className='mb-6 sm:mb-8 flex justify-center'
              >
                <div className='bg-rose-100 p-3 sm:p-4 rounded-full shadow-xl shadow-rose-100'>
                  <HeartIcon className='w-8 h-8 sm:w-12 sm:h-12 text-rose-500' />
                </div>
              </motion.div>

              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className='text-4xl sm:text-6xl md:text-7xl lg:text-9xl font-black tracking-tighter mb-4 sm:mb-6 bg-clip-text text-transparent bg-gradient-to-br from-rose-400 via-rose-600 to-purple-600 drop-shadow-sm leading-tight'
              >
                {t("project")}
                <br />
                <span className='block mt-1 sm:mt-2'>{t("ourStory")}</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className='text-rose-400 font-bold tracking-[0.2em] sm:tracking-[0.4em] text-[10px] sm:text-xs md:text-sm mb-10 sm:mb-16 uppercase px-4'
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
                  className='w-full sm:w-auto px-8 sm:px-16 py-4 sm:py-6 bg-rose-500 text-white font-black tracking-[0.1em] sm:tracking-[0.2em] text-base sm:text-xl uppercase rounded-full shadow-2xl shadow-rose-200 hover:bg-rose-600 transition-all flex items-center justify-center gap-3 sm:gap-4 mx-auto touch-target'
                >
                  {t("initialize")}
                  <ChevronRightIcon className='w-5 h-5 sm:w-6 sm:h-6' />
                </motion.button>
              </Link>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className='mt-10 sm:mt-16 flex items-center justify-center gap-6 sm:gap-10 flex-wrap'
              >
                <Link
                  href='/login'
                  className='text-rose-300 hover:text-rose-500 text-[10px] sm:text-xs font-black tracking-[0.2em] sm:tracking-[0.3em] transition-all uppercase py-2 touch-target flex items-center justify-center'
                >
                  {navT("login")}
                </Link>
                <div className='w-1 h-1 sm:w-1.5 sm:h-1.5 bg-rose-100 rounded-full' />
                <Link
                  href='/register'
                  className='text-rose-300 hover:text-rose-500 text-[10px] sm:text-xs font-black tracking-[0.2em] sm:tracking-[0.3em] transition-all uppercase py-2 touch-target flex items-center justify-center'
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
