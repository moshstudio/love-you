"use client";

import { useState } from "react";

interface Photo {
  id: string;
  url: string;
  caption?: string;
}

interface ChristmasTreeProps {
  photos: Photo[];
  onPhotoClick?: (photo: Photo) => void;
}

export function ChristmasTree({ photos, onPhotoClick }: ChristmasTreeProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  // Arrange photos in a tree shape
  // Tree structure: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15
  // Rows: 1, 2, 3, 4, 5, 5
  const rows = [1, 2, 3, 4, 5, 5];
  const photosByRow: Photo[][] = [];
  let photoIndex = 0;

  for (const rowSize of rows) {
    const row: Photo[] = [];
    for (let i = 0; i < rowSize && photoIndex < photos.length; i++) {
      row.push(photos[photoIndex]);
      photoIndex++;
    }
    if (row.length > 0) {
      photosByRow.push(row);
    }
  }

  const handlePhotoClick = (photo: Photo) => {
    setSelectedPhoto(photo);
    onPhotoClick?.(photo);
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .tree-photo {
          animation: float 3s ease-in-out infinite;
        }

        .tree-photo:nth-child(odd) {
          animation-delay: 0s;
        }

        .tree-photo:nth-child(even) {
          animation-delay: 1.5s;
        }

        .star {
          animation: twinkle 1.5s ease-in-out infinite;
        }
      `}</style>

      {/* Star on top */}
      <div className="mb-4 star">
        <div className="text-6xl">⭐</div>
      </div>

      {/* Tree rows */}
      <div className="space-y-4">
        {photosByRow.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="flex justify-center gap-3"
            style={{
              marginLeft: `${(rows.length - row.length) * 20}px`,
            }}
          >
            {row.map((photo, photoIdx) => (
              <div
                key={photo.id}
                className="tree-photo cursor-pointer transform hover:scale-110 transition-transform"
                onClick={() => handlePhotoClick(photo)}
              >
                <div className="relative group">
                  <img
                    src={photo.url}
                    alt={photo.caption || "Photo"}
                    className="w-20 h-20 md:w-24 md:h-24 rounded-lg object-cover shadow-lg border-2 border-green-600 hover:border-yellow-400"
                  />
                  {photo.caption && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                      {photo.caption}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Tree trunk */}
      <div className="mt-6 flex justify-center gap-2">
        <div className="w-8 h-12 bg-amber-900 rounded-sm shadow-lg"></div>
        <div className="w-8 h-12 bg-amber-900 rounded-sm shadow-lg"></div>
      </div>

      {/* Decorations */}
      <div className="mt-4 flex justify-center gap-8 text-3xl">
        <span>🎄</span>
        <span>🎅</span>
        <span>🎄</span>
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full"
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
