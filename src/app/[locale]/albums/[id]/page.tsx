"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTranslations } from "next-intl";
import ParticleBackground from "@/components/game/ParticleBackground";
import { ArchivesView } from "@/components/game/ArchivesView";
import { HeartIcon, ArrowLeft } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { RealTimeClock } from "@/components/game/RealTimeClock";

export default function AlbumDetailPageStandalone() {
  const params = useParams();
  const albumId = params.id as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const gameT = useTranslations("Game.UI");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

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
    <div className='relative w-full min-h-screen text-foreground overflow-hidden font-sans selection:bg-rose-500/30 safe-area-inset-top safe-area-inset-bottom'>
      <ParticleBackground />

      <div className='relative z-10 w-full h-full flex flex-col'>
        <header className='fixed top-0 w-full px-3 py-3 sm:p-4 flex justify-between items-center border-b border-rose-100/20 bg-white/20 dark:bg-black/20 backdrop-blur-md z-50'>
          <div className='flex items-center gap-1.5 sm:gap-2'>
            <button
              onClick={() => router.push("/albums")}
              className='p-1.5 sm:p-2 hover:bg-rose-50 rounded-full transition-colors text-rose-400 touch-target'
              title={gameT("returnToRoot")}
            >
              <ArrowLeft className='w-4 h-4 sm:w-5 sm:h-5' />
            </button>
            <div className='w-px h-4 bg-rose-100/50 mx-1 hidden xs:block' />
            <HeartIcon className='hidden xs:block w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500 animate-pulse' />
            <span className='text-rose-500 text-[10px] sm:text-xs tracking-[0.15em] sm:tracking-[0.2em] font-bold uppercase'>
              {gameT("systemOnline")}
            </span>
          </div>
          <div className='flex items-center gap-2 sm:gap-4'>
            <div className='hidden sm:block text-xs text-rose-400 font-medium'>
              {gameT("locUnknown")} • {gameT("time")}: <RealTimeClock />
            </div>
            <div className='sm:hidden text-[10px] text-rose-400 font-medium'>
              <RealTimeClock />
            </div>
            <LanguageSwitcher />
          </div>
        </header>

        <main className='flex-1 flex items-center justify-center p-3 sm:p-6 pt-16 sm:pt-24 h-full'>
          <ArchivesView
            albumId={albumId}
            onBack={() => router.push("/albums")}
          />
        </main>
      </div>
    </div>
  );
}
