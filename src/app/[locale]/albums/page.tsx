"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/hooks/useAuth";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import ParticleBackground from "@/components/game/ParticleBackground";
import { AlbumList } from "@/components/game/AlbumList";
import { LogOut, Home } from "lucide-react";
import Link from "next/link";

export default function AlbumsPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const navT = useTranslations("Navigation");
  const t = useTranslations("Albums");
  const gameT = useTranslations("Game.UI");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      router.push("/login");
    }
  };

  const handleSelectAlbum = (id: string) => {
    router.push(`/albums/${id}`);
  };

  const handleStartUpload = () => {
    // For now, redirect to the first album or a general upload page if it exists
    // In GameUI it switches state, here we can redirect to a specific album detail
    // or keep it simple as AlbumList handles creation too.
  };

  if (authLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-background text-rose-500 font-sans'>
        <div className='flex flex-col items-center gap-4'>
          <div className='w-12 h-12 border-4 border-rose-100 border-t-rose-500 rounded-full animate-spin' />
          <div className='text-xs tracking-widest animate-pulse font-bold uppercase'>
            {gameT("openingVault")}
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className='min-h-screen bg-background text-foreground font-sans relative overflow-hidden'>
      <ParticleBackground />

      {/* Header */}
      <header className='fixed top-0 left-0 right-0 z-50 border-b border-rose-100/20 bg-white/20 dark:bg-black/20 backdrop-blur-md safe-area-inset-top'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex justify-between items-center'>
          <div className='flex items-center gap-2 sm:gap-4'>
            <Link
              href='/'
              className='p-1.5 sm:p-2 hover:bg-rose-50 rounded-full transition-colors text-rose-400'
            >
              <Home className='w-4 h-4 sm:w-5 sm:h-5' />
            </Link>
            <div className='w-1.5 h-1.5 sm:w-2 sm:h-2 bg-rose-500 rounded-full animate-pulse' />
            <span className='text-lg sm:text-xl md:text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-rose-400 to-purple-500'>
              {navT("brand")}
            </span>
          </div>

          <div className='flex items-center gap-3 sm:gap-6'>
            <div className='hidden sm:flex flex-col items-end'>
              <span className='text-[10px] text-rose-300 font-bold uppercase tracking-widest'>
                {gameT("loggedInAs")}
              </span>
              <span className='text-sm text-rose-500 font-black'>
                {user.username}
              </span>
            </div>
            <button
              type='button'
              onClick={handleLogout}
              className='flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold text-rose-400 border border-rose-100 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full hover:bg-rose-50 transition-all touch-target'
            >
              <LogOut className='w-3 h-3' />
              <span className='hidden xs:inline'>{t("logout")}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='relative z-10 pt-24 sm:pt-32 pb-10 sm:pb-20 h-screen flex flex-col safe-area-inset-bottom'>
        <AlbumList
          onSelectAlbum={handleSelectAlbum}
          onStartUpload={() => {
            // If we have albums, use the first one, else it will show no albums UI
            if (handleStartUpload) handleStartUpload();
          }}
        />
      </main>
    </div>
  );
}
