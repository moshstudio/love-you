"use client";

import { motion } from "framer-motion";
import { Photo } from "./types";

interface GalleryGridProps {
  photos: Photo[];
  onPhotoClick: (index: number) => void;
}

export const GalleryGrid = ({ photos, onPhotoClick }: GalleryGridProps) => {
  if (photos.length === 0) {
    return (
      <div className='text-center py-20'>
        <p className='text-rose-500/50 font-bold uppercase tracking-widest'>
          No photos yet
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className='pt-20 sm:pt-32 px-3 sm:px-4 pb-8 sm:pb-12 max-w-7xl mx-auto'
    >
      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6'>
        {photos.map((photo, index) => (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className='group relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer border border-white/10 bg-white/5'
            onClick={() => onPhotoClick(index)}
          >
            <img
              src={photo.url}
              alt={photo.caption || "Photo"}
              className='w-full h-full object-cover group-hover:scale-110 transition-transform duration-700'
              loading='lazy'
            />
            <div className='absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 sm:p-4'>
              <p className='text-[10px] sm:text-xs font-bold text-white truncate w-full'>
                {photo.caption}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
