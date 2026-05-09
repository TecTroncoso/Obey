'use client';

import { Image as ImageIcon } from 'lucide-react';
import { useRef } from 'react';

export function ImageUploadButton({ onImageSelected, disabled }: { onImageSelected: (base64: string) => void, disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten imágenes.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }

        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        if (dataUrl.length > 500000) { alert('La imagen es muy grande, intenta con otra.'); return; }
        onImageSelected(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <>
      <input type="file" accept="image/*" ref={inputRef} onChange={handleFileChange} className="hidden" />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled} className="text-rose-500 cursor-pointer hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center shrink-0">
        <ImageIcon className="w-5 h-5 flex-shrink-0" />
      </button>
    </>
  );
}
