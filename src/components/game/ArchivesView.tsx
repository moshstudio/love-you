"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { MapPin, Image as ImageIcon, ArrowLeft, Trash2 } from "lucide-react";
import { albumsApi } from "@/lib/api";

interface Photo {
  id: string;
  url: string;
  caption?: string;
  latitude?: number;
  longitude?: number;
}

interface ArchivesViewProps {
  albumId: string;
  onBack: () => void;
}

interface Album {
  id: string;
  title: string;
  description?: string;
  location?: string;
}

export function ArchivesView({ albumId, onBack }: ArchivesViewProps) {
  const t = useTranslations("Game.UI");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteAlbumConfirm, setShowDeleteAlbumConfirm] = useState(false);
  const [isDeletingAlbum, setIsDeletingAlbum] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!albumId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [photosRes, albumRes] = await Promise.all([
          fetch(`/api/photos?albumId=${albumId}`),
          albumsApi.get(albumId) as Promise<Album>,
        ]);

        if (photosRes.ok) {
          const data = (await photosRes.json()) as Photo[];
          setPhotos(data);
        }
        setAlbum(albumRes);
      } catch (error) {
        console.error("Failed to fetch archives data", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [albumId]);

  const handleDelete = async () => {
    if (!selectedPhoto) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/photos?id=${selectedPhoto.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPhotos(photos.filter((p) => p.id !== selectedPhoto.id));
        setSelectedPhoto(null);
        setShowDeleteConfirm(false);
      }
    } catch (error) {
      console.error("Failed to delete photo", error);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAlbum = async () => {
    if (!albumId) return;
    try {
      setIsDeletingAlbum(true);
      await albumsApi.delete(albumId);
      onBack();
    } catch (error) {
      console.error("Failed to delete album", error);
    } finally {
      setIsDeletingAlbum(false);
      setShowDeleteAlbumConfirm(false);
    }
  };

  return (
    <div className='w-full max-w-6xl mx-auto p-4 z-20 h-full flex flex-col'>
      {/* Header */}
      <div className='flex justify-between items-center mb-6 border-b border-cyan-900/50 pb-4'>
        <div>
          <h2 className='text-3xl text-cyan-500 font-bold tracking-widest uppercase'>
            // {album ? album.title : t("accessArchives")}
          </h2>
          <div className='text-slate-500 text-xs font-mono mt-1 flex gap-4'>
            {album?.location && (
              <span className='flex items-center gap-1'>
                <MapPin className='w-3 h-3' /> {album.location}
              </span>
            )}
            <span className='opacity-60'>ID: {albumId?.substring(0, 8)}</span>
          </div>
          {album?.description && (
            <p className='text-slate-400 text-sm font-mono mt-2 max-w-2xl line-clamp-2'>
              {album.description}
            </p>
          )}
        </div>
        <div className='flex items-center gap-3'>
          <button
            onClick={() => setShowDeleteAlbumConfirm(true)}
            className='flex items-center gap-2 px-4 py-2 border border-red-900/30 hover:border-red-500 text-red-700 hover:text-red-400 transition-all font-mono text-xs'
            title={t("delete")}
          >
            <Trash2 className='w-4 h-4' />[ {t("delete")} ]
          </button>
          <button
            onClick={onBack}
            className='flex items-center gap-2 px-4 py-2 border border-slate-700 hover:border-cyan-500 text-slate-400 hover:text-cyan-400 transition-all group'
          >
            <ArrowLeft className='w-4 h-4 group-hover:-translate-x-1 transition-transform' />
            [ {t("returnToRoot")} ]
          </button>
        </div>
      </div>

      {/* Content */}
      <div className='flex-1 overflow-y-auto pr-2 custom-scrollbar'>
        {loading ? (
          <div className='flex items-center justify-center h-64'>
            <div className='text-cyan-500 font-mono animate-pulse'>
              {t("analyzingBitmap")}...
            </div>
          </div>
        ) : photos.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-64 border border-dashed border-slate-800 rounded-lg'>
            <ImageIcon className='w-12 h-12 text-slate-700 mb-4' />
            <p className='text-slate-500 font-mono'>{t("noData")}</p>
          </div>
        ) : (
          <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
            {photos.map((photo, index) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className='relative group aspect-square cursor-pointer overflow-hidden rounded border border-slate-800 hover:border-cyan-500 transition-colors bg-black/50'
                onClick={() => setSelectedPhoto(photo)}
              >
                {/* Image */}
                <img
                  src={photo.url}
                  alt={photo.caption || "Archive"}
                  className='w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500'
                />

                {/* Overlay */}
                <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3'>
                  <p className='text-xs text-cyan-300 font-mono truncate'>
                    {photo.caption === "Incoming Transmission Datastream"
                      ? t("incomingTransmission")
                      : photo.caption}
                  </p>
                  {photo.latitude !== undefined &&
                    photo.longitude !== undefined && (
                      <div className='flex items-center gap-1 text-[10px] text-slate-400 mt-1 font-mono'>
                        <MapPin className='w-3 h-3' />
                        {photo.latitude.toFixed(4)},{" "}
                        {photo.longitude.toFixed(4)}
                      </div>
                    )}
                </div>

                {/* Corner Accents */}
                <div className='absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity' />
                <div className='absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity' />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal - Simple Overlay for View */}
      {selectedPhoto && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4'
          onClick={() => setSelectedPhoto(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className='max-w-4xl w-full max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700 rounded-lg overflow-hidden relative'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='relative flex-1 overflow-hidden bg-center bg-no-repeat bg-contain bg-black'>
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.caption}
                className='w-full h-full object-contain'
              />
            </div>
            <div className='p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur'>
              <h3 className='text-xl font-bold text-white mb-1 font-mono'>
                {selectedPhoto.caption === "Incoming Transmission Datastream"
                  ? t("incomingTransmission")
                  : selectedPhoto.caption}
              </h3>
              <div className='flex justify-between items-end'>
                <div className='text-sm text-slate-400 font-mono space-y-1'>
                  <div>ID: {selectedPhoto.id.substring(0, 8)}</div>
                  {selectedPhoto.latitude && (
                    <div>
                      LOC: {selectedPhoto.latitude}, {selectedPhoto.longitude}
                    </div>
                  )}
                </div>
                <div className='flex gap-2'>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className='px-4 py-2 border border-red-900/50 hover:border-red-500 text-red-700 hover:text-red-500 transition-colors text-sm font-mono flex items-center gap-2'
                  >
                    <Trash2 className='w-4 h-4' />[ {t("delete")} ]
                  </button>
                  <button
                    onClick={() => setSelectedPhoto(null)}
                    className='px-4 py-2 border border-slate-600 hover:border-white text-slate-300 hover:text-white transition-colors text-sm font-mono'
                  >
                    [ CLOSE_VIEWER ]
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Delete Confirmation Overlay */}
            {showDeleteConfirm && (
              <div className='absolute inset-0 z-10 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm'>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className='bg-slate-900 border border-red-500/50 p-6 rounded-lg max-w-sm w-full shadow-[0_0_30px_rgba(239,68,68,0.2)]'
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className='flex items-center gap-3 text-red-500 mb-4 border-b border-red-900/30 pb-2'>
                    <Trash2 className='w-6 h-6 animate-pulse' />
                    <h3 className='text-lg font-bold tracking-wider font-mono'>
                      WARNING: DATA CORRUPTION
                    </h3>
                  </div>

                  <p className='text-slate-300 font-mono text-sm leading-relaxed mb-6'>
                    {t("confirmDelete")}
                  </p>

                  <div className='flex gap-3 justify-end'>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className='px-4 py-2 bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-all text-xs font-mono tracking-wide'
                      disabled={deleting}
                    >
                      [ ABORT ]
                    </button>
                    <button
                      onClick={handleDelete}
                      className='px-4 py-2 bg-red-900/20 border border-red-500 text-red-400 hover:bg-red-900/40 hover:text-red-200 hover:shadow-[0_0_10px_rgba(239,68,68,0.4)] transition-all text-xs font-mono tracking-wide flex items-center gap-2'
                      disabled={deleting}
                    >
                      {deleting && <span className='animate-spin'>/</span>}[
                      CONFIRM_ERASE ]
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        </div>
      )}
      {/* Album Delete Confirmation Modal */}
      {showDeleteAlbumConfirm && (
        <div
          className='fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm'
          onClick={() => setShowDeleteAlbumConfirm(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className='bg-slate-900 border border-red-500/50 p-6 rounded-lg max-w-sm w-full shadow-[0_0_30px_rgba(239,68,68,0.2)]'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center gap-3 text-red-500 mb-4 border-b border-red-900/30 pb-2'>
              <Trash2 className='w-6 h-6 animate-pulse' />
              <h3 className='text-lg font-bold tracking-wider font-mono'>
                WARNING: DELETE ALBUM
              </h3>
            </div>
            <p className='text-slate-300 font-mono text-sm leading-relaxed mb-6'>
              {t("confirmDelete")}
            </p>
            <div className='flex gap-3 justify-end'>
              <button
                onClick={() => setShowDeleteAlbumConfirm(false)}
                className='px-4 py-2 bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-all text-xs font-mono tracking-wide'
                disabled={isDeletingAlbum}
              >
                [ ABORT ]
              </button>
              <button
                onClick={handleDeleteAlbum}
                className='px-4 py-2 bg-red-900/20 border border-red-500 text-red-400 hover:bg-red-900/40 hover:text-red-200 hover:shadow-[0_0_10px_rgba(239,68,68,0.4)] transition-all text-xs font-mono tracking-wide flex items-center gap-2'
                disabled={isDeletingAlbum}
              >
                {isDeletingAlbum && <span className='animate-spin'>/</span>}[
                CONFIRM_ERASE ]
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
