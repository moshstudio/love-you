"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { albumsApi, photosApi } from "@/lib/api";
import { ChristmasTree } from "@/components/ChristmasTree";
import Link from "next/link";

interface Album {
  id: string;
  title: string;
  description?: string;
}

interface Photo {
  id: string;
  url: string;
  caption?: string;
}

export default function AlbumGalleryPage() {
  const params = useParams();
  const albumId = params.id as string;
  const router = useRouter();
  const { token, loading: authLoading } = useAuth();

  const [album, setAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "christmas">("grid");

  useEffect(() => {
    if (!authLoading && !token) {
      router.push("/login");
      return;
    }

    if (token) {
      loadAlbumData();
    }
  }, [token, authLoading, router]);

  const loadAlbumData = async () => {
    try {
      setLoading(true);
      const [albumData, photosData] = await Promise.all([
        albumsApi.get(albumId),
        photosApi.list(albumId),
      ]);
      setAlbum(albumData as any);
      setPhotos(photosData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load album");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-xl text-gray-600'>Loading...</div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-xl text-gray-600'>Album not found</div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-pink-50 to-purple-50'>
      {/* Header */}
      <header className='bg-white shadow'>
        <div className='max-w-7xl mx-auto px-4 py-6'>
          <Link
            href={`/albums/${albumId}`}
            className='text-pink-500 hover:text-pink-600 mb-4 inline-block'
          >
            ← Back to Album
          </Link>
          <h1 className='text-3xl font-bold text-gray-800'>{album.title}</h1>
          {album.description && (
            <p className='text-gray-600 mt-2'>{album.description}</p>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className='max-w-7xl mx-auto px-4 py-12'>
        {error && (
          <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6'>
            {error}
          </div>
        )}

        {/* View Mode Toggle */}
        <div className='flex gap-4 mb-8 justify-center'>
          <button
            onClick={() => setViewMode("grid")}
            className={`px-6 py-2 rounded-lg font-bold transition ${
              viewMode === "grid"
                ? "bg-pink-500 text-white"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            Grid View
          </button>
          <button
            onClick={() => setViewMode("christmas")}
            className={`px-6 py-2 rounded-lg font-bold transition ${
              viewMode === "christmas"
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            🎄 Christmas Tree
          </button>
        </div>

        {/* Photos Display */}
        {photos.length === 0 ? (
          <div className='text-center py-12 bg-white rounded-lg'>
            <p className='text-gray-600 text-lg'>No photos in this album</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {photos.map((photo) => (
              <div
                key={photo.id}
                className='bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition'
              >
                <div className='aspect-square bg-gray-200 overflow-hidden'>
                  <img
                    src={photo.url}
                    alt={photo.caption || "Photo"}
                    className='w-full h-full object-cover hover:scale-110 transition-transform'
                  />
                </div>
                {photo.caption && (
                  <div className='p-4'>
                    <p className='text-gray-700'>{photo.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <ChristmasTree photos={photos} />
        )}
      </main>
    </div>
  );
}
