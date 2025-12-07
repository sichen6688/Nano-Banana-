import React from 'react';
import { XMarkIcon } from './Icons';

interface ImageViewerProps {
  url: string | null;
  onClose: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ url, onClose }) => {
  if (!url) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative max-w-full max-h-full">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-gray-400 hover:text-white transition-colors"
        >
          <XMarkIcon className="w-8 h-8" />
        </button>
        <img
          src={url}
          alt="Full size"
          className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl"
        />
      </div>
    </div>
  );
};

export default ImageViewer;