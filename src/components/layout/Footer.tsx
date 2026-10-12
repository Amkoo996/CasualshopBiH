import React from 'react';
import { Truck, CreditCard, ShieldCheck, Mail, MapPin, Instagram } from 'lucide-react';

interface FooterProps {
  onNavigateToPage?: (page: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateToPage }) => {
  return (
    <footer className="bg-[#0A0A0A] text-white pt-12 pb-8 border-t-2 border-[#F7E97F] font-['Inter']">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* 1. KARTICE POVOLJNOSTI (UKLONJENA ZAMJENA I POVRAT) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-10 border-b border-neutral-800 text-center">
          <div className="flex flex-col items-center space-y-2 p-4 bg-neutral-950 border border-neutral-800">
            <Truck className="w-6 h-6 text-[#F7E97F]" />
            <h4 className="font-['Poppins'] text-xs font-black uppercase tracking-wider text-white">
              DOSTAVA 12 KM (48-72h)
            </h4>
            <p className="text-[11px] text-neutral-400">Moguće otvaranje paketa prije preuzimanja</p>
          </div>

          <div className="flex flex-col items-center space-y-2 p-4 bg-neutral-950 border border-neutral-800">
            <CreditCard className="w-6 h-6 text-[#F7E97F]" />
            <h4 className="font-['Poppins'] text-xs font-black uppercase tracking-wider text-white">
              PLAĆANJE POUZEĆEM
            </h4>
            <p className="text-[11px] text-neutral-400">Plaćaš kuriru tek pri preuzimanju paketa</p>
          </div>

          <div className="flex flex-col items-center space-y-2 p-4 bg-neutral-950 border border-neutral-800">
            <ShieldCheck className="w-6 h-6 text-[#F7E97F]" />
            <h4 className="font-['Poppins'] text-xs font-black uppercase tracking-wider text-white">
              CASUAL KVALITET
            </h4>
            <p className="text-[11px] text-neutral-400">Udobna odjeća od češljanog pamuka</p>
          </div>
        </div>

        {/* 2. GLAVNI MENI / GLAVNE KOLONE */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* O BRENDU */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#F7E97F] flex items-center justify-center font-['Poppins'] font-black text-black text-xs">
                CS
              </div>
              <span className="font-['Poppins'] text-base font-black uppercase tracking-wider text-white">
                CASUAL <span className="text-[#F7E97F]">shop</span>
              </span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Casual Shop BiH je brend za one koji vole udobnu i stilsku odjeću za svaki dan. Počeli smo na Instagramu, a sada smo tu i online.
            </p>
            <a
              href="https://www.instagram.com/casualshop.bih"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-['Poppins'] font-bold uppercase tracking-wider text-[#F7E97F] hover:underline"
            >
              <Instagram className="w-4 h-4" />
              <span>@casualshop.bih</span>
            </a>
          </div>

          {/* STRANICE */}
          <div className="space-y-3">
            <h4 className="font-['Poppins'] text-xs font-black uppercase tracking-widest text-[#F7E97F]">
              STRANICE
            </h4>
            <ul className="space-y-2 text-xs text-neutral-300">
              <li>
                <button onClick={() => onNavigateToPage?.('shop')} className="hover:text-white transition-colors cursor-pointer">
                  Kolekcija
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateToPage?.('about')} className="hover:text-white transition-colors cursor-pointer">
                  O nama
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateToPage?.('contact')} className="hover:text-white transition-colors cursor-pointer">
                  Kontakt
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateToPage?.('shipping')} className="hover:text-white transition-colors cursor-pointer">
                  Dostava i povrat (Praćenje)
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateToPage?.('terms')} className="hover:text-white transition-colors cursor-pointer">
                  Uslovi korištenja
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateToPage?.('privacy')} className="hover:text-white transition-colors cursor-pointer">
                  Politika privatnosti
                </button>
              </li>
            </ul>
          </div>

          {/* KONTAKT */}
          <div className="space-y-3">
            <h4 className="font-['Poppins'] text-xs font-black uppercase tracking-widest text-[#F7E97F]">
              KONTAKT
            </h4>
            <ul className="space-y-2.5 text-xs text-neutral-300">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#F7E97F] shrink-0" />
                <span>info@casualshop.ba</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#F7E97F] shrink-0 mt-0.5" />
                <span>Dostava u sve gradove u Bosni i Hercegovini (Lično preuzimanje u Sarajevu)</span>
              </li>
            </ul>
          </div>

          {/* DOSTAVA PARTNERI BANER */}
          <div className="space-y-3 bg-neutral-950 p-4 border border-neutral-800">
            <span className="font-['Poppins'] text-[10px] font-black uppercase tracking-widest text-[#F7E97F] block">
              POUZDANA I BRZA DOSTAVA
            </span>
            <p className="text-[11px] text-neutral-400">
              Sve pakete na vašu adresu šaljemo putem provjerenih kurirskih službi:
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="font-['Poppins'] font-black text-[11px] text-white tracking-tighter border border-neutral-700 px-2 py-1 bg-black">
                BH POŠTA <span className="text-red-500">EXPRESS</span>
              </span>
              <span className="font-['Poppins'] font-black text-[11px] text-red-500 tracking-wider border border-neutral-700 px-2 py-1 bg-black">
                X-EXPRESS
              </span>
            </div>
          </div>
        </div>

        {/* 3. SIGURNO PLAĆANJE BANER (KARTIČNO USKORO) */}
        <div className="bg-white text-black p-4 border-2 border-[#F7E97F] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-['Poppins'] text-xs font-black uppercase tracking-wider text-black">
              SIGURNO PLAĆANJE
            </span>
            <span className="text-[10px] font-bold bg-[#0A0A0A] text-[#F7E97F] px-2 py-0.5 font-['Poppins'] uppercase tracking-wider">
              KARTIČNO PLAĆANJE - USKORO
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-['Poppins'] font-bold opacity-75">
            <span className="border border-neutral-300 px-2 py-0.5 text-blue-900">MONRI</span>
            <span className="border border-neutral-300 px-2 py-0.5 text-black">WSpay</span>
            <span className="text-blue-800 italic font-black">VISA</span>
            <span className="text-amber-600 font-black">mastercard</span>
            <span className="text-red-600 italic font-black">UniCredit</span>
          </div>
        </div>

        {/* 4. COPYRIGHT NA SAMOM DNU */}
        <div className="pt-6 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-neutral-500">
          <p>© {new Date().getFullYear()} Casual Shop BiH. Sva prava zadržana.</p>
          <p className="font-medium text-neutral-400">
            Plaćanje pouzećem (gotovinom kuriru) ili lično u Sarajevu.
          </p>
        </div>

      </div>
    </footer>
  );
};
