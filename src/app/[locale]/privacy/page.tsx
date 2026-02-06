"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import ParticleBackground from "@/components/game/ParticleBackground";
import { ArrowLeft, Shield, Lock, Eye, Trash2, Mail } from "lucide-react";
import { useRouter } from "@/i18n/routing";

export default function PrivacyPage() {
  const t = useTranslations("Privacy");
  const navT = useTranslations("Navigation");
  const router = useRouter();

  const sections = [
    {
      title: t("dataCollection.title"),
      content: t("dataCollection.content"),
      icon: <Eye className='w-6 h-6 text-rose-500' />,
    },
    {
      title: t("dataUsage.title"),
      content: t("dataUsage.content"),
      icon: <Lock className='w-6 h-6 text-rose-500' />,
    },
    {
      title: t("dataSecurity.title"),
      content: t("dataSecurity.content"),
      icon: <Shield className='w-6 h-6 text-rose-500' />,
    },
    {
      title: t("userRights.title"),
      content: t("userRights.content"),
      icon: <Trash2 className='w-6 h-6 text-rose-500' />,
    },
    {
      title: t("contact.title"),
      content: t("contact.content"),
      icon: <Mail className='w-6 h-6 text-rose-500' />,
    },
  ];

  return (
    <div className='min-h-screen bg-background text-foreground font-sans relative overflow-hidden'>
      <ParticleBackground />

      {/* Header */}
      <header className='fixed top-0 left-0 right-0 z-50 border-b border-rose-100/20 bg-white/20 dark:bg-black/20 backdrop-blur-md safe-area-inset-top'>
        <div className='max-w-4xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex justify-between items-center'>
          <button
            onClick={() => router.back()}
            className='p-2 hover:bg-rose-50 rounded-full transition-colors text-rose-400'
          >
            <ArrowLeft className='w-5 h-5 sm:w-6 sm:h-6' />
          </button>
          <span className='text-lg sm:text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-rose-400 to-purple-500'>
            {navT("privacy")}
          </span>
          <div className='w-10' /> {/* Spacer */}
        </div>
      </header>

      {/* Main Content */}
      <main className='relative z-10 pt-24 sm:pt-32 pb-20 px-4'>
        <div className='max-w-4xl mx-auto'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className='mb-12 text-center'
          >
            <h1 className='text-3xl sm:text-5xl font-black text-rose-500 mb-6'>
              {t("title")}
            </h1>
            <p className='text-rose-400/80 font-medium leading-relaxed max-w-2xl mx-auto'>
              {t("introduction")}
            </p>
          </motion.div>

          <div className='space-y-6 sm:space-y-8'>
            {sections.map((section, index) => (
              <motion.section
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className='glass-panel p-6 sm:p-8 rounded-[2rem] border-rose-100/30'
              >
                <div className='flex items-start gap-4 sm:gap-6'>
                  <div className='p-3 bg-rose-50 rounded-2xl'>
                    {section.icon}
                  </div>
                  <div className='flex-1'>
                    <h2 className='text-xl sm:text-2xl font-bold text-rose-600 mb-3 sm:mb-4'>
                      {section.title}
                    </h2>
                    <p className='text-slate-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base'>
                      {section.content}
                    </p>
                  </div>
                </div>
              </motion.section>
            ))}
          </div>

          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className='mt-16 text-center text-rose-300'
          >
            <div className='flex items-center justify-center gap-3 mb-4'>
              <div className='w-12 h-[1px] bg-rose-100' />
              <div className='w-2 h-2 bg-rose-200 rounded-full' />
              <div className='w-12 h-[1px] bg-rose-100' />
            </div>
            <p className='text-[10px] sm:text-xs font-bold uppercase tracking-widest'>
              {navT("brand")} • Privacy First
            </p>
          </motion.footer>
        </div>
      </main>
    </div>
  );
}
