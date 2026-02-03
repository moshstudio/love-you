"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Image as ImageIcon,
  ArrowLeft,
  Trash2,
  Heart,
  Sparkles,
  FileText,
  Share2,
  X,
  Copy,
  Check,
  Upload,
  GalleryHorizontal,
} from "lucide-react";
import { albumsApi, photosApi, storiesApi, shareApi } from "@/lib/api";
import { useRouter } from "@/i18n/routing";
import { compressImage } from "@/lib/imageCompression";

interface Photo {
  id: string;
  url: string;
  caption?: string;
  latitude?: number;
  longitude?: number;
}

interface Story {
  id: string;
  title: string;
  content: string;
  createdAt?: string;
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
  const detailT = useTranslations("AlbumDetail");
  const router = useRouter();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"photos" | "stories">("photos");

  const [showDeleteAlbumConfirm, setShowDeleteAlbumConfirm] = useState(false);
  const [isDeletingAlbum, setIsDeletingAlbum] = useState(false);

  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const [showStoryForm, setShowStoryForm] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);

  const fetchData = useCallback(async () => {
    if (!albumId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [photosRes, albumRes, storiesRes] = await Promise.all([
        fetch(`/api/photos?albumId=${albumId}`),
        albumsApi.get(albumId) as Promise<Album>,
        storiesApi.list(albumId) as Promise<Story[]>,
      ]);

      if (photosRes.ok) {
        const data = (await photosRes.json()) as Photo[];
        setPhotos(data);
      }
      setAlbum(albumRes);
      setStories(storiesRes);
    } catch (error) {
      console.error("Failed to fetch archives data", error);
    } finally {
      setLoading(false);
    }
  }, [albumId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, albumId]);

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

  const handleCreateShare = async () => {
    try {
      const response = (await shareApi.create(albumId, 30 * 24 * 60 * 60)) as {
        shareUrl: string;
      };
      setShareUrl(response.shareUrl);
    } catch (err) {
      console.error("Failed to generate share link", err);
    }
  };

  const handleCreateStory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;

    try {
      await storiesApi.create(albumId, title, content);
      setShowStoryForm(false);
      fetchData();
    } catch (err) {
      console.error("Failed to create story", err);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      await storiesApi.delete(storyId);
      fetchData();
    } catch (err) {
      console.error("Failed to delete story", err);
    }
  };

  const [isUploading, setIsUploading] = useState(false);

  const handlePhotoUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isUploading) return;

    const formData = new FormData(e.currentTarget);
    const files = formData.getAll("file") as File[];
    const caption = formData.get("caption") as string;

    if (!files.length || files.length === 0) return;

    try {
      setIsUploading(true);

      // Process files sequentially to avoid overwhelming the browser/server
      for (const file of files) {
        if (file.size === 0) continue;

        // Compress image before upload
        const compressedFile = await compressImage(file);

        await photosApi.upload(compressedFile, albumId, caption);
      }

      setShowUploadForm(false);
      fetchData();
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className='w-full max-w-7xl mx-auto p-4 z-20 h-full flex flex-col'>
      {/* Header */}
      <div className='flex justify-between items-center mb-8 border-b border-rose-100/50 pb-6 shrink-0'>
        <div>
          <h2 className='text-4xl text-rose-500 font-black tracking-tighter'>
            {album ? album.title : t("accessArchives")}
          </h2>
          <div className='text-rose-300 text-[10px] font-black uppercase tracking-[0.2em] mt-2 flex gap-6'>
            {album?.location && (
              <span className='flex items-center gap-1.5'>
                <MapPin className='w-3.5 h-3.5' /> {album.location}
              </span>
            )}
            <span className='flex items-center gap-1.5'>
              <Heart className='w-3.5 h-3.5' /> ID: {albumId?.substring(0, 8)}
            </span>
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <button
            onClick={() => router.push(`/albums/${albumId}/gallery`)}
            className='p-3 bg-rose-50 text-rose-400 hover:bg-rose-100 rounded-full transition-all'
            title={detailT("viewGallery") || "Gallery View"}
          >
            <GalleryHorizontal className='w-5 h-5' />
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className='p-3 bg-rose-50 text-rose-400 hover:bg-rose-100 rounded-full transition-all'
            title={detailT("shareAlbum")}
          >
            <Share2 className='w-5 h-5' />
          </button>
          <button
            onClick={() => setShowDeleteAlbumConfirm(true)}
            className='p-3 bg-rose-50 text-rose-300 hover:text-rose-500 rounded-full transition-all'
            title={t("delete")}
          >
            <Trash2 className='w-5 h-5' />
          </button>
          <button
            onClick={onBack}
            className='flex items-center gap-2 px-6 py-2.5 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 font-bold group text-sm'
          >
            <ArrowLeft className='w-4 h-4 group-hover:-translate-x-1 transition-transform' />
            {t("returnToRoot")}
          </button>
        </div>
      </div>

      {/* Album Description (If exists) */}
      {album?.description && (
        <div className='mb-8 px-2'>
          <p className='text-rose-800/60 text-sm font-medium italic'>
            &quot;{album.description}&quot;
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className='flex gap-2 mb-8 px-2'>
        <button
          onClick={() => setActiveTab("photos")}
          className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] transition-all ${
            activeTab === "photos"
              ? "bg-rose-500 text-white shadow-md shadow-rose-200"
              : "bg-rose-50 text-rose-300 hover:text-rose-500"
          }`}
        >
          {detailT("tabs.photos", { count: photos.length })}
        </button>
        <button
          onClick={() => setActiveTab("stories")}
          className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] transition-all ${
            activeTab === "stories"
              ? "bg-rose-500 text-white shadow-md shadow-rose-200"
              : "bg-rose-50 text-rose-300 hover:text-rose-500"
          }`}
        >
          {detailT("tabs.stories", { count: stories.length })}
        </button>

        <div className='flex-1' />

        <div className='flex gap-2'>
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className='flex items-center gap-2 px-4 py-2 bg-white border border-rose-100 text-rose-400 hover:bg-rose-50 rounded-full text-[10px] font-black uppercase tracking-widest transition-all'
          >
            <Upload className='w-3.5 h-3.5' />
            {showUploadForm ? detailT("cancel") : detailT("uploadPhoto")}
          </button>
          <button
            onClick={() => setShowStoryForm(!showStoryForm)}
            className='flex items-center gap-2 px-4 py-2 bg-white border border-rose-100 text-rose-400 hover:bg-rose-50 rounded-full text-[10px] font-black uppercase tracking-widest transition-all'
          >
            <FileText className='w-3.5 h-3.5' />
            {showStoryForm ? detailT("cancel") : detailT("addStory")}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className='flex-1 overflow-y-auto pr-2 custom-scrollbar pb-10'>
        {/* Upload Form Overlay */}
        <AnimatePresence>
          {showUploadForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className='glass-panel p-8 rounded-[2rem] mb-8 border-rose-100 overflow-hidden'
            >
              <form
                onSubmit={handlePhotoUpload}
                className='space-y-4'
              >
                <input
                  type='file'
                  name='file'
                  accept='image/*'
                  multiple
                  required
                  className='w-full text-sm text-rose-500'
                />
                <textarea
                  name='caption'
                  placeholder={detailT("upload.captionPlaceholder")}
                  className='w-full p-4 bg-white/50 border border-rose-100 rounded-xl outline-none'
                  rows={2}
                />
                <button
                  type='submit'
                  disabled={isUploading}
                  className='px-6 py-2 bg-rose-500 text-white font-bold rounded-full text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {isUploading ? "Uploading..." : detailT("upload.submit")}
                </button>
              </form>
            </motion.div>
          )}
          {showStoryForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className='glass-panel p-8 rounded-[2rem] mb-8 border-rose-100 overflow-hidden'
            >
              <form
                onSubmit={handleCreateStory}
                className='space-y-4'
              >
                <input
                  name='title'
                  required
                  placeholder={detailT("story.titlePlaceholder")}
                  className='w-full p-4 bg-white/50 border border-rose-100 rounded-xl outline-none font-bold'
                />
                <textarea
                  name='content'
                  required
                  placeholder={detailT("story.contentPlaceholder")}
                  className='w-full p-4 bg-white/50 border border-rose-100 rounded-xl outline-none'
                  rows={4}
                />
                <button
                  type='submit'
                  className='px-6 py-2 bg-rose-500 text-white font-bold rounded-full text-xs uppercase tracking-widest'
                >
                  {detailT("story.submit")}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className='flex flex-col items-center justify-center h-64 gap-4'>
            <Sparkles className='w-10 h-10 text-rose-400 animate-spin-slow' />
            <div className='text-rose-300 text-sm font-bold tracking-widest animate-pulse uppercase'>
              Opening Memory Vault...
            </div>
          </div>
        ) : activeTab === "photos" ? (
          photos.length === 0 ? (
            <div className='flex flex-col items-center justify-center h-80 border-2 border-dashed border-rose-100 rounded-[3rem] bg-white/40'>
              <ImageIcon className='w-16 h-16 text-rose-200 mb-4' />
              <p className='text-rose-300 font-bold uppercase tracking-widest text-[10px]'>
                {detailT("empty.photos")}
              </p>
            </div>
          ) : (
            <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'>
              {photos.map((photo, index) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -5 }}
                  transition={{ delay: index * 0.05 }}
                  className='relative group aspect-square cursor-pointer overflow-hidden rounded-[2rem] border-4 border-white shadow-md hover:shadow-xl transition-all bg-white'
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || "Memory"}
                    className='w-full h-full object-cover group-hover:scale-110 transition-transform duration-700'
                  />
                  <div className='absolute inset-0 bg-gradient-to-t from-rose-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4'>
                    <p className='text-[10px] text-white font-black truncate uppercase tracking-widest'>
                      {photo.caption}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        ) : /* Stories Tab */
        stories.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-80 border-2 border-dashed border-rose-100 rounded-[3rem] bg-white/40'>
            <FileText className='w-16 h-16 text-rose-200 mb-4' />
            <p className='text-rose-300 font-bold uppercase tracking-widest text-[10px]'>
              {detailT("empty.stories")}
            </p>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {stories.map((story, index) => (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className='glass-panel p-8 rounded-[2.5rem] relative border-rose-100 hover:bg-white hover:shadow-xl transition-all group'
              >
                <div className='flex justify-between items-start mb-4'>
                  <h3 className='text-xl font-black text-rose-900 tracking-tighter'>
                    {story.title}
                  </h3>
                  <button
                    onClick={() => handleDeleteStory(story.id)}
                    className='p-2 text-rose-200 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all'
                  >
                    <Trash2 className='w-4 h-4' />
                  </button>
                </div>
                <p className='text-rose-800/70 text-sm leading-relaxed font-medium italic mb-6 line-clamp-4'>
                  &quot;{story.content}&quot;
                </p>
                <div className='text-[9px] font-black text-rose-300 tracking-[0.2em] uppercase'>
                  {story.createdAt &&
                    new Date(story.createdAt).toLocaleDateString()}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modals (Selected Photo, Delete Confirm, Share, Delete Album) */}
      {/* ... keeping the modal logic but styling them romantic ... */}

      {/* Photo Viewer Modal */}
      {selectedPhoto &&
        createPortal(
          <div
            className='fixed inset-0 z-[100] flex items-center justify-center bg-rose-950/40 backdrop-blur-md p-6'
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
                  className='absolute top-6 right-6 p-3 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all text-rose-500'
                >
                  <X className='w-6 h-6' />
                </button>
              </div>
              <div className='p-8 bg-white border-t border-rose-100'>
                <div className='flex justify-between items-start'>
                  <div>
                    <h3 className='text-2xl font-black text-rose-900 mb-2'>
                      {selectedPhoto.caption}
                    </h3>
                    <div className='flex items-center gap-4 text-[10px] text-rose-300 font-black uppercase tracking-widest'>
                      <span>MOMENT_ID: {selectedPhoto.id.substring(0, 8)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className='p-4 bg-rose-50 text-rose-300 hover:text-rose-500 rounded-full transition-all'
                  >
                    <Trash2 className='w-6 h-6' />
                  </button>
                </div>
              </div>

              {/* Delete Confirmation Overlay */}
              {showDeleteConfirm && (
                <div className='absolute inset-0 z-10 flex items-center justify-center bg-rose-950/60 backdrop-blur-sm p-6'>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className='bg-white p-10 rounded-[2.5rem] max-w-sm w-full shadow-2xl text-center'
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className='text-2xl font-black text-rose-900 mb-4'>
                      Let this memory fade?
                    </h3>
                    <p className='text-rose-400 text-sm mb-10 font-medium'>
                      Are you sure you want to remove this beautiful moment?
                    </p>
                    <div className='flex gap-3'>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className='flex-1 py-4 bg-rose-50 text-rose-400 font-black rounded-full text-[10px] uppercase tracking-widest'
                      >
                        Keep it
                      </button>
                      <button
                        onClick={handleDelete}
                        className='flex-1 py-4 bg-rose-500 text-white font-black rounded-full text-[10px] uppercase tracking-widest'
                        disabled={deleting}
                      >
                        {deleting ? "Processing..." : "Remove"}
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.div>
          </div>,
          document.body,
        )}

      {/* Share Modal */}
      {showShareModal &&
        createPortal(
          <div
            className='fixed inset-0 z-[100] flex items-center justify-center bg-rose-950/40 backdrop-blur-sm p-6'
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className='bg-white p-10 rounded-[3rem] max-w-md w-full shadow-2xl relative border border-rose-100'
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className='text-3xl font-black text-rose-900 mb-6 tracking-tighter text-center'>
                {detailT("share.title")}
              </h3>
              {shareUrl ? (
                <div className='space-y-6'>
                  <div className='bg-rose-50 p-4 rounded-2xl border-2 border-dashed border-rose-200 break-all text-rose-700 text-xs font-bold text-center'>
                    {shareUrl}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className='w-full py-4 bg-rose-500 text-white font-black rounded-full flex items-center justify-center gap-2 uppercase tracking-widest text-[10px] shadow-lg shadow-rose-100'
                  >
                    {copied ? (
                      <Check className='w-4 h-4' />
                    ) : (
                      <Copy className='w-4 h-4' />
                    )}
                    {copied
                      ? detailT("share.copied")
                      : detailT("share.copyLink")}
                  </button>
                </div>
              ) : (
                <div className='space-y-6'>
                  <p className='text-rose-400 text-sm text-center font-medium'>
                    Generate a public link to share this beautiful story with
                    others.
                  </p>
                  <button
                    onClick={handleCreateShare}
                    className='w-full py-4 bg-rose-500 text-white font-black rounded-full uppercase tracking-widest text-[10px] shadow-lg shadow-rose-100'
                  >
                    {detailT("share.generateLink")}
                  </button>
                </div>
              )}
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setShareUrl("");
                }}
                className='absolute top-8 right-8 text-rose-200 hover:text-rose-400 transition-colors'
              >
                <X className='w-6 h-6' />
              </button>
            </motion.div>
          </div>,
          document.body,
        )}

      {/* Album Delete Confirm */}
      {showDeleteAlbumConfirm &&
        createPortal(
          <div
            className='fixed inset-0 z-[110] flex items-center justify-center bg-rose-950/40 backdrop-blur-sm p-6'
            onClick={() => setShowDeleteAlbumConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className='bg-white p-12 rounded-[3rem] max-w-sm w-full shadow-2xl text-center'
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className='text-3xl font-black text-rose-900 mb-4 tracking-tighter'>
                Erase this story?
              </h3>
              <p className='text-rose-400 text-sm mb-10 font-medium'>
                This will permanently delete all memories in this album. Are you
                sure?
              </p>
              <div className='flex flex-col gap-3'>
                <button
                  onClick={handleDeleteAlbum}
                  className='w-full py-5 bg-rose-500 text-white font-black rounded-full uppercase tracking-widest text-[10px]'
                  disabled={isDeletingAlbum}
                >
                  {isDeletingAlbum ? "Erasing..." : "Yes, Erase Forever"}
                </button>
                <button
                  onClick={() => setShowDeleteAlbumConfirm(false)}
                  className='w-full py-5 bg-rose-50 text-rose-400 font-black rounded-full uppercase tracking-widest text-[10px]'
                >
                  Keep it safe
                </button>
              </div>
            </motion.div>
          </div>,
          document.body,
        )}
    </div>
  );
}
