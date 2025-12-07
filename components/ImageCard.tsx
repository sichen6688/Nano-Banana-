import React from 'react';
import { GeneratedImage } from '../types';
import { DownloadIcon, TrashIcon } from './Icons';

interface ImageCardProps {
  image: GeneratedImage;
  onDelete: (id: string) => void;
}

const ImageCard: React.FC<ImageCardProps> = ({ image, onDelete }) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `gemini-imagine-${image.id.slice(0, 8)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="group relative break-inside-avoid mb-6 rounded-xl overflow-hidden bg-gray-800 border border-gray-700 shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-gray-600">
      <div className="relative overflow-hidden w-full">
        <img
          src={image.url}
          alt={image.prompt}
          className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          <div className="flex justify-between items-end">
             <p className="text-gray-200 text-xs line-clamp-2 mr-2 font-medium bg-black/50 p-1.5 rounded backdrop-blur-sm">
              {image.prompt}
             </p>
             <div className="flex gap-2">
               <button
                 onClick={handleDownload}
                 className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-colors"
                 title="Download"
               >
                 <DownloadIcon className="w-5 h-5" />
               </button>
               <button
                 onClick={() => onDelete(image.id)}
                 className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full text-red-200 backdrop-blur-md transition-colors"
                 title="Delete"
               >
                 <TrashIcon className="w-5 h-5" />
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCard;