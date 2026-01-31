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

import { Link } from "@/i18n/routing";

// ... imports

type GameState =
  | "INTRO"
  | "UPLOAD"
  | "ANALYSIS"
  | "RESULT"
  | "ALBUMS_LIST"
  | "ARCHIVES";

export default function GameUI() {
  const t = useTranslations("Game.UI");
  const navT = useTranslations("Navigation");
  const [gameState, setGameState] = useState<GameState>("INTRO");

  // Skip intro automatically for development speed (optional, good for user testing too)
  // useEffect(() => {
  //   const timer = setTimeout(() => setGameState("ALBUMS_LIST"), 2000);
  //   return () => clearTimeout(timer);
  // }, []);

  const [missionAlbumId, setMissionAlbumId] = useState<string | null>(null);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);

  useEffect(() => {
    async function initGameAlbum() {
      // ... same implementation ...
      try {
        const res = await fetch("/api/albums");
        if (res.ok) {
          const albums = await res.json();
          const missionAlbum = albums.find(
            (a: any) => a.title === "Mission Logs",
          );

          if (missionAlbum) {
            setMissionAlbumId(missionAlbum.id);
          } else {
            // Create default album
            const createRes = await fetch("/api/albums", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: "Mission Logs",
                description: "Encrypted visual data storage.",
                location: "Sector 7G",
              }),
            });
            if (createRes.ok) {
              const newAlbum = await createRes.json();
              setMissionAlbumId(newAlbum.id);
            }
          }
        }
      } catch (e) {
        console.error("Failed to init game system", e);
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

    // Background Upload to Mission Album
    if (missionAlbumId) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("albumId", missionAlbumId);
        formData.append("caption", "Incoming Transmission Datastream");

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
    <div className='relative w-full h-screen text-white overflow-hidden font-mono selection:bg-cyan-500/30'>
      <ParticleBackground />

      <div className='relative z-10 w-full h-full flex flex-col'>
        {/* HUD Header */}
        <header className='fixed top-0 w-full p-4 flex justify-between items-center border-b border-white/10 bg-slate-900/50 backdrop-blur-sm z-50'>
          <div className='flex items-center gap-2'>
            <div className='w-3 h-3 bg-cyan-500 rounded-full animate-pulse' />
            <span className='text-cyan-400 text-xs tracking-[0.2em] font-bold'>
              {t("systemOnline")}
            </span>
          </div>
          <div className='flex items-center gap-4'>
            <div className='text-xs text-slate-400'>
              {t("locUnknown")} // {t("time")}:{" "}
              {new Date().toLocaleTimeString()}
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
                className='text-center'
              >
                <motion.h1
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className='text-6xl md:text-8xl font-black tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 via-white to-purple-500 max-w-[90vw]'
                >
                  {t("project")}
                  <br />
                  LOVE-YOU
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className='text-cyan-300/60 tracking-[0.5em] text-sm mb-12'
                >
                  {t("initializingUplink")}
                </motion.p>
                <motion.button
                  whileHover={{
                    scale: 1.05,
                    backgroundColor: "rgba(34, 211, 238, 0.2)",
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStart}
                  className='px-12 py-4 border border-cyan-500 text-cyan-400 font-bold tracking-widest text-lg uppercase bg-cyan-950/30 hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] transition-all'
                >
                  [ {t("initialize")} ]
                </motion.button>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className='mt-12 flex items-center justify-center gap-8'
                >
                  <Link
                    href='/login'
                    className='text-cyan-500/60 hover:text-cyan-400 text-xs md:text-sm tracking-[0.2em] transition-colors hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] px-4 py-2 border border-transparent hover:border-cyan-500/30'
                  >
                    // {navT("login")}
                  </Link>
                  <Link
                    href='/register'
                    className='text-cyan-500/60 hover:text-cyan-400 text-xs md:text-sm tracking-[0.2em] transition-colors hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] px-4 py-2 border border-transparent hover:border-cyan-500/30'
                  >
                    // {navT("register")}
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
              <div className='flex flex-col items-center w-full'>
                <Visualizer />
                <h2 className='text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-600 mb-4 mt-8'>
                  {t("dataSecured")}
                </h2>
                <p className='text-slate-400 mb-8'>{t("memoryIntegrated")}</p>
                <button
                  onClick={() => setGameState("ALBUMS_LIST")}
                  className='px-6 py-2 border border-white/20 hover:bg-white/10 transition-colors'
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
