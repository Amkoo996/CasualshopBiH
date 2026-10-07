import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { initAnalytics } from '../../lib/analytics';

export const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cs_cookie_consent');
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    } else if (consent === 'all') {
      initAnalytics(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('cs_cookie_consent', 'all');
    initAnalytics(true);
    setIsVisible(false);
  };

  const handleAcceptNecessary = () => {
    localStorage.setItem('cs_cookie_consent', 'necessary');
    initAnalytics(false);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-5 bg-[#0A0A0A] text-white border-t-2 border-[#F7E97F] shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-left">
          <div className="w-8 h-8 rounded-full bg-[#1A1A1A] text-[#F7E97F] flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed">
            Koristimo kolačiće za rad stranice, analitiku i oglase. Možeš prihvatiti sve ili samo neophodne.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
          <button
            onClick={handleAcceptNecessary}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-[#171717] border border-neutral-700 text-xs font-['Poppins'] font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-colors"
          >
            Samo neophodni
          </button>
          <button
            onClick={handleAcceptAll}
            className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#F7E97F] text-[#0A0A0A] text-xs font-['Poppins'] font-black uppercase tracking-wider hover:bg-[#ebd965] transition-colors"
          >
            Prihvati sve
          </button>
        </div>
      </div>
    </div>
  );
};
