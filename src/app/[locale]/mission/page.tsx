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
    <div className='relative w-full h-screen text-white overflow-hidden font-mono selection:bg-cyan-500/30'>
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
            <div className='flex flex-col items-center w-full'>
              <Visualizer />
              <h2 className='text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-600 mb-4 mt-8'>
                {t("dataSecured")}
              </h2>
              <p className='text-slate-400 mb-8'>{t("memoryIntegrated")}</p>
              <div className='flex gap-4'>
                <button
                  onClick={() => router.push("/albums")}
                  className='px-6 py-2 border border-cyan-500/50 hover:bg-cyan-500/10 text-cyan-400 transition-colors'
                >
                  [ {t("viewArchives")} ]
                </button>
                <button
                  onClick={() => setGameState("UPLOAD")}
                  className='px-6 py-2 border border-white/20 hover:bg-white/10 transition-colors'
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
