import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Trash2, Image as ImageIcon } from 'lucide-react';

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
}

export default function ImageGalleryModal({ isOpen, onClose, isAdmin }: ImageGalleryModalProps) {
  const [images, setImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchImages();
    }
  }, [isOpen]);

  const fetchImages = async () => {
    const res = await fetch('/api/gallery');
    const data = await res.json();
    setImages(data);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      await fetch('/api/gallery/upload', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-token': 'mock-jwt-token-for-admin-spacer'
        },
        body: JSON.stringify({ image: reader.result, filename: file.name })
      });
      fetchImages();
      setUploading(false);
    };
  };

  const handleDelete = async (filename: string) => {
    await fetch(`/api/gallery/${filename}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': 'mock-jwt-token-for-admin-spacer' }
    });
    fetchImages();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#1e1b4b] w-full max-w-4xl max-h-[90vh] rounded-2xl border border-[#312e81] shadow-2xl flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-[#312e81]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><ImageIcon /> Gallery</h2>
          <button onClick={onClose} className="p-1 hover:bg-[#312e81] rounded-full text-indigo-200"><X /></button>
        </div>
        
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 overflow-y-auto">
          {images.map(img => (
            <div key={img} className="relative group cursor-pointer aspect-square rounded-lg overflow-hidden border border-[#312e81]">
              <img src={`/api/gallery/${img}`} className="w-full h-full object-cover" onClick={() => setSelectedImage(img)} />
              {isAdmin && (
                <button onClick={() => handleDelete(img)} className="absolute top-2 right-2 p-1 bg-red-600 rounded text-white opacity-0 group-hover:opacity-100 transition"><Trash2 size={16} /></button>
              )}
            </div>
          ))}
          {isAdmin && (
            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center border-2 border-dashed border-[#312e81] rounded-lg aspect-square text-indigo-300 hover:bg-[#312e81] transition">
              <Upload />
              <span className="text-xs mt-2">{uploading ? '...' : 'Upload'}</span>
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} accept="image/*" />
            </button>
          )}
        </div>
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90" onClick={() => setSelectedImage(null)}>
          <img src={`/api/gallery/${selectedImage}`} className="max-w-full max-h-full rounded shadow-xl" />
        </div>
      )}
    </div>
  );
}
