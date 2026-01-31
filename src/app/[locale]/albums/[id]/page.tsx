"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useParams } from "next/navigation"; // useParams is fine from next/navigation
import { useAuth } from "@/hooks/useAuth";
import { albumsApi, photosApi, storiesApi, shareApi } from "@/lib/api";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import ParticleBackground from "@/components/game/ParticleBackground";
import {
  ArrowLeft,
  Upload,
  FileText,
  Share2,
  Trash2,
  MapPin,
  Calendar,
  Image as ImageIcon,
  X,
  Copy,
  Check,
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

export default function AlbumDetailPage() {
  const params = useParams();
  const albumId = params.id as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const t = useTranslations("AlbumDetail");
  const gameT = useTranslations("Game.UI");

  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const [album, setAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"photos" | "stories">("photos");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showStoryForm, setShowStoryForm] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showItemDeleteModal, setShowItemDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    id: string;
    type: "photo" | "story";
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      loadAlbumData();
    }
  }, [user?.email, authLoading, router]);

  const loadAlbumData = async () => {
    try {
      setLoading(true);
      const [albumData, photosData, storiesData] = await Promise.all([
        albumsApi.get(albumId) as Promise<Album>,
        photosApi.list(albumId) as Promise<Photo[]>,
        storiesApi.list(albumId) as Promise<Story[]>,
      ]);
      setAlbum(albumData);
      setPhotos(photosData);
      setStories(storiesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("notFound"));
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get("file") as File;
    const caption = formData.get("caption") as string;

    if (!file) {
      setError(t("upload.errorFile"));
      return;
    }

    try {
      await photosApi.upload(file, albumId, caption);
      setShowUploadForm(false);
      loadAlbumData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("upload.errorGeneric"));
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    setItemToDelete({ id: photoId, type: "photo" });
    setShowItemDeleteModal(true);
  };

  const handleCreateStory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;

    try {
      await storiesApi.create(albumId, title, content);
      setShowStoryForm(false);
      loadAlbumData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("story.errorGeneric"));
    }
  };

  const handleDeleteStory = (storyId: string) => {
    setItemToDelete({ id: storyId, type: "story" });
    setShowItemDeleteModal(true);
  };

  const handleConfirmItemDelete = async () => {
    if (!itemToDelete) return;

    try {
      setIsDeleting(true);
      if (itemToDelete.type === "photo") {
        await photosApi.delete(itemToDelete.id);
        if (selectedPhoto?.id === itemToDelete.id) {
          setSelectedPhoto(null);
        }
      } else {
        await storiesApi.delete(itemToDelete.id);
      }
      loadAlbumData();
      setShowItemDeleteModal(false);
      setItemToDelete(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              `delete.error${itemToDelete.type === "photo" ? "Photo" : "Story"}`,
            ),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateShare = async () => {
    try {
      const response = (await shareApi.create(albumId, 30 * 24 * 60 * 60)) as {
        shareUrl: string;
      }; // 30 days
      setShareUrl(response.shareUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("share.errorGeneric"));
    }
  };

  const handleDeleteAlbum = async () => {
    try {
      setIsDeleting(true);
      await albumsApi.delete(albumId);
      router.push("/albums");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete album");
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-slate-900 text-cyan-500 font-mono'>
        <div className='flex flex-col items-center gap-4'>
          <div className='w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin' />
          <div className='text-xs tracking-widest animate-pulse'>
            LOADING_DATA...
          </div>
        </div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-slate-900 text-slate-500 font-mono'>
        <div className='text-xl border border-dashed border-slate-700 p-8 rounded'>
          ERROR: {t("notFound")}
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-slate-900 text-slate-200 font-mono relative overflow-hidden'>
      <ParticleBackground />

      {/* Header */}
      <header className='fixed top-0 left-0 right-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-cyan-900/50'>
        <div className='max-w-7xl mx-auto px-6 h-20 flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <Link
              href='/albums'
              className='flex items-center gap-2 text-cyan-500/70 hover:text-cyan-400 transition-colors uppercase text-xs tracking-widest'
            >
              <ArrowLeft className='w-4 h-4' />
              {t("backToAlbums")}
            </Link>
            <div className='h-4 w-px bg-slate-700 mx-2' />
            <h1 className='text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 truncate max-w-[200px] md:max-w-md'>
              {album.title}
            </h1>
          </div>

          <div className='flex items-center gap-4 text-xs text-slate-500'>
            {album.location && (
              <div className='flex items-center gap-1 hidden sm:flex'>
                <MapPin className='w-3 h-3 text-cyan-600' />
                {album.location}
              </div>
            )}
            <div className='hidden sm:block'>
              ID: {album.id.substring(0, 8)}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20'>
        {error && (
          <div className='bg-red-900/20 border border-red-500/50 text-red-400 px-6 py-4 mb-8 flex items-center gap-2 text-sm'>
            <span className='animate-pulse'>⚠</span>
            {error}
          </div>
        )}

        <div className='grid grid-cols-1 lg:grid-cols-4 gap-8'>
          {/* Sidebar / Info Panel */}
          <div className='lg:col-span-1 space-y-6'>
            <div className='bg-slate-900/50 border border-slate-800 p-6 relative overflow-hidden group'>
              <div className='absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-cyan-500/10 to-transparent pointer-events-none' />
              {album.description && (
                <div className='mb-6'>
                  <div className='text-xs text-cyan-500/50 uppercase tracking-widest mb-2'>
                    DESCRIPTION
                  </div>
                  <p className='text-slate-400 text-sm leading-relaxed'>
                    {album.description}
                  </p>
                </div>
              )}

              <div className='space-y-3'>
                <div className='text-xs text-cyan-500/50 uppercase tracking-widest mb-2'>
                  ACTIONS
                </div>
                <button
                  onClick={() => setShowUploadForm(!showUploadForm)}
                  className='w-full flex items-center gap-3 px-4 py-3 border border-cyan-500/30 hover:border-cyan-500 hover:bg-cyan-500/10 text-cyan-400 transition-all text-xs font-bold tracking-wider uppercase text-left group-hover/btn'
                >
                  <Upload className='w-4 h-4' />
                  {showUploadForm ? t("cancel") : t("uploadPhoto")}
                </button>
                <button
                  onClick={() => setShowStoryForm(!showStoryForm)}
                  className='w-full flex items-center gap-3 px-4 py-3 border border-purple-500/30 hover:border-purple-500 hover:bg-purple-500/10 text-purple-400 transition-all text-xs font-bold tracking-wider uppercase text-left'
                >
                  <FileText className='w-4 h-4' />
                  {showStoryForm ? t("cancel") : t("addStory")}
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  className='w-full flex items-center gap-3 px-4 py-3 border border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/10 text-emerald-400 transition-all text-xs font-bold tracking-wider uppercase text-left'
                >
                  <Share2 className='w-4 h-4' />
                  {t("shareAlbum")}
                </button>
                <div className='pt-4 border-t border-slate-800/50 mt-4'>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className='w-full flex items-center gap-3 px-4 py-3 border border-red-900/30 hover:border-red-500 hover:bg-red-500/10 text-red-700 hover:text-red-500 transition-all text-xs font-bold tracking-wider uppercase text-left'
                  >
                    <Trash2 className='w-4 h-4' />
                    {gameT("delete")}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className='lg:col-span-3'>
            {/* Upload Form */}
            <AnimatePresence>
              {showUploadForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className='bg-slate-900/80 border border-cyan-500/50 p-6 mb-8 relative overflow-hidden'
                >
                  <h2 className='text-lg font-bold mb-6 text-cyan-100 flex items-center gap-2'>
                    <Upload className='w-4 h-4 text-cyan-500' />
                    {t("upload.title")}
                  </h2>
                  <form
                    onSubmit={handlePhotoUpload}
                    className='space-y-4'
                  >
                    <div>
                      <label className='block text-xs font-bold text-cyan-500/70 mb-2 uppercase tracking-wider'>
                        {t("upload.fileLabel")}
                      </label>
                      <input
                        type='file'
                        name='file'
                        accept='image/*'
                        required
                        className='w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/10 file:text-cyan-400 hover:file:bg-cyan-500/20'
                      />
                    </div>
                    <div>
                      <label className='block text-xs font-bold text-cyan-500/70 mb-2 uppercase tracking-wider'>
                        {t("upload.captionLabel")}
                      </label>
                      <textarea
                        name='caption'
                        className='w-full px-4 py-3 bg-slate-800 border border-slate-700 focus:border-cyan-500 text-cyan-100 placeholder:text-slate-600 outline-none transition-all font-mono text-sm'
                        placeholder={t("upload.captionPlaceholder")}
                        rows={3}
                      />
                    </div>
                    <div className='flex justify-end'>
                      <button
                        type='submit'
                        className='bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 font-bold py-2 px-6 text-sm uppercase tracking-widest hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all'
                      >
                        [ {t("upload.submit")} ]
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Story Form */}
            <AnimatePresence>
              {showStoryForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className='bg-slate-900/80 border border-purple-500/50 p-6 mb-8 relative overflow-hidden'
                >
                  <h2 className='text-lg font-bold mb-6 text-purple-100 flex items-center gap-2'>
                    <FileText className='w-4 h-4 text-purple-500' />
                    {t("story.title")}
                  </h2>
                  <form
                    onSubmit={handleCreateStory}
                    className='space-y-4'
                  >
                    <div>
                      <label className='block text-xs font-bold text-purple-500/70 mb-2 uppercase tracking-wider'>
                        {t("story.titleLabel")}
                      </label>
                      <input
                        type='text'
                        name='title'
                        required
                        className='w-full px-4 py-3 bg-slate-800 border border-slate-700 focus:border-purple-500 text-purple-100 placeholder:text-slate-600 outline-none transition-all font-mono text-sm'
                        placeholder={t("story.titlePlaceholder")}
                      />
                    </div>
                    <div>
                      <label className='block text-xs font-bold text-purple-500/70 mb-2 uppercase tracking-wider'>
                        {t("story.contentLabel")}
                      </label>
                      <textarea
                        name='content'
                        required
                        className='w-full px-4 py-3 bg-slate-800 border border-slate-700 focus:border-purple-500 text-purple-100 placeholder:text-slate-600 outline-none transition-all font-mono text-sm'
                        placeholder={t("story.contentPlaceholder")}
                        rows={6}
                      />
                    </div>
                    <div className='flex justify-end'>
                      <button
                        type='submit'
                        className='bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/50 font-bold py-2 px-6 text-sm uppercase tracking-widest hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-all'
                      >
                        [ {t("story.submit")} ]
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tabs */}
            <div className='flex gap-1 mb-8 border-b border-slate-800'>
              <button
                onClick={() => setActiveTab("photos")}
                className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-all relative overflow-hidden ${
                  activeTab === "photos"
                    ? "text-cyan-400 bg-slate-800/50 border-t border-x border-slate-700"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                }`}
              >
                {t("tabs.photos", { count: photos.length })}
                {activeTab === "photos" && (
                  <div className='absolute top-0 left-0 w-full h-0.5 bg-cyan-500' />
                )}
              </button>
              <button
                onClick={() => setActiveTab("stories")}
                className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-all relative overflow-hidden ${
                  activeTab === "stories"
                    ? "text-purple-400 bg-slate-800/50 border-t border-x border-slate-700"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                }`}
              >
                {t("tabs.stories", { count: stories.length })}
                {activeTab === "stories" && (
                  <div className='absolute top-0 left-0 w-full h-0.5 bg-purple-500' />
                )}
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "photos" && (
              <div>
                {photos.length === 0 ? (
                  <div className='flex flex-col items-center justify-center py-20 border border-dashed border-slate-700 rounded-lg opacity-50'>
                    <ImageIcon className='w-12 h-12 mb-4 text-slate-600' />
                    <p className='text-slate-500 font-mono'>
                      {t("empty.photos")}
                    </p>
                  </div>
                ) : (
                  <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                    {photos.map((photo) => (
                      <motion.div
                        key={photo.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => setSelectedPhoto(photo)}
                        className='group relative bg-black border border-slate-800 hover:border-cyan-500/50 transition-all aspect-square overflow-hidden cursor-pointer'
                      >
                        <img
                          src={photo.url}
                          alt={photo.caption || t("upload.photo")}
                          className='w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500'
                        />
                        {/* Overlay */}
                        <div className='absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4'>
                          {photo.caption && (
                            <p className='text-cyan-100 text-xs font-mono mb-2 line-clamp-2'>
                              {photo.caption}
                            </p>
                          )}
                          <div className='flex justify-end pt-2 border-t border-slate-700/50'>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePhoto(photo.id);
                              }}
                              className='text-red-500 hover:text-red-400 p-1 hover:bg-red-900/20 rounded transition'
                              title={t("delete.button")}
                            >
                              <Trash2 className='w-4 h-4' />
                            </button>
                          </div>
                        </div>
                        {/* Border accents */}
                        <div className='absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity' />
                        <div className='absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity' />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "stories" && (
              <div className='space-y-6'>
                {stories.length === 0 ? (
                  <div className='flex flex-col items-center justify-center py-20 border border-dashed border-slate-700 rounded-lg opacity-50'>
                    <FileText className='w-12 h-12 mb-4 text-slate-600' />
                    <p className='text-slate-500 font-mono'>
                      {t("empty.stories")}
                    </p>
                  </div>
                ) : (
                  stories.map((story) => (
                    <motion.div
                      key={story.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className='bg-slate-900/80 border-l-2 border-purple-500 p-6 relative hover:bg-slate-800/50 transition-colors'
                    >
                      <div className='flex justify-between items-start mb-4'>
                        <h3 className='text-xl font-bold text-purple-200 tracking-wide'>
                          {story.title}
                        </h3>
                        <button
                          onClick={() => handleDeleteStory(story.id)}
                          className='text-slate-500 hover:text-red-500 transition-colors p-1'
                        >
                          <Trash2 className='w-4 h-4' />
                        </button>
                      </div>
                      <p className='text-slate-300 whitespace-pre-wrap leading-relaxed font-sans text-sm'>
                        {story.content}
                      </p>
                      <div className='mt-4 pt-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-600'>
                        <span className='font-mono uppercase tracking-wider'>
                          STORY_LOG_ENTRY
                        </span>
                        {story.createdAt && (
                          <span>
                            {new Date(story.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4'>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className='w-full max-w-md bg-slate-900 border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.1)] p-8 relative overflow-hidden'
            >
              <div className='absolute top-0 w-full left-0 h-1 bg-gradient-to-r from-emerald-500 to-transparent opacity-50' />

              <h2 className='text-xl font-bold mb-6 text-emerald-400 flex items-center gap-2'>
                <Share2 className='w-5 h-5' />
                {t("share.title")}
              </h2>

              {shareUrl ? (
                <div className='space-y-6'>
                  <div className='space-y-2'>
                    <p className='text-slate-400 text-xs uppercase tracking-wider'>
                      {t("share.instruction")}
                    </p>
                    <div className='bg-black/50 border border-slate-700 p-4 rounded font-mono text-xs text-emerald-300 break-all'>
                      {shareUrl}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className='w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 font-bold py-3 px-4 uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-sm'
                  >
                    {copied ? (
                      <Check className='w-4 h-4' />
                    ) : (
                      <Copy className='w-4 h-4' />
                    )}
                    {copied ? t("share.copied") : t("share.copyLink")}
                  </button>
                </div>
              ) : (
                <div className='space-y-6'>
                  <p className='text-slate-400 text-sm'>
                    Generate a public link to allow others to view this archive.
                  </p>
                  <button
                    onClick={handleCreateShare}
                    className='w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 font-bold py-3 px-4 uppercase tracking-widest transition-all text-sm'
                  >
                    [ {t("share.generateLink")} ]
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  setShowShareModal(false);
                  setShareUrl("");
                  setCopied(false);
                }}
                className='absolute top-4 right-4 text-slate-500 hover:text-slate-300 p-1'
              >
                <X className='w-5 h-5' />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Viewer Modal */}
      <AnimatePresence>
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
                    ? gameT("incomingTransmission")
                    : selectedPhoto.caption}
                </h3>
                <div className='flex justify-between items-end'>
                  <div className='text-sm text-slate-400 font-mono space-y-1'>
                    <div>ID: {selectedPhoto.id.substring(0, 8)}</div>
                  </div>
                  <div className='flex gap-2'>
                    <button
                      onClick={() => handleDeletePhoto(selectedPhoto.id)}
                      className='px-4 py-2 border border-red-900/50 hover:border-red-500 text-red-700 hover:text-red-500 transition-colors text-sm font-mono flex items-center gap-2'
                    >
                      <Trash2 className='w-4 h-4' />[ {t("delete.button")} ]
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Delete Album Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div
            className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm'
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className='bg-slate-900 border border-red-500/50 p-6 rounded-lg max-w-sm w-full shadow-[0_0_30px_rgba(239,68,68,0.2)]'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='flex items-center gap-3 text-red-500 mb-4 border-b border-red-900/30 pb-2'>
                <Trash2 className='w-6 h-6 animate-pulse' />
                <h3 className='text-lg font-bold tracking-wider font-mono'>
                  {gameT("warning")}: {gameT("deleteAlbum")}
                </h3>
              </div>
              <p className='text-slate-300 font-mono text-sm leading-relaxed mb-6'>
                {gameT("confirmDelete")}
              </p>
              <div className='flex gap-3 justify-end'>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className='px-4 py-2 bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-all text-xs font-mono tracking-wide'
                  disabled={isDeleting}
                >
                  [ {gameT("abort")} ]
                </button>
                <button
                  onClick={handleDeleteAlbum}
                  className='px-4 py-2 bg-red-900/20 border border-red-500 text-red-400 hover:bg-red-900/40 hover:text-red-200 hover:shadow-[0_0_10px_rgba(239,68,68,0.4)] transition-all text-xs font-mono tracking-wide flex items-center gap-2'
                  disabled={isDeleting}
                >
                  {isDeleting && <span className='animate-spin'>/</span>}[
                  {gameT("confirmErase")} ]
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Item Delete Modal */}
      <AnimatePresence>
        {showItemDeleteModal && (
          <div
            className='fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm'
            onClick={() => setShowItemDeleteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className='bg-slate-900 border border-red-500/50 p-6 rounded-lg max-w-sm w-full shadow-[0_0_30px_rgba(239,68,68,0.2)]'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='flex items-center gap-3 text-red-500 mb-4 border-b border-red-900/30 pb-2'>
                <Trash2 className='w-6 h-6 animate-pulse' />
                <h3 className='text-lg font-bold tracking-wider font-mono'>
                  {gameT("warning")}:{" "}
                  {itemToDelete?.type === "photo"
                    ? gameT("deletePhoto")
                    : gameT("deleteStory")}
                </h3>
              </div>
              <p className='text-slate-300 font-mono text-sm leading-relaxed mb-6'>
                {itemToDelete?.type === "photo"
                  ? t("delete.confirmPhoto")
                  : t("delete.confirmStory")}
              </p>
              <div className='flex gap-3 justify-end'>
                <button
                  onClick={() => setShowItemDeleteModal(false)}
                  className='px-4 py-2 bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-all text-xs font-mono tracking-wide'
                  disabled={isDeleting}
                >
                  [ {gameT("abort")} ]
                </button>
                <button
                  onClick={handleConfirmItemDelete}
                  className='px-4 py-2 bg-red-900/20 border border-red-500 text-red-400 hover:bg-red-900/40 hover:text-red-200 hover:shadow-[0_0_10px_rgba(239,68,68,0.4)] transition-all text-xs font-mono tracking-wide flex items-center gap-2'
                  disabled={isDeleting}
                >
                  {isDeleting && <span className='animate-spin'>/</span>}[
                  {gameT("confirmErase")} ]
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
