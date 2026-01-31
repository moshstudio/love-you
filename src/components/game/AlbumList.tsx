"use client";

import { useEffect, useState } from "react";
import { albumsApi } from "@/lib/api";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  MapPin,
  Camera,
  FolderOpen,
  X,
  ChevronRight,
  ArrowLeft,
  Trash2,
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
      <div className='flex justify-between items-center mb-6 border-b border-cyan-900/50 pb-4 shrink-0 gap-4'>
        <div>
          <h2 className='text-3xl font-bold text-cyan-500 tracking-wider mb-1 uppercase'>
            // {t("title")}
          </h2>
          <p className='text-xs text-slate-500 tracking-widest'>
            SECURE_DATA_STORAGE_UNITS
          </p>
        </div>

        <div className='flex gap-4'>
          <button
            onClick={onStartUpload}
            className='flex items-center gap-2 px-6 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] font-bold text-sm tracking-wider uppercase transition-all duration-300 group'
          >
            <Camera className='w-4 h-4 group-hover:rotate-12 transition-transform' />
            [ {gameT("uploadMemory")} ]
          </button>

          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={`
                group flex items-center gap-2 px-6 py-2 font-bold text-sm tracking-wider uppercase border
                transition-all duration-300
                ${
                  showCreateForm
                    ? "border-red-500/50 text-red-400 hover:bg-red-900/10"
                    : "border-slate-700 text-slate-400 hover:border-cyan-500 hover:text-cyan-400 hover:bg-slate-800"
                }
            `}
          >
            {showCreateForm ? (
              <>
                <X className='w-4 h-4' />[ {t("cancel")} ]
              </>
            ) : (
              <>
                <Plus className='w-4 h-4' />[ {t("newAlbum")} ]
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area - Scrollable */}
      <div className='flex-1 overflow-y-auto pr-2 custom-scrollbar pb-20'>
        {error && (
          <div className='bg-red-900/20 border border-red-500/50 text-red-400 px-6 py-4 mb-8 flex items-center gap-2 text-sm'>
            <span className='animate-pulse'>⚠</span>
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
              <div className='bg-slate-900/80 border border-cyan-500/30 p-8 relative'>
                {/* Decorative corners */}
                <div className='absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-500' />
                <div className='absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-500' />
                <div className='absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-500' />
                <div className='absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-500' />

                <h2 className='text-xl font-bold mb-6 text-cyan-100 flex items-center gap-2'>
                  <FolderOpen className='w-5 h-5 text-cyan-500' />
                  {t("form.title")}
                </h2>
                <form
                  onSubmit={handleCreateAlbum}
                  className='space-y-6'
                >
                  <div className='grid grid-cols-1 gap-6'>
                    <div>
                      <label className='block text-xs font-bold text-cyan-500/70 mb-2 ml-1 uppercase tracking-wider'>
                        {t("form.name")} *
                      </label>
                      <input
                        type='text'
                        value={newAlbum.title}
                        onChange={(e) =>
                          setNewAlbum({ ...newAlbum, title: e.target.value })
                        }
                        required
                        className='w-full px-5 py-3 bg-slate-800/50 border border-slate-700 focus:border-cyan-500 text-cyan-100 placeholder:text-slate-600 outline-none transition-all font-mono'
                        placeholder={t("form.placeholders.title")}
                      />
                    </div>

                    <div>
                      <label className='block text-xs font-bold text-cyan-500/70 mb-2 ml-1 uppercase tracking-wider'>
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
                        className='w-full px-5 py-3 bg-slate-800/50 border border-slate-700 focus:border-cyan-500 text-cyan-100 placeholder:text-slate-600 outline-none transition-all font-mono min-h-[100px]'
                        placeholder={t("form.placeholders.description")}
                        rows={3}
                      />
                    </div>

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                      <div>
                        <label className='block text-xs font-bold text-cyan-500/70 mb-2 ml-1 uppercase tracking-wider'>
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
                            className='w-full px-5 py-3 bg-slate-800/50 border border-slate-700 focus:border-cyan-500 text-cyan-100 placeholder:text-slate-600 outline-none transition-all font-mono'
                            placeholder={t("form.placeholders.location")}
                          />
                          <MapPin className='absolute right-4 top-3 w-4 h-4 text-slate-600' />
                        </div>
                      </div>

                      <div className='grid grid-cols-2 gap-4'>
                        <div>
                          <label className='block text-xs font-bold text-cyan-500/70 mb-2 ml-1 uppercase tracking-wider'>
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
                            className='w-full px-5 py-3 bg-slate-800/50 border border-slate-700 focus:border-cyan-500 text-cyan-100 outline-none transition-all font-mono'
                          />
                        </div>
                        <div>
                          <label className='block text-xs font-bold text-cyan-500/70 mb-2 ml-1 uppercase tracking-wider'>
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
                            className='w-full px-5 py-3 bg-slate-800/50 border border-slate-700 focus:border-cyan-500 text-cyan-100 outline-none transition-all font-mono'
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className='flex justify-end pt-4 border-t border-slate-800'>
                    <button
                      type='submit'
                      className='bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 font-bold py-3 px-8 uppercase tracking-widest hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all duration-300'
                    >
                      [ {t("form.submit")} ]
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Albums Grid */}
        {loading ? (
          <div className='min-h-[50vh] flex items-center justify-center text-cyan-500 font-mono'>
            <div className='flex flex-col items-center gap-4'>
              <div className='w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin' />
              <div className='text-xs tracking-widest animate-pulse'>
                LOADING_ARCHIVES...
              </div>
            </div>
          </div>
        ) : albums.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-20 border border-dashed border-slate-700 rounded-lg bg-slate-900/50'>
            <div className='text-6xl mb-6 opacity-20 text-cyan-500'>
              <FolderOpen className='w-16 h-16' />
            </div>
            <h3 className='text-xl font-bold text-cyan-500 mb-2 tracking-wider'>
              {t("noAlbums.title")}
            </h3>
            <p className='text-slate-500 text-sm mb-8 font-mono'>
              {t("noAlbums.description")}
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className='text-cyan-400 hover:text-cyan-300 font-bold hover:underline decoration-cyan-500/30 underline-offset-4 tracking-wide'
            >
              [ {t("noAlbums.create")} ]
            </button>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {albums.map((album) => (
              <div
                key={album.id}
                onClick={() => onSelectAlbum(album.id)}
                className='group relative bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 overflow-hidden cursor-pointer'
              >
                {/* Image Area */}
                <div className='aspect-[4/3] bg-slate-950 relative overflow-hidden'>
                  <div className='absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity z-10' />

                  {album.coverPhotoUrl ? (
                    <img
                      src={album.coverPhotoUrl}
                      alt={album.title}
                      className='w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500'
                    />
                  ) : (
                    <div className='w-full h-full flex flex-col items-center justify-center text-slate-700'>
                      <Camera className='w-12 h-12 mb-2 opacity-50' />
                      <span className='text-xs tracking-widest opacity-50'>
                        NO_IMG_DATA
                      </span>
                    </div>
                  )}

                  {/* Overlay Stats */}
                  <div className='absolute top-2 right-2 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity'>
                    <div className='bg-black/70 border border-cyan-500/30 text-cyan-400 text-[10px] px-2 py-1 font-mono'>
                      ID: {album.id.substring(0, 6)}
                    </div>
                  </div>
                </div>

                {/* Content Area */}
                <div className='p-6 relative'>
                  <h3 className='text-xl font-bold text-slate-200 mb-2 group-hover:text-cyan-400 transition-colors truncate tracking-wide'>
                    {album.title}
                  </h3>

                  {album.description && (
                    <p className='text-slate-500 text-xs mb-4 line-clamp-2 leading-relaxed font-mono'>
                      {album.description}
                    </p>
                  )}

                  <div className='flex items-center justify-between mt-4 pt-4 border-t border-slate-800'>
                    {album.location ? (
                      <div className='flex items-center gap-1 text-cyan-600/70 text-xs uppercase tracking-wider'>
                        <MapPin className='w-3 h-3' />
                        {album.location}
                      </div>
                    ) : (
                      <span></span>
                    )}

                    <span className='text-slate-600 group-hover:text-cyan-400 text-xs tracking-widest flex items-center gap-1 transition-colors'>
                      {t("viewAlbum")} <ChevronRight className='w-3 h-3' />
                    </span>
                  </div>
                </div>

                {/* Corner decorations */}
                <div className='absolute top-0 left-0 w-2 h-2 border-t border-l border-slate-700 group-hover:border-cyan-500 transition-colors' />
                <div className='absolute bottom-0 right-0 w-2 h-2 border-b border-r border-slate-700 group-hover:border-cyan-500 transition-colors' />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
