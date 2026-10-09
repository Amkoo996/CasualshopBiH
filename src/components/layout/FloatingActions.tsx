import React, { useState } from 'react';
import { Instagram, MessageCircle, X } from 'lucide-react';

export const FloatingActions: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end space-y-3">
      {isOpen && (
        <div className="flex flex-col space-y-2.5 animate-fadeIn">
          <a
            href="https://www.instagram.com/casualshop.bih"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white px-4 py-2.5 rounded-full shadow-xl hover:opacity-95 transition-all text-xs font-bold tracking-wide"
          >
            <Instagram className="w-4 h-4" />
            <span>Instagram: @casualshop.bih</span>
          </a>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-13 h-13 rounded-full bg-black text-white shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all border-2 border-neutral-800 cursor-pointer"
        aria-label="Pomoć i podrška"
        title="Instagram podrška"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <div className="relative">
            <MessageCircle className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#F7E97F] rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#F7E97F] rounded-full" />
          </div>
        )}
      </button>
    </div>
  );
};
