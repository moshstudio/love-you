"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTranslations } from "next-intl";
import ParticleBackground from "@/components/game/ParticleBackground";
import { ArchivesView } from "@/components/game/ArchivesView";
import { HeartIcon } from "lucide-react";
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
            Opening Memory Vault...
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className='relative w-full h-screen text-foreground overflow-hidden font-sans selection:bg-rose-500/30'>
      <ParticleBackground />

      <div className='relative z-10 w-full h-full flex flex-col'>
        <header className='fixed top-0 w-full p-4 flex justify-between items-center border-b border-rose-100/20 bg-white/20 dark:bg-black/20 backdrop-blur-md z-50'>
          <div className='flex items-center gap-2'>
            <HeartIcon className='w-4 h-4 text-rose-500 animate-pulse' />
            <span className='text-rose-500 text-xs tracking-[0.2em] font-bold uppercase'>
              {gameT("systemOnline")}
            </span>
          </div>
          <div className='flex items-center gap-4'>
            <div className='text-xs text-rose-400 font-medium'>
              {gameT("locUnknown")} • {gameT("time")}: <RealTimeClock />
            </div>
            <LanguageSwitcher />
          </div>
        </header>

        <main className='flex-1 flex items-center justify-center p-6 pt-24 h-full'>
          <ArchivesView
            albumId={albumId}
            onBack={() => router.push("/albums")}
          />
        </main>
      </div>
    </div>
  );
}
