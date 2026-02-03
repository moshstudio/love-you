"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { albumsApi } from "@/lib/api";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  MapPin,
  Camera,
  FolderHeart,
  X,
  ChevronRight,
  Heart,
} from "lucide-react";

interface Album {
  id: string;
  title: string;
  description?: string;
  location?: string;
  coverPhotoUrl?: string;
  startDate?: string;
  endDate?: string;
}

interface AlbumListProps {
  onSelectAlbum: (albumId: string) => void;
  onStartUpload: () => void;
}

const HeartOverlay = () => (
  <div className='absolute inset-0 bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center'>
    <Heart className='text-white w-8 h-8 fill-white/20 scale-0 group-hover:scale-110 transition-transform duration-500' />
  </div>
);

export function AlbumList({ onSelectAlbum, onStartUpload }: AlbumListProps) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAlbum, setNewAlbum] = useState({
    title: "",
    description: "",
    location: "",
    startDate: "",
    endDate: "",
  });
  const t = useTranslations("Albums");
  const gameT = useTranslations("Game.UI");

  useEffect(() => {
    loadAlbums();
  }, []);

  const loadAlbums = async () => {
    try {
      setLoading(true);
      const data = (await albumsApi.list()) as unknown as Album[];
      setAlbums(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load albums");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await albumsApi.create(
        newAlbum.title,
        newAlbum.description,
        newAlbum.location,
        newAlbum.startDate,
        newAlbum.endDate,
      );
      setNewAlbum({
        title: "",
        description: "",
        location: "",
        startDate: "",
        endDate: "",
      });
      setShowCreateForm(false);
      loadAlbums();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create album");
    }
  };

  return (
    <div className='w-full max-w-7xl mx-auto px-6 h-full flex flex-col z-20'>
      {/* Header Section */}
      <div className='flex justify-between items-center mb-8 border-b border-rose-100/50 pb-6 shrink-0 gap-4'>
        <div>
          <h2 className='text-4xl font-black text-rose-500 tracking-tight mb-1'>
            {t("title")}
          </h2>
          <p className='text-xs text-rose-300 font-bold tracking-[0.2em] uppercase'>
            Our Beautiful Journey Together
          </p>
        </div>

        <div className='flex gap-3'>
          <button
            onClick={onStartUpload}
            className='flex items-center gap-2 px-6 py-2.5 bg-rose-500 text-white rounded-full font-bold text-sm shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all group'
          >
            <Camera className='w-4 h-4' />
            {gameT("uploadMemory")}
          </button>

          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={`
                group flex items-center gap-2 px-6 py-2.5 font-bold text-sm rounded-full border transition-all
                ${
                  showCreateForm
                    ? "border-rose-200 text-rose-400 bg-rose-50"
                    : "border-rose-100 text-rose-400 bg-white hover:border-rose-300 hover:bg-rose-50"
                }
            `}
          >
            {showCreateForm ? (
              <>
                <X className='w-4 h-4' /> {t("cancel")}
              </>
            ) : (
              <>
                <Plus className='w-4 h-4' /> {t("newAlbum")}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area - Scrollable */}
      <div className='flex-1 overflow-y-auto pr-2 custom-scrollbar pb-20'>
        {error && (
          <div className='bg-rose-50 border border-rose-200 text-rose-500 px-6 py-4 rounded-2xl mb-8 flex items-center gap-2 text-sm font-medium'>
            <span className='animate-pulse'>❤</span>
            {error}
          </div>
        )}

        {/* Create Album Form */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className='overflow-hidden mb-12'
            >
              <div className='glass-panel p-10 rounded-[2.5rem] relative border-rose-100/50'>
                <h2 className='text-2xl font-bold mb-8 text-rose-600 flex items-center gap-3'>
                  <FolderHeart className='w-6 h-6 text-rose-500' />
                  {t("form.title")}
                </h2>
                <form
                  onSubmit={handleCreateAlbum}
                  className='space-y-6'
                >
                  <div className='grid grid-cols-1 gap-6'>
                    <div>
                      <label className='block text-xs font-bold text-rose-400 uppercase tracking-widest mb-2 ml-1'>
                        {t("form.name")} *
                      </label>
                      <input
                        type='text'
                        value={newAlbum.title}
                        onChange={(e) =>
                          setNewAlbum({ ...newAlbum, title: e.target.value })
                        }
                        required
                        className='w-full px-6 py-4 bg-white/50 border border-rose-100 rounded-2xl focus:border-rose-400 text-rose-700 placeholder:text-rose-200 outline-none transition-all shadow-inner'
                        placeholder={t("form.placeholders.title")}
                      />
                    </div>

                    <div>
                      <label className='block text-xs font-bold text-rose-400 uppercase tracking-widest mb-2 ml-1'>
                        {t("form.description")}
                      </label>
                      <textarea
                        value={newAlbum.description}
                        onChange={(e) =>
                          setNewAlbum({
                            ...newAlbum,
                            description: e.target.value,
                          })
                        }
                        className='w-full px-6 py-4 bg-white/50 border border-rose-100 rounded-2xl focus:border-rose-400 text-rose-700 placeholder:text-rose-200 outline-none transition-all shadow-inner min-h-[120px]'
                        placeholder={t("form.placeholders.description")}
                        rows={3}
                      />
                    </div>

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                      <div>
                        <label className='block text-xs font-bold text-rose-400 uppercase tracking-widest mb-2 ml-1'>
                          {t("form.location")}
                        </label>
                        <div className='relative'>
                          <input
                            type='text'
                            value={newAlbum.location}
                            onChange={(e) =>
                              setNewAlbum({
                                ...newAlbum,
                                location: e.target.value,
                              })
                            }
                            className='w-full px-6 py-4 bg-white/50 border border-rose-100 rounded-2xl focus:border-rose-400 text-rose-700 placeholder:text-rose-200 outline-none transition-all shadow-inner'
                            placeholder={t("form.placeholders.location")}
                          />
                          <MapPin className='absolute right-6 top-4 w-5 h-5 text-rose-200' />
                        </div>
                      </div>

                      <div className='grid grid-cols-2 gap-4'>
                        <div>
                          <label className='block text-xs font-bold text-rose-400 uppercase tracking-widest mb-2 ml-1'>
                            {t("form.startDate")}
                          </label>
                          <input
                            type='date'
                            value={newAlbum.startDate}
                            onChange={(e) =>
                              setNewAlbum({
                                ...newAlbum,
                                startDate: e.target.value,
                              })
                            }
                            className='w-full px-6 py-4 bg-white/50 border border-rose-100 rounded-2xl focus:border-rose-400 text-rose-700 outline-none transition-all shadow-inner'
                          />
                        </div>
                        <div>
                          <label className='block text-xs font-bold text-rose-400 uppercase tracking-widest mb-2 ml-1'>
                            {t("form.endDate")}
                          </label>
                          <input
                            type='date'
                            value={newAlbum.endDate}
                            onChange={(e) =>
                              setNewAlbum({
                                ...newAlbum,
                                endDate: e.target.value,
                              })
                            }
                            className='w-full px-6 py-4 bg-white/50 border border-rose-100 rounded-2xl focus:border-rose-400 text-rose-700 outline-none transition-all shadow-inner'
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className='flex justify-end pt-6 border-t border-rose-100/50'>
                    <button
                      type='submit'
                      className='bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 px-12 rounded-full shadow-lg shadow-rose-200 transition-all'
                    >
                      {t("form.submit")}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Albums Grid */}
        {loading ? (
          <div className='min-h-[50vh] flex items-center justify-center'>
            <div className='flex flex-col items-center gap-6'>
              <Heart className='w-16 h-16 text-rose-400 animate-pulse fill-rose-100' />
              <div className='text-sm text-rose-300 font-bold tracking-[0.2em] animate-pulse uppercase'>
                Revisiting Memories...
              </div>
            </div>
          </div>
        ) : albums.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-24 border-2 border-dashed border-rose-100 rounded-[3rem] bg-white/40'>
            <div className='mb-6 opacity-40 text-rose-300'>
              <FolderHeart className='w-20 h-20' />
            </div>
            <h3 className='text-2xl font-bold text-rose-500 mb-2'>
              {t("noAlbums.title")}
            </h3>
            <p className='text-rose-300 text-sm mb-10 text-center max-w-sm'>
              {t("noAlbums.description")}
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className='text-rose-500 hover:text-rose-600 font-bold decoration-rose-200 underline-offset-8 underline text-lg transition-all'
            >
              {t("noAlbums.create")}
            </button>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
            {albums.map((album) => (
              <motion.div
                key={album.id}
                whileHover={{ y: -10 }}
                onClick={() => onSelectAlbum(album.id)}
                className='group relative bg-white/80 dark:bg-black/40 rounded-[3rem] p-4 m-4 border border-rose-100/50 hover:border-rose-300 hover:shadow-[0_20px_50px_rgba(255,182,193,0.3)] transition-all duration-500 cursor-pointer backdrop-blur-sm'
              >
                {/* Image Area */}
                <div className='aspect-[4/3] rounded-[2.5rem] relative overflow-hidden bg-rose-50 border-4 border-white shadow-inner'>
                  <HeartOverlay />

                  {album.coverPhotoUrl ? (
                    <Image
                      src={album.coverPhotoUrl}
                      alt={album.title}
                      fill
                      sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
                      className='object-cover group-hover:scale-110 transition-transform duration-700'
                    />
                  ) : (
                    <div className='w-full h-full flex flex-col items-center justify-center text-rose-200'>
                      <Camera className='w-12 h-12 mb-3 opacity-30 animate-pulse' />
                      <span className='text-[10px] uppercase font-bold tracking-widest opacity-40'>
                        Awaiting Memories
                      </span>
                    </div>
                  )}

                  {/* Top Badge */}
                  <div className='absolute top-4 right-4 z-20'>
                    <div className='bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full shadow-sm flex items-center gap-2'>
                      <Heart className='w-3 h-3 text-rose-500 fill-rose-500' />
                      <span className='text-[10px] font-black text-rose-500 tracking-tighter uppercase'>
                        Memory Storage
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content Area */}
                <div className='px-6 py-8 flex flex-col'>
                  <div className='flex justify-between items-start mb-3'>
                    <h3 className='text-3xl font-black text-rose-900 dark:text-rose-100 group-hover:text-rose-500 transition-colors truncate tracking-tight'>
                      {album.title}
                    </h3>
                  </div>

                  {album.description && (
                    <p className='text-rose-400/80 text-sm mb-8 line-clamp-2 leading-relaxed font-medium min-h-[2.5rem]'>
                      {album.description}
                    </p>
                  )}

                  <div className='flex items-center justify-between pt-6 border-t border-rose-50/50'>
                    <div className='flex flex-col gap-1'>
                      <div className='flex items-center gap-2 text-rose-300 text-[10px] font-bold uppercase tracking-[0.2em]'>
                        <MapPin className='w-3 h-3' />
                        {album.location || "Forever & Always"}
                      </div>
                    </div>

                    <div className='w-12 h-12 rounded-full bg-rose-50 text-rose-400 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all shadow-sm group-hover:shadow-rose-200'>
                      <ChevronRight className='w-6 h-6' />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
