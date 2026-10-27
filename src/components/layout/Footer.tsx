"use client";

import React from 'react';
import Link from 'next/link';
import { Truck, ShieldCheck, Instagram, Mail, MapPin, Lock, CheckCircle2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export const Footer: React.FC = () => {
  const { settings } = useCart();

  return (
    <footer className="bg-[#0A0A0A] text-white border-t-2 border-[#F7E97F] pt-16 pb-8 font-['Inter'] relative z-10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-12 border-b border-neutral-800 text-center">
          <div className="flex flex-col items-center p-4 bg-neutral-900/50 border border-neutral-800/80 rounded-xs hover:border-[#F7E97F]/50 transition-colors">
            <Truck className="w-7 h-7 text-[#F7E97F] mb-2.5" />
            <span className="font-['Poppins'] font-black text-xs uppercase tracking-wider text-white">DOSTAVA 12 KM (48-72h)</span>
            <span className="text-neutral-400 text-xs mt-1">Moguće otvaranje paketa prije preuzimanja</span>
          </div>

          <div className="flex flex-col items-center p-4 bg-neutral-900/50 border border-neutral-800/80 rounded-xs hover:border-[#F7E97F]/50 transition-colors">
            <ShieldCheck className="w-7 h-7 text-[#F7E97F] mb-2.5" />
            <span className="font-['Poppins'] font-black text-xs uppercase tracking-wider text-white">PLAĆANJE POUZEĆEM</span>
            <span className="text-neutral-400 text-xs mt-1">Plaćaš kuriru tek pri preuzimanju paketa</span>
          </div>

          <div className="flex flex-col items-center p-4 bg-neutral-900/50 border border-neutral-800/80 rounded-xs hover:border-[#F7E97F]/50 transition-colors">
            <CheckCircle2 className="w-7 h-7 text-[#F7E97F] mb-2.5" />
            <span className="font-['Poppins'] font-black text-xs uppercase tracking-wider text-white">CASUAL KVALITET</span>
            <span className="text-neutral-400 text-xs mt-1">Udobna i kvalitetna odjeća za svaki dan</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          
          <div className="space-y-4">
            {/* ISPRAVLJEN LOGO - Isto kao u Navbaru */}
            <Link href="/" className="flex items-center gap-3.5 group">
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                <img 
                  src="/logo.png" 
                  alt="Casual Shop BiH" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.parentElement) {
                      e.currentTarget.parentElement.innerHTML = `<span class="font-['Poppins'] font-black text-xs text-[#F7E97F]">CS</span>`;
                    }
                  }}
                />
              </div>
              <div className="flex flex-col">
                <span className="font-['Poppins'] text-lg font-black tracking-widest text-white leading-none group-hover:text-[#F7E97F] transition-colors">
                  CASUAL <span className="text-[#F7E97F] text-xs">shop</span>
                </span>
                <span className="text-[9px] text-neutral-400 font-bold tracking-[0.2em] uppercase mt-1">
                  BiH • Ulična pravila
                </span>
              </div>
            </Link>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Casual Shop BiH je domaći streetwear brend za sve koji cijene udobnost, kvalitetan češljani pamuk i stilsku uličnu odjeću za svaki dan.
            </p>

            <a
              href="https://ig.me/m/casualshop.bih"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 border border-neutral-700 hover:border-[#F7E97F] text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-300 hover:text-[#F7E97F] hover:bg-neutral-900 transition-all rounded-xs"
            >
              <Instagram className="w-4 h-4 text-[#F7E97F]" />
              <span>@casualshop.bih</span>
            </a>
          </div>

          <div>
            <h4 className="font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] text-[#F7E97F] mb-4">
              STRANICE
            </h4>
            <ul className="space-y-2.5 text-xs text-neutral-300 font-medium">
              <li><Link href="/shop" className="hover:text-[#F7E97F] transition-colors">Kolekcija</Link></li>
              <li><Link href="/o-nama" className="hover:text-[#F7E97F] transition-colors">O nama</Link></li>
              <li><Link href="/kontakt" className="hover:text-[#F7E97F] transition-colors">Kontakt</Link></li>
              <li><Link href="/dostava-i-povrat" className="hover:text-[#F7E97F] transition-colors">Dostava i povrat (Praćenje)</Link></li>
              <li><Link href="/uslovi-koristenja" className="hover:text-[#F7E97F] transition-colors">Uslovi korištenja</Link></li>
              <li><Link href="/politika-privatnosti" className="hover:text-[#F7E97F] transition-colors">Politika privatnosti</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] text-[#F7E97F] mb-4">
              KONTAKT
            </h4>
            <ul className="space-y-3 text-xs text-neutral-300">
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#F7E97F] shrink-0" />
                <span>{settings?.email || 'info@casualshop.ba'}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#F7E97F] shrink-0 mt-0.5" />
                <span>Brza dostava širom BiH • Lično preuzimanje u Sarajevu</span>
              </li>
            </ul>
          </div>

          {/* ISPRAVLJENO POUZDANA DOSTAVA - h-fit osigurava da border ne bude predug */}
          <div className="space-y-3 bg-neutral-900/40 border border-neutral-800 p-4 rounded-xs h-fit">
            <h4 className="font-['Poppins'] text-xs font-black uppercase tracking-[0.15em] text-[#F7E97F]">
              POUZDANA DOSTAVA
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Sve pakete šaljemo kurirskom službom brze pošte. Dozvoljeno je otvaranje i pregled paketa prije plaćanja gotovinom.
            </p>
          </div>

        </div>

        <div className="pt-8 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <p>© {new Date().getFullYear()} Casual Shop BiH. Sva prava zadržana.</p>
          
          <div className="flex items-center gap-3">
            <span>Plaćanje pouzećem</span>
            <span className="text-neutral-700">•</span>
            
            <Link
              href="/admin"
              className="p-1 text-neutral-600 hover:text-[#F7E97F] transition-colors cursor-pointer"
              title="Admin Panel"
            >
              <Lock className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
};
