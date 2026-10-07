import React, { useState, useEffect } from 'react';
import { initAnalytics } from '../../lib/analytics';

const KEY = 'casualshop_cookie_consent';

export const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (!saved) {
      setIsVisible(true);
    } else if (saved === 'accepted') {
      initAnalytics(true);
    }
  }, []);

  const choose = (value: 'accepted' | 'necessary') => {
    localStorage.setItem(KEY, value);
    if (value === 'accepted') initAnalytics(true);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A] text-white p-4 sm:p-5 border-t-2 border-[#F7E97F] shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-xs text-neutral-300 max-w-3xl">
        Koristimo kolačiće za rad stranice, analitiku i oglase. Možeš prihvatiti sve ili samo neophodne.
      </p>
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => choose('necessary')}
          className="px-5 py-2.5 border border-neutral-500 text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 cursor-pointer"
        >
          Samo neophodni
        </button>
        <button
          onClick={() => choose('accepted')}
          className="px-5 py-2.5 bg-[#F7E97F] text-[#0A0A0A] text-xs font-black uppercase tracking-wider hover:bg-yellow-300 border border-[#0A0A0A] cursor-pointer"
        >
          Prihvati sve
        </button>
      </div>
    </div>
  );
};
