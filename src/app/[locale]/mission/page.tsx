"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { AnimatePresence } from "framer-motion";
import { UploadMission } from "@/components/game/UploadMission";
import { AnalysisHUD } from "@/components/game/AnalysisHUD";
import { Visualizer } from "@/components/game/Visualizer";
import ParticleBackground from "@/components/game/ParticleBackground";
import { useAuth } from "@/hooks/useAuth";

type MissionState = "UPLOAD" | "ANALYSIS" | "RESULT";

interface Album {
  id: string;
  title: string;
}

export default function MissionPage() {
  const t = useTranslations("Game.UI");
  const [gameState, setGameState] = useState<MissionState>("UPLOAD");
  const [missionAlbumId, setMissionAlbumId] = useState<string | null>(null);
  const { user, loading } = useAuth();
  const router = useRouter();

  // Ensure user is logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Init Mission Album
  useEffect(() => {
    async function initGameAlbum() {
      if (!user) return;

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
            // Create default album
            const createRes = await fetch("/api/albums", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: "Our Story",
                description:
                  "A collection of our most precious moments together.",
                location: "Forever in my Heart",
              }),
            });
            if (createRes.ok) {
              const newAlbum = (await createRes.json()) as Album;
              setMissionAlbumId(newAlbum.id);
            }
          }
        }
      } catch (e) {
        console.error("Failed to init game system", e);
      }
    }
    initGameAlbum();
  }, [user]);

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

  if (loading) return null;

  return (
    <div className='relative w-full h-screen text-slate-800 dark:text-white overflow-hidden font-sans selection:bg-rose-500/30'>
      <ParticleBackground />

      <main className='relative z-10 w-full h-full flex items-center justify-center p-6'>
        <AnimatePresence mode='wait'>
          {gameState === "UPLOAD" && (
            <UploadMission
              onComplete={handleUploadComplete}
              onBack={() => router.push("/")}
            />
          )}

          {gameState === "ANALYSIS" && (
            <AnalysisHUD onComplete={handleAnalysisComplete} />
          )}

          {gameState === "RESULT" && (
            <div className='flex flex-col items-center w-full max-w-lg glass-panel p-12 rounded-[3rem] text-center'>
              <Visualizer />
              <h2 className='text-4xl font-black bg-clip-text text-transparent bg-gradient-to-br from-rose-400 to-purple-500 mb-6 mt-10'>
                {t("dataSecured")}
              </h2>
              <p className='text-rose-400 font-medium mb-10 leading-relaxed'>
                {t("memoryIntegrated")}
              </p>
              <div className='flex flex-col sm:flex-row gap-4 w-full'>
                <button
                  onClick={() => router.push("/albums")}
                  className='flex-1 px-10 py-4 bg-rose-500 text-white font-black rounded-full shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all uppercase tracking-widest text-sm'
                >
                  {t("viewArchives")}
                </button>
                <button
                  onClick={() => setGameState("UPLOAD")}
                  className='flex-1 px-10 py-4 bg-rose-50 text-rose-500 font-black rounded-full hover:bg-rose-100 transition-all uppercase tracking-widest text-sm'
                >
                  {t("returnToRoot")}
                </button>
              </div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
