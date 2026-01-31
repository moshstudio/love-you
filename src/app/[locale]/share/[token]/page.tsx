"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { shareApi } from "@/lib/api";

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
      const data = await shareApi.getShared(token);
      setAlbum(data.album);
      setPhotos(data.photos);
      setStories(data.stories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load shared album");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Oops!</h1>
          <p className="text-gray-600 text-lg">
            {error || "This shared album is no longer available"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-800">{album.title}</h1>
          {album.description && (
            <p className="text-gray-600 mt-2">{album.description}</p>
          )}
          {album.location && (
            <p className="text-gray-500 mt-1">📍 {album.location}</p>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b">
          <button
            onClick={() => setActiveTab("photos")}
            className={`px-4 py-2 font-bold transition ${
              activeTab === "photos"
                ? "text-pink-500 border-b-2 border-pink-500"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Photos ({photos.length})
          </button>
          <button
            onClick={() => setActiveTab("stories")}
            className={`px-4 py-2 font-bold transition ${
              activeTab === "stories"
                ? "text-blue-500 border-b-2 border-blue-500"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Stories ({stories.length})
          </button>
        </div>

        {/* Photos Tab */}
        {activeTab === "photos" && (
          <div>
            {photos.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg">
                <p className="text-gray-600 text-lg">No photos in this album</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition cursor-pointer transform hover:scale-105"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <div className="aspect-square bg-gray-200 overflow-hidden">
                      <img
                        src={photo.url}
                        alt={photo.caption || "Photo"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {photo.caption && (
                      <div className="p-4">
                        <p className="text-gray-700 line-clamp-2">{photo.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stories Tab */}
        {activeTab === "stories" && (
          <div>
            {stories.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg">
                <p className="text-gray-600 text-lg">No stories in this album</p>
              </div>
            ) : (
              <div className="space-y-6">
                {stories.map((story) => (
                  <div key={story.id} className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                      {story.title}
                    </h3>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {story.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-video bg-gray-200 overflow-hidden">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.caption || "Photo"}
                className="w-full h-full object-contain"
              />
            </div>
            {selectedPhoto.caption && (
              <div className="p-6">
                <p className="text-gray-700">{selectedPhoto.caption}</p>
              </div>
            )}
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setSelectedPhoto(null)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
