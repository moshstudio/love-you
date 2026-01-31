"use client";

import { useState } from "react";
import { useRouter, Link } from "@/i18n/routing";
import { useAuth } from "@/hooks/useAuth";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import ParticleBackground from "@/components/game/ParticleBackground";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { register } = useAuth();
  const t = useTranslations("Register");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("errorMismatch"));
      return;
    }

    setLoading(true);

    try {
      await register(email, username, password);
      router.push("/albums");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='relative min-h-screen flex items-center justify-center p-4 overflow-hidden font-mono text-cyan-500'>
      <ParticleBackground />

      {/* Decorative corner accents */}
      <div className='fixed top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-cyan-500/30 rounded-tl-3xl pointer-events-none' />
      <div className='fixed bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-cyan-500/30 rounded-br-3xl pointer-events-none' />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className='relative z-10 w-full max-w-md bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 p-8 shadow-[0_0_50px_rgba(6,182,212,0.1)]'
      >
        <div className='absolute -top-3 left-4 bg-slate-900 px-2 text-xs tracking-widest text-cyan-500/70 border border-cyan-500/30'>
          NEW_USER_ENTRY
        </div>

        <h1 className='text-3xl font-black text-center mb-2 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500'>
          {t("title")}
        </h1>
        <p className='text-center text-slate-400 mb-8 text-xs tracking-[0.2em] uppercase'>
          {t("subtitle")}
        </p>

        <form
          onSubmit={handleSubmit}
          className='space-y-5'
        >
          <div className='space-y-2'>
            <label className='block text-xs font-bold tracking-widest text-cyan-400/80 uppercase'>
              {t("email")}
            </label>
            <div className='relative group'>
              <input
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className='w-full bg-slate-800/50 border border-slate-700 text-cyan-100 px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-600'
                placeholder={t("placeholders.email")}
              />
              <div className='absolute top-0 right-0 w-2 h-2 border-t border-r border-slate-600 group-hover:border-cyan-500 transition-colors' />
              <div className='absolute bottom-0 left-0 w-2 h-2 border-b border-l border-slate-600 group-hover:border-cyan-500 transition-colors' />
            </div>
          </div>

          <div className='space-y-2'>
            <label className='block text-xs font-bold tracking-widest text-cyan-400/80 uppercase'>
              {t("username")}
            </label>
            <div className='relative group'>
              <input
                type='text'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className='w-full bg-slate-800/50 border border-slate-700 text-cyan-100 px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-600'
                placeholder={t("placeholders.username")}
              />
              <div className='absolute top-0 right-0 w-2 h-2 border-t border-r border-slate-600 group-hover:border-cyan-500 transition-colors' />
              <div className='absolute bottom-0 left-0 w-2 h-2 border-b border-l border-slate-600 group-hover:border-cyan-500 transition-colors' />
            </div>
          </div>

          <div className='space-y-2'>
            <label className='block text-xs font-bold tracking-widest text-cyan-400/80 uppercase'>
              {t("password")}
            </label>
            <div className='relative group'>
              <input
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className='w-full bg-slate-800/50 border border-slate-700 text-cyan-100 px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-600'
                placeholder={t("placeholders.password")}
              />
            </div>
          </div>

          <div className='space-y-2'>
            <label className='block text-xs font-bold tracking-widest text-cyan-400/80 uppercase'>
              {t("confirmPassword")}
            </label>
            <div className='relative group'>
              <input
                type='password'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className='w-full bg-slate-800/50 border border-slate-700 text-cyan-100 px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-600'
                placeholder={t("placeholders.password")}
              />
              <div className='absolute bottom-0 right-0 w-2 h-2 border-b border-r border-slate-600 group-hover:border-cyan-500 transition-colors' />
            </div>
          </div>

          {error && (
            <div className='bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 text-sm flex items-center gap-2'>
              <span className='animate-pulse'>⚠</span>
              {error}
            </div>
          )}

          <motion.button
            type='submit'
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className='w-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 font-bold py-4 uppercase tracking-widest hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden mt-4'
          >
            <span className='relative z-10'>
              [ {loading ? t("submitting") : t("submit")} ]
            </span>
            <div className='absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700' />
          </motion.button>
        </form>

        <div className='text-center mt-8 text-slate-500 text-xs tracking-wider'>
          {t("hasAccount")}{" "}
          <Link
            href='/login'
            className='text-cyan-400 hover:text-cyan-300 font-bold ml-2 hover:underline decoration-cyan-500/30 underline-offset-4'
          >
            {t("login")}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
