"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/hooks/useAuth";
import { albumsApi, photosApi } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import ParticleBackground from "@/components/game/ParticleBackground";
import { ArrowLeft, Grid3X3, Trees, Maximize2 } from "lucide-react";
import { GalleryGrid } from "./components/GalleryGrid";
import { ChristmasMode } from "./components/ChristmasMode";
import { ImmersiveView } from "./components/ImmersiveView.tsx";
import { Album, Photo } from "./components/types";

export default function AlbumGalleryPage() {
  const params = useParams();
  const albumId = params.id as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [album, setAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "christmas" | "immersive">(
    "grid",
  );

  // Immersive Mode State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      loadAlbumData();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && viewMode === "immersive") {
      interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % photos.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, viewMode, photos.length]);

  const loadAlbumData = async () => {
    try {
      setLoading(true);
      const [albumData, photosData] = await Promise.all([
        albumsApi.get(albumId),
        photosApi.list(albumId),
      ]);
      setAlbum(albumData as Album);
      setPhotos(photosData as Photo[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load album");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center bg-black text-rose-500 font-sans'>
        <div className='w-12 h-12 border-4 border-rose-900 border-t-rose-500 rounded-full animate-spin mb-4' />
        <div className='text-xs tracking-widest animate-pulse font-bold uppercase'>
          Loading Gallery...
        </div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-black text-rose-500'>
        <div className='text-xl'>Album not found</div>
      </div>
    );
  }

  return (
    <div className='relative min-h-screen bg-black text-rose-100 font-sans overflow-hidden selection:bg-rose-500/30'>
      <ParticleBackground />

      {/* Header - Hidden in Immersive Mode if playing, or maybe just hidden in Immersive Mode? 
          Original code: (!isPlaying || viewMode !== "immersive")
      */}
      <AnimatePresence>
        {(!isPlaying || viewMode !== "immersive") && (
          <motion.header
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className='fixed top-0 left-0 right-0 z-40 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent'
          >
            <div className='flex items-center gap-4'>
              <button
                onClick={() => router.push(`/albums/${albumId}`)}
                className='p-3 bg-white/10 hover:bg-rose-500/20 text-rose-300 rounded-full backdrop-blur-md transition-all group border border-white/5'
              >
                <ArrowLeft className='w-5 h-5 group-hover:-translate-x-1 transition-transform' />
              </button>
              <div>
                <h1 className='text-2xl font-black text-white tracking-tight'>
                  {album.title}
                </h1>
                <p className='text-rose-400 text-xs font-bold tracking-widest uppercase'>
                  {photos.length} Memories
                </p>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className='flex bg-white/5 backdrop-blur-md rounded-full p-1 border border-white/10'>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-3 rounded-full transition-all ${
                  viewMode === "grid"
                    ? "bg-rose-500 text-white shadow-lg shadow-rose-900/50"
                    : "text-rose-400 hover:text-white"
                }`}
                title='Grid View'
              >
                <Grid3X3 className='w-4 h-4' />
              </button>
              <button
                onClick={() => setViewMode("christmas")}
                className={`p-3 rounded-full transition-all ${
                  viewMode === "christmas"
                    ? "bg-green-600 text-white shadow-lg shadow-green-900/50"
                    : "text-rose-400 hover:text-white"
                }`}
                title='Holiday Mode'
              >
                <Trees className='w-4 h-4' />
              </button>
              <button
                onClick={() => {
                  setViewMode("immersive");
                  setCurrentIndex(0);
                  setIsPlaying(true);
                }}
                className={`p-3 rounded-full transition-all ${
                  viewMode === "immersive"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50"
                    : "text-rose-400 hover:text-white"
                }`}
                title='Immersive Mode'
              >
                <Maximize2 className='w-4 h-4' />
              </button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className='relative z-10 w-full h-full min-h-screen'>
        <AnimatePresence mode='wait'>
          {viewMode === "grid" && (
            <GalleryGrid
              key='grid'
              photos={photos}
              onPhotoClick={(index) => {
                setCurrentIndex(index);
                setViewMode("immersive");
                setIsPlaying(false);
              }}
            />
          )}

          {viewMode === "christmas" && (
            <ChristmasMode
              key='christmas'
              photos={photos}
              onClose={() => setViewMode("grid")}
            />
          )}

          {viewMode === "immersive" && (
            <ImmersiveView
              key='immersive'
              photos={photos}
              currentIndex={currentIndex}
              onChangeIndex={setCurrentIndex}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              onClose={() => setViewMode("grid")}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
