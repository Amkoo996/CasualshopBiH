import React, { useState, useEffect } from 'react';

export const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Provjerava da li je korisnik već prihvatio kolačiće
    const consent = localStorage.getItem('casualshop_cookie_consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    // Trajno sprema izbor u preglednik (localStorage ne ističe zatvaranjem tab-a)
    localStorage.setItem('casualshop_cookie_consent', 'accepted');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A] text-white p-4 sm:p-5 border-t-2 border-[#F7E97F] shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-xs font-['Inter'] text-neutral-300 max-w-3xl">
        <p>
          Naša web stranica koristi kolačiće (cookies) za pružanje boljeg korisničkog iskustva, analitiku posjeta i funkcionalnost korpe. Nastavkom korištenja stranice pristajete na upotrebu kolačića.
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={handleAccept}
          className="px-5 py-2.5 bg-[#F7E97F] text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-wider hover:bg-yellow-300 transition-colors border border-[#0A0A0A] cursor-pointer"
        >
          Prihvatam
        </button>
      </div>
    </div>
  );
};
