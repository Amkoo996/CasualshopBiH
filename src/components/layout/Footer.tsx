"use client";

import React from 'react';
import Link from 'next/link';
import { Truck, ShieldCheck, Instagram, Mail, MapPin, Lock, Send } from 'lucide-react';
import { Logo } from '../common/Logo';
import { useCart } from '../../context/CartContext';

export const Footer: React.FC = () => {
  const { settings } = useCart();

  return (
    <footer className="bg-[#0A0A0A] text-white border-t-2 border-[#F7E97F] pt-14 pb-8 font-['Inter'] relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Benefiti */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-12 border-b border-neutral-800 text-center">
          <div className="flex flex-col items-center p-2">
            <Truck className="w-6 h-6 text-[#F7E97F] mb-2" />
            <span className="font-['Poppins'] font-black text-xs uppercase tracking-wider">DOSTAVA 12 KM (48-72h)</span>
            <span className="text-neutral-400 text-xs mt-1">Moguce otvaranje paketa prije preuzimanja</span>
          </div>

          <div className="flex flex-col items-center p-2">
            <ShieldCheck className="w-6 h-6 text-[#F7E97F] mb-2" />
            <span className="font-['Poppins'] font-black text-xs uppercase tracking-wider">PLAcANJE POUZEcEM</span>
            <span className="text-neutral-400 text-xs mt-1">PlacaS kuriru tek pri preuzimanju paketa</span>
          </div>

          <div className="flex flex-col items-center p-2">
            <div className="w-6 h-6 rounded-full border-2 border-[#F7E97F] flex items-center justify-center text-[#F7E97F] text-xs font-bold mb-2">✓</div>
            <span className="font-['Poppins'] font-black text-xs uppercase tracking-wider">CASUAL KVALITET</span>
            <span className="text-neutral-400 text-xs mt-1">Udobna odjeca za svaki dan</span>
          </div>
        </div>

        {/* Glavni footer sadrzaj */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Logo />
            <p className="text-xs text-neutral-400 leading-relaxed">
              Casual Shop BiH je brend za one koji vole udobnu i stilsku odjecu za svaki dan. Poceli smo na Instagramu, a sada smo tu i online.
            </p>
            <a
              href={settings?.instagramUrl || 'https://www.instagram.com/casualshop.bih'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 border border-neutral-700 hover:border-[#F7E97F] text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-300 hover:text-[#F7E97F] transition-colors"
            >
              <Instagram className="w-4 h-4 text-[#F7E97F]" />
              <span>@casualshop.bih</span>
            </a>
          </div>

          {/* Stranice */}
          <div>
            <h4 className="font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] text-[#F7E97F] mb-4">
              STRANICE
            </h4>
            <ul className="space-y-2.5 text-xs text-neutral-300">
              <li><Link href="/shop" className="hover:text-[#F7E97F] transition-colors">Shop</Link></li>
              <li><Link href="/o-nama" className="hover:text-[#F7E97F] transition-colors">O nama</Link></li>
              <li><Link href="/kontakt" className="hover:text-[#F7E97F] transition-colors">Kontakt</Link></li>
              <li><Link href="/dostava-i-povrat" className="hover:text-[#F7E97F] transition-colors">Dostava i povrat (Pracenje)</Link></li>
              <li><Link href="/uslovi-koristenja" className="hover:text-[#F7E97F] transition-colors">Uslovi koriStenja</Link></li>
              <li><Link href="/politika-privatnosti" className="hover:text-[#F7E97F] transition-colors">Politika privatnosti</Link></li>
            </ul>
          </div>

          {/* Kontakt */}
          <div>
            <h4 className="font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] text-[#F7E97F] mb-4">
              KONTAKT
            </h4>
            <ul className="space-y-3 text-xs text-neutral-300">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#F7E97F] shrink-0" />
                <span>{settings?.email || 'info@casualshop.ba'}</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#F7E97F] shrink-0 mt-0.5" />
                <span>Dostava u sve gradove u Bosni i Hercegovini (Licno u Sarajevu)</span>
              </li>
            </ul>
          </div>

          {/* Brza info / info box */}
          <div className="space-y-3">
            <h4 className="font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] text-[#F7E97F]">
              POUZDANA I BRZA DOSTAVA
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Sve pakete na vaSu adresu Saljemo putem ugovorene kurirske sluzbe brze poSte X Express.
            </p>
          </div>
        </div>

        {/* Donja traka + Katanac za Admin */}
        <div className="pt-8 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <p>© {new Date().getFullYear()} Casual Shop BiH. Sva prava zadrzana.</p>
          
          <div className="flex items-center gap-2">
            <span>Placanje pouzecem</span>
            {/* Katanac koji otvara Admin Dashboard */}
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