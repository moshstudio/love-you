"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { shareApi } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import ParticleBackground from "@/components/game/ParticleBackground";
import {
  Heart,
  MapPin,
  Image as ImageIcon,
  FileText,
  Sparkles,
  X,
  ArrowLeft,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface Album {
  id: string;
  title: string;
  description?: string;
  location?: string;
  coverPhotoUrl?: string;
  startDate?: string;
  endDate?: string;
}

interface Photo {
  id: string;
  url: string;
  caption?: string;
  uploadedAt?: string;
}

interface Story {
  id: string;
  title: string;
  content: string;
  createdAt?: string;
}

export default function SharedAlbumPage() {
  const params = useParams();
  const token = params.token as string;
  const detailT = useTranslations("AlbumDetail");
  const gameT = useTranslations("Game.UI");

  const [album, setAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"photos" | "stories">("photos");
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    loadSharedAlbum();
  }, [token]);

  const loadSharedAlbum = async () => {
    try {
      setLoading(true);
      const data = (await shareApi.getShared(token)) as {
        album: Album;
        photos: Photo[];
        stories: Story[];
      };
      setAlbum(data.album);
      setPhotos(data.photos);
      setStories(data.stories);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "This shared link is no longer valid.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-background text-rose-500 font-sans'>
        <div className='flex flex-col items-center gap-4'>
          <div className='w-12 h-12 border-4 border-rose-100 border-t-rose-500 rounded-full animate-spin' />
          <div className='text-xs tracking-widest animate-pulse font-bold uppercase'>
            Opening Shared Memory...
          </div>
        </div>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-background text-rose-500 font-sans p-4 sm:p-6'>
        <div className='text-center glass-panel p-8 sm:p-12 rounded-3xl sm:rounded-[3.5rem] border-rose-100 max-w-sm w-full'>
          <div className='p-4 sm:p-5 bg-rose-50 rounded-full inline-block mb-4 sm:mb-6'>
            <Heart className='w-10 h-10 sm:w-12 sm:h-12 text-rose-300' />
          </div>
          <h1 className='text-2xl sm:text-3xl font-black text-rose-900 mb-3 sm:mb-4 tracking-tighter'>
            Oops!
          </h1>
          <p className='text-rose-400 font-medium leading-relaxed mb-6 sm:mb-8 text-sm sm:text-base'>
            {error || "This shared story is no longer reachable."}
          </p>
          <a
            href='/'
            className='text-rose-500 font-bold hover:underline uppercase text-[10px] sm:text-xs tracking-widest touch-target'
          >
            Go back home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-background text-foreground font-sans relative overflow-hidden selection:bg-rose-500/30 safe-area-inset-top safe-area-inset-bottom'>
      <ParticleBackground />

      {/* Header */}
      <header className='fixed top-0 left-0 right-0 z-40 bg-white/20 dark:bg-black/20 backdrop-blur-md border-b border-rose-100/20'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between'>
          <div className='flex items-center gap-2 sm:gap-4'>
            <div className='p-1.5 sm:p-2 bg-rose-50 rounded-full'>
              <Heart className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500 fill-rose-500 animate-pulse' />
            </div>
            <h1 className='text-lg sm:text-xl md:text-3xl font-black text-rose-900 dark:text-rose-100 truncate max-w-[150px] sm:max-w-[200px] md:max-w-md tracking-tighter'>
              {album.title}
            </h1>
          </div>
          <div className='hidden sm:flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-rose-300 bg-white/40 px-4 py-2 rounded-full border border-rose-100/50'>
            Shared with Love
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-10 sm:pb-20'>
        <div className='flex flex-col items-center mb-8 sm:mb-12 text-center'>
          {album.description && (
            <p className='text-rose-800/60 dark:text-rose-100/60 text-sm sm:text-lg font-medium italic mb-4 sm:mb-6 max-w-3xl leading-relaxed px-2'>
              "{album.description}"
            </p>
          )}
          <div className='flex items-center gap-4 sm:gap-6 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-rose-300'>
            {album.location && (
              <span className='flex items-center gap-1 sm:gap-1.5'>
                <MapPin className='w-3 h-3 sm:w-3.5 sm:h-3.5' />{" "}
                {album.location}
              </span>
            )}
            <span className='flex items-center gap-1 sm:gap-1.5'>
              <ImageIcon className='w-3 h-3 sm:w-3.5 sm:h-3.5' />{" "}
              {photos.length} MOMENTS
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className='flex justify-center mb-6 sm:mb-10'>
          <div className='flex gap-1 sm:gap-2 p-1 sm:p-1.5 glass-panel rounded-full shelf-shadow border-rose-100/50'>
            <button
              onClick={() => setActiveTab("photos")}
              className={`px-4 sm:px-8 py-2 sm:py-3 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all touch-target ${
                activeTab === "photos"
                  ? "bg-rose-500 text-white shadow-lg shadow-rose-200"
                  : "text-rose-300 hover:text-rose-500 hover:bg-rose-50"
              }`}
            >
              <span className='hidden sm:inline'>Glimpses</span>
              <span className='sm:hidden'>Photos</span> ({photos.length})
            </button>
            <button
              onClick={() => setActiveTab("stories")}
              className={`px-4 sm:px-8 py-2 sm:py-3 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all touch-target ${
                activeTab === "stories"
                  ? "bg-rose-500 text-white shadow-lg shadow-rose-200"
                  : "text-rose-300 hover:text-rose-500 hover:bg-rose-50"
              }`}
            >
              <span className='hidden sm:inline'>Tales</span>
              <span className='sm:hidden'>Stories</span> ({stories.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode='wait'>
          {activeTab === "photos" ? (
            <motion.div
              key='photos'
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-8'
            >
              {photos.map((photo, index) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedPhoto(photo)}
                  className='group relative bg-white rounded-xl sm:rounded-[2.5rem] p-2 sm:p-3 border-2 sm:border-4 border-white shadow-md hover:shadow-2xl hover:shadow-rose-100 transition-all cursor-pointer'
                >
                  <div className='aspect-square rounded-[2rem] overflow-hidden bg-rose-50'>
                    <img
                      src={photo.url}
                      alt={photo.caption || "Memory"}
                      className='w-full h-full object-cover group-hover:scale-110 transition-transform duration-700'
                    />
                  </div>
                  <div className='absolute inset-4 rounded-[2rem] bg-rose-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
                    <div className='p-3 bg-white/90 rounded-full shadow-lg'>
                      <Sparkles className='w-6 h-6 text-rose-500' />
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key='stories'
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className='space-y-8 max-w-4xl mx-auto'
            >
              {stories.map((story) => (
                <div
                  key={story.id}
                  className='glass-panel p-10 rounded-[3rem] relative border-rose-100 transition-all hover:bg-white hover:shadow-2xl hover:shadow-rose-50'
                >
                  <div className='text-[10px] text-rose-300 font-black uppercase tracking-[0.3em] mb-2'>
                    STORY LOG
                  </div>
                  <h3 className='text-3xl font-black text-rose-900 mb-6 tracking-tighter'>
                    {story.title}
                  </h3>
                  <p className='text-rose-800/80 dark:text-rose-100/80 whitespace-pre-wrap leading-relaxed font-medium text-lg italic italic-quote'>
                    {story.content}
                  </p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Photo Viewer Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-rose-950/40 backdrop-blur-md p-6'
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className='max-w-5xl w-full max-h-[90vh] flex flex-col bg-white rounded-[3rem] shadow-2xl overflow-hidden relative border border-rose-100'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='relative flex-1 bg-rose-50/10 overflow-hidden'>
                <img
                  src={selectedPhoto.url}
                  alt={selectedPhoto.caption}
                  className='w-full h-full object-contain'
                />
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className='absolute top-8 right-8 p-3 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all text-rose-500'
                >
                  <ArrowLeft className='w-6 h-6' />
                </button>
              </div>
              <div className='p-10 bg-white'>
                <h3 className='text-3xl font-black text-rose-900 mb-2 tracking-tighter text-center'>
                  {selectedPhoto.caption}
                </h3>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className='relative z-10 py-12 text-center'>
        <p className='text-rose-300 text-[10px] font-black uppercase tracking-widest'>
          Keep your own memories safe with Love You.
        </p>
        <a
          href='/register'
          className='mt-4 inline-block px-8 py-3 bg-rose-50 text-rose-500 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-rose-100 transition-all'
        >
          Create Your story
        </a>
      </footer>
    </div>
  );
}
