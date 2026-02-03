"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ParticleBackground from "./ParticleBackground";
import { UploadMission } from "./UploadMission";
import { AnalysisHUD } from "./AnalysisHUD";
import { Visualizer } from "./Visualizer";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "../LanguageSwitcher";
import { ArchivesView } from "./ArchivesView";
import { AlbumList } from "./AlbumList";
import { RealTimeClock } from "./RealTimeClock";

import { Link } from "@/i18n/routing";

type GameState =
  | "INTRO"
  | "UPLOAD"
  | "ANALYSIS"
  | "RESULT"
  | "ALBUMS_LIST"
  | "ARCHIVES";

const HeartIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox='0 0 24 24'
    fill='currentColor'
    className={className}
  >
    <path d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' />
  </svg>
);

interface Album {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
}

export default function GameUI() {
  const t = useTranslations("Game.UI");
  const navT = useTranslations("Navigation");
  const [gameState, setGameState] = useState<GameState>("INTRO");
  const [missionAlbumId, setMissionAlbumId] = useState<string | null>(null);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);

  useEffect(() => {
    async function initGameAlbum() {
      try {
        const res = await fetch("/api/albums");
        if (res.ok) {
          const albums: Album[] = await res.json();
          const missionAlbum = albums.find(
            (a) => a.title === "Our Story" || a.title === "Mission Logs",
          );

          if (missionAlbum) {
            setMissionAlbumId(missionAlbum.id);
          } else {
            const createRes = await fetch("/api/albums", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: "Our Story",
                description: "A collection of our precious moments.",
                location: "Close to Heart",
              }),
            });
            if (createRes.ok) {
              const newAlbum = (await createRes.json()) as Album;
              setMissionAlbumId(newAlbum.id);
            }
          }
        }
      } catch (e) {
        console.error("Failed to init memory system", e);
      }
    }
    initGameAlbum();
  }, []);

  const handleStart = () => {
    setGameState("ALBUMS_LIST");
  };

  const handleStartUpload = () => {
    setGameState("UPLOAD");
  };

  const handleUploadComplete = async (file: File) => {
    setGameState("ANALYSIS");

    if (missionAlbumId) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("albumId", missionAlbumId);
        formData.append("caption", t("incomingTransmission"));

        await fetch("/api/photos", {
          method: "POST",
          body: formData,
        });
      } catch (error) {
        console.error("Upload failed", error);
      }
    }
  };

  const handleAnalysisComplete = () => {
    setGameState("RESULT");
  };

  const handleAlbumSelect = (id: string) => {
    setSelectedAlbumId(id);
    setGameState("ARCHIVES");
  };

  return (
    <div className='relative w-full h-screen text-foreground overflow-hidden font-sans selection:bg-rose-500/30'>
      <ParticleBackground />

      <div className='relative z-10 w-full h-full flex flex-col'>
        <header className='fixed top-0 w-full p-4 flex justify-between items-center border-b border-rose-100/20 bg-white/20 dark:bg-black/20 backdrop-blur-md z-50'>
          <div className='flex items-center gap-2'>
            <HeartIcon className='w-4 h-4 text-rose-500 animate-pulse' />
            <span className='text-rose-500 text-xs tracking-[0.2em] font-bold uppercase'>
              {t("systemOnline")}
            </span>
          </div>
          <div className='flex items-center gap-4'>
            <div className='text-xs text-rose-400 font-medium'>
              {t("locUnknown")} • {t("time")}: <RealTimeClock />
            </div>
            <LanguageSwitcher />
          </div>
        </header>

        <main className='flex-1 flex items-center justify-center p-6 pt-20'>
          <AnimatePresence mode='wait'>
            {gameState === "INTRO" && (
              <motion.div
                key='intro'
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                className='text-center max-w-2xl'
              >
                <div className='mb-6 inline-block'>
                  <HeartIcon className='w-12 h-12 text-rose-400 mx-auto opacity-50' />
                </div>
                <motion.h1
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className='text-6xl md:text-8xl font-black tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-br from-rose-400 via-rose-500 to-purple-500'
                >
                  <span className='text-3xl md:text-4xl block font-medium tracking-[0.2em] mb-2 opacity-80'>
                    {t("project")}
                  </span>
                  LOVE-YOU
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className='text-rose-400 tracking-[0.3em] text-sm mb-12 font-medium'
                >
                  {t("initializingUplink")}
                </motion.p>
                <motion.button
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 0 40px rgba(255, 107, 129, 0.4)",
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStart}
                  className='px-12 py-4 rounded-full border-2 border-rose-400 text-rose-500 font-bold tracking-widest text-lg uppercase bg-white/50 hover:bg-rose-50 transition-all backdrop-blur-sm'
                >
                  {t("initialize")}
                </motion.button>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className='mt-12 flex items-center justify-center gap-8'
                >
                  <Link
                    href='/login'
                    className='text-rose-400 hover:text-rose-600 text-xs md:text-sm tracking-[0.2em] transition-colors px-4 py-2 rounded-lg hover:bg-rose-50/50'
                  >
                    {navT("login")}
                  </Link>
                  <Link
                    href='/register'
                    className='text-rose-400 hover:text-rose-600 text-xs md:text-sm tracking-[0.2em] transition-colors px-4 py-2 rounded-lg hover:bg-rose-50/50'
                  >
                    {navT("register")}
                  </Link>
                </motion.div>
              </motion.div>
            )}

            {gameState === "UPLOAD" && (
              <UploadMission
                onComplete={handleUploadComplete}
                onBack={() => setGameState("ALBUMS_LIST")}
              />
            )}

            {gameState === "ANALYSIS" && (
              <AnalysisHUD onComplete={handleAnalysisComplete} />
            )}

            {gameState === "RESULT" && (
              <div className='flex flex-col items-center w-full max-w-lg glass-panel p-12 rounded-3xl'>
                <Visualizer />
                <h2 className='text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-pink-600 mb-4 mt-8'>
                  {t("dataSecured")}
                </h2>
                <p className='text-rose-400/80 text-center mb-8'>
                  {t("memoryIntegrated")}
                </p>
                <button
                  onClick={() => setGameState("ALBUMS_LIST")}
                  className='px-8 py-3 rounded-full bg-rose-500 text-white font-bold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-200'
                >
                  {t("returnToRoot")}
                </button>
              </div>
            )}

            {gameState === "ALBUMS_LIST" && (
              <AlbumList
                onSelectAlbum={handleAlbumSelect}
                onStartUpload={handleStartUpload}
              />
            )}

            {gameState === "ARCHIVES" && selectedAlbumId && (
              <ArchivesView
                albumId={selectedAlbumId}
                onBack={() => setGameState("ALBUMS_LIST")}
              />
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
