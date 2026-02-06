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
    <div className='relative w-full min-h-screen text-slate-800 dark:text-white overflow-y-auto font-sans selection:bg-rose-500/30 safe-area-inset-top safe-area-inset-bottom snap-y snap-mandatory scroll-smooth'>
      <ParticleBackground />

      <div className='relative z-10 w-full'>
        {/* Hero Section */}
        <section className='min-h-screen flex flex-col snap-start'>
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
                    className='w-full sm:w-auto px-8 sm:px-16 py-4 sm:py-6 bg-rose-500 text-white font-black tracking-[0.1em] sm:tracking-[0.2em] text-base sm:text-xl uppercase rounded-full shadow-2xl shadow-rose-200 hover:bg-rose-600 transition-all flex items-center justify-center gap-3 sm:gap-4 mx-auto touch-target mb-12'
                  >
                    {t("initialize")}
                    <ChevronRightIcon className='w-5 h-5 sm:w-6 sm:h-6' />
                  </motion.button>
                </Link>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className='flex flex-col items-center gap-2 text-rose-300 pointer-events-none'
                >
                  <p className='text-[10px] uppercase tracking-widest font-bold'>
                    {t("siteIntro")}
                  </p>
                  <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ChevronDownIcon className='w-5 h-5' />
                  </motion.div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </main>
        </section>

        {/* Features Section */}
        <section className='min-h-screen flex flex-col items-center justify-center px-4 py-20 sm:p-6 snap-start bg-gradient-to-b from-transparent to-rose-50/20 dark:to-black/20'>
          <div className='max-w-6xl w-full mx-auto pb-12'>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className='text-center mb-16 sm:mb-24'
            >
              <h2 className='text-3xl sm:text-5xl font-black text-rose-600 mb-6 uppercase tracking-tight'>
                {t("siteIntro")}
              </h2>
              <p className='text-lg sm:text-xl text-slate-600 dark:text-rose-200/80 max-w-2xl mx-auto font-medium leading-relaxed'>
                {t("siteDescription")}
              </p>
            </motion.div>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10'>
              <FeatureCard
                delay={0.1}
                title={t("feature1Title")}
                description={t("feature1Desc")}
                icon={<AlbumIcon className='w-8 h-8' />}
              />
              <FeatureCard
                delay={0.2}
                title={t("feature2Title")}
                description={t("feature2Desc")}
                icon={<SparklesIcon className='w-8 h-8' />}
              />
              <FeatureCard
                delay={0.3}
                title={t("feature3Title")}
                description={t("feature3Desc")}
                icon={<ShareIcon className='w-8 h-8' />}
              />
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className='mt-20 sm:mt-24 flex items-center justify-center gap-6 sm:gap-10 flex-wrap'
            >
              <Link
                href='/login'
                className='text-rose-400 hover:text-rose-600 text-[10px] sm:text-xs font-black tracking-[0.2em] sm:tracking-[0.3em] transition-all uppercase py-2 touch-target flex items-center justify-center'
              >
                {navT("login")}
              </Link>
              <div className='w-1 h-1 sm:w-1.5 sm:h-1.5 bg-rose-200 rounded-full' />
              <Link
                href='/register'
                className='text-rose-400 hover:text-rose-600 text-[10px] sm:text-xs font-black tracking-[0.2em] sm:tracking-[0.3em] transition-all uppercase py-2 touch-target flex items-center justify-center'
              >
                {navT("register")}
              </Link>
              <div className='w-1 h-1 sm:w-1.5 sm:h-1.5 bg-rose-200 rounded-full' />
              <Link
                href='/privacy'
                className='text-rose-400 hover:text-rose-600 text-[10px] sm:text-xs font-black tracking-[0.2em] sm:tracking-[0.3em] transition-all uppercase py-2 touch-target flex items-center justify-center'
              >
                {navT("privacy")}
              </Link>
            </motion.div>
          </div>
        </section>
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

function ChevronDownIcon({ className }: { className?: string }) {
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
        d='M19.5 8.25l-7.5 7.5-7.5-7.5'
      />
    </svg>
  );
}

function AlbumIcon({ className }: { className?: string }) {
  return (
    <svg
      fill='none'
      viewBox='0 0 24 24'
      stroke='currentColor'
      strokeWidth={2}
      className={className}
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z'
      />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      fill='none'
      viewBox='0 0 24 24'
      stroke='currentColor'
      strokeWidth={2}
      className={className}
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z'
      />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      fill='none'
      viewBox='0 0 24 24'
      stroke='currentColor'
      strokeWidth={2}
      className={className}
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z'
      />
    </svg>
  );
}

function FeatureCard({
  title,
  description,
  icon,
  delay,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      whileHover={{ y: -10 }}
      className='bg-white/40 dark:bg-rose-900/10 backdrop-blur-md p-8 rounded-3xl border border-rose-100/50 dark:border-rose-500/10 shadow-xl shadow-rose-100/20 flex flex-col items-center text-center group'
    >
      <div className='w-16 h-16 bg-rose-500 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-rose-200/50 group-hover:scale-110 transition-transform'>
        {icon}
      </div>
      <h3 className='text-xl font-black text-rose-600 mb-3 tracking-tight uppercase'>
        {title}
      </h3>
      <p className='text-slate-600 dark:text-rose-100/70 leading-relaxed font-medium'>
        {description}
      </p>
    </motion.div>
  );
}
