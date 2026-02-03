"use client";

import { useState } from "react";
import { useRouter, Link } from "@/i18n/routing";
import { useAuth } from "@/hooks/useAuth";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import ParticleBackground from "@/components/game/ParticleBackground";

const HeartIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox='0 0 24 24'
    fill='currentColor'
    className={className}
  >
    <path d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' />
  </svg>
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, token, loading: authLoading, login } = useAuth();
  const t = useTranslations("Login");
  const navT = useTranslations("Navigation");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      router.refresh();
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='relative min-h-screen flex items-center justify-center p-4 overflow-hidden font-sans selection:bg-rose-500/30'>
      <ParticleBackground />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className='relative z-10 w-full max-w-md glass-panel p-8 rounded-3xl shadow-xl'
      >
        <div className='flex justify-center mb-6'>
          <div className='p-3 bg-rose-50 rounded-2xl'>
            <HeartIcon className='w-8 h-8 text-rose-500 animate-pulse' />
          </div>
        </div>

        <h1 className='text-3xl font-black text-center mb-2 tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-rose-400 via-rose-500 to-purple-500'>
          {navT("brand")}
        </h1>
        <p className='text-center text-rose-400/80 mb-8 text-xs tracking-[0.2em] uppercase font-bold'>
          {t("subtitle")}
        </p>

        <form
          onSubmit={handleSubmit}
          className='space-y-6'
        >
          <div className='space-y-2'>
            <label className='block text-xs font-bold tracking-widest text-rose-400 uppercase ml-1'>
              {t("email")}
            </label>
            <input
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className='w-full bg-white/50 dark:bg-black/20 border border-rose-100 dark:border-rose-900/30 text-foreground px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400/20 transition-all placeholder:text-rose-300'
              placeholder={t("placeholders.email")}
            />
          </div>

          <div className='space-y-2'>
            <label className='block text-xs font-bold tracking-widest text-rose-400 uppercase ml-1'>
              {t("password")}
            </label>
            <input
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className='w-full bg-white/50 dark:bg-black/20 border border-rose-100 dark:border-rose-900/30 text-foreground px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400/20 transition-all placeholder:text-rose-300'
              placeholder={t("placeholders.password")}
            />
          </div>

          {error && (
            <div className='bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-500 px-4 py-3 rounded-xl text-sm flex items-center gap-2'>
              <span className='animate-pulse'>❤</span>
              {error}
            </div>
          )}

          <motion.button
            type='submit'
            whileHover={{
              scale: 1.02,
              boxShadow: "0 0 20px rgba(255, 107, 129, 0.2)",
            }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className='w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 rounded-xl uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden'
          >
            <span className='relative z-10'>
              {loading ? t("submitting") : t("submit")}
            </span>
          </motion.button>
        </form>

        <div className='text-center mt-8 text-rose-400/60 text-xs tracking-wider'>
          {t("noAccount")}{" "}
          <Link
            href='/register'
            className='text-rose-500 hover:text-rose-600 font-bold ml-2 transition-colors'
          >
            {t("createAccount")}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
