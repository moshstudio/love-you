"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/hooks/useAuth";
import { albumsApi, photosApi } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import ParticleBackground from "@/components/game/ParticleBackground";
import { ArrowLeft, Grid3X3, Trees, Maximize2, X } from "lucide-react";
import { GalleryGrid } from "./components/GalleryGrid";
import { ChristmasMode } from "./components/ChristmasMode";
import { ImmersiveView } from "./components/ImmersiveView";
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

  // Track visited modes to keep them mounted
  const [visitedModes, setVisitedModes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (viewMode !== "grid") {
      setVisitedModes((prev) => {
        const newSet = new Set(prev);
        newSet.add(viewMode);
        return newSet;
      });
    }
  }, [viewMode]);

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

  // Only show full screen loading if we don't have data yet
  if ((authLoading || loading) && !album) {
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
    <div className='relative min-h-screen bg-black text-rose-100 font-sans overflow-hidden selection:bg-rose-500/30 safe-area-inset-top safe-area-inset-bottom'>
      <ParticleBackground />

      {/* Header - Hidden in Immersive Mode if playing, or maybe just hidden in Immersive Mode? 
          Original code: (!isPlaying || viewMode !== "immersive")
      */}
      <AnimatePresence>
        {(!isPlaying || viewMode !== "immersive") &&
          viewMode !== "christmas" && (
            <motion.header
              initial={{ y: -100 }}
              animate={{ y: 0 }}
              exit={{ y: -100 }}
              className='fixed top-0 left-0 right-0 z-40 px-3 py-3 sm:p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent'
            >
              <div className='flex items-center gap-2 sm:gap-4'>
                <button
                  onClick={() => router.push(`/albums/${albumId}`)}
                  className='p-2 sm:p-3 bg-white/10 hover:bg-rose-500/20 text-rose-300 rounded-full backdrop-blur-md transition-all group border border-white/5 touch-target flex items-center justify-center'
                >
                  <ArrowLeft className='w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform' />
                </button>
                <div>
                  <h1 className='text-lg sm:text-2xl font-black text-white tracking-tight truncate max-w-[150px] sm:max-w-none'>
                    {album.title}
                  </h1>
                  <p className='text-rose-400 text-[10px] sm:text-xs font-bold tracking-wider sm:tracking-widest uppercase'>
                    {photos.length} Memories
                  </p>
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className='flex bg-white/5 backdrop-blur-md rounded-full p-0.5 sm:p-1 border border-white/10'>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 sm:p-3 rounded-full transition-all touch-target flex items-center justify-center ${
                    viewMode === "grid"
                      ? "bg-rose-500 text-white shadow-lg shadow-rose-900/50"
                      : "text-rose-400 hover:text-white"
                  }`}
                  title='Grid View'
                >
                  <Grid3X3 className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
                </button>
                <button
                  onClick={() => setViewMode("christmas")}
                  className='p-2 sm:p-3 rounded-full transition-all text-rose-400 hover:text-white touch-target flex items-center justify-center'
                  title='Holiday Mode'
                >
                  <Trees className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
                </button>
                <button
                  onClick={() => {
                    setViewMode("immersive");
                    setCurrentIndex(0);
                    setIsPlaying(true);
                  }}
                  className={`p-2 sm:p-3 rounded-full transition-all touch-target flex items-center justify-center ${
                    viewMode === "immersive"
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50"
                      : "text-rose-400 hover:text-white"
                  }`}
                  title='Immersive Mode'
                >
                  <Maximize2 className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
                </button>
              </div>
            </motion.header>
          )}
      </AnimatePresence>

      {/* Main Content */}
      <main className='relative z-10 w-full h-full min-h-screen'>
        <div className='relative w-full h-full'>
          <div
            key='grid-wrapper'
            style={{
              visibility: viewMode === "grid" ? "visible" : "hidden",
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              zIndex: 10,
            }}
          >
            <GalleryGrid
              photos={photos}
              onPhotoClick={(index) => {
                setCurrentIndex(index);
                setViewMode("immersive");
                setIsPlaying(false);
              }}
            />
          </div>

          {(viewMode === "christmas" || visitedModes.has("christmas")) && (
            <div
              key='christmas-wrapper'
              style={{
                visibility: viewMode === "christmas" ? "visible" : "hidden",
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                zIndex: 20,
              }}
            >
              <ChristmasMode
                photos={photos}
                onClose={() => setViewMode("grid")}
                isActive={viewMode === "christmas"}
              />
            </div>
          )}

          {(viewMode === "immersive" || visitedModes.has("immersive")) && (
            <div
              key='immersive-wrapper'
              style={{
                visibility: viewMode === "immersive" ? "visible" : "hidden",
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                zIndex: 30,
              }}
            >
              {viewMode === "immersive" && (
                <button
                  onClick={() => setViewMode("grid")}
                  className='absolute top-6 right-6 z-50 p-3 rounded-full border border-white/10 text-white/50 hover:bg-white/10 hover:text-white backdrop-blur-md transition-all group flex items-center justify-center'
                  aria-label='Exit Immersive View'
                >
                  <X className='w-5 h-5' />
                </button>
              )}
              <ImmersiveView
                photos={photos}
                currentIndex={currentIndex}
                onChangeIndex={setCurrentIndex}
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
                onClose={() => setViewMode("grid")}
                isActive={viewMode === "immersive"}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
