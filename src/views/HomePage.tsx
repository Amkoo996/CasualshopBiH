"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Truck, ShieldCheck, RotateCcw, Sparkles } from 'lucide-react';
import { getProducts } from '../lib/db';
import { Product } from '../types';

export const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newDropProducts, setNewDropProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHomepageData() {
      try {
        const allProds = await getProducts();
        const activeProds = allProds.filter(p => !p.isHidden);
        
        setFeaturedProducts(activeProds.filter(p => p.featured).slice(0, 4));
        
        // ISPRAVLJENO: Sortiranje novih artikala po datumu dodavanja (najnoviji prvi)
        setNewDropProducts(
          activeProds
            .filter(p => p.isNew)
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            .slice(0, 4)
        );
      } catch (err) {
        console.error("Greška pri učitavanju proizvoda:", err);
      } finally {
        setLoading(false);
      }
    }
    loadHomepageData();
  }, []);

  return (
    <div className="font-['Inter'] bg-[#FAF9F5] overflow-x-hidden">
      
      {/* 1. HERO SEKCIJA */}
      <section 
        className="relative h-[70vh] sm:h-[85vh] bg-[#0A0A0A] flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('/images/hero-bg.webp')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent"></div>
        
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-start justify-center">
          
          <h1 className="text-white font-['Poppins'] text-5xl sm:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.9] mb-6 max-w-2xl">
            Ulična<br/>pravila.<br/><span className="text-[#F7E97F]">Tvoj stil.</span>
          </h1>
          <p className="text-neutral-300 text-sm sm:text-base max-w-md mb-8 font-medium">
            Premium streetwear komadi dizajnirani za svaki dan. 100% premium pamuk. Beskompromisan kvalitet.
          </p>
          <Link 
            href="/shop" 
            className="group flex items-center gap-3 bg-[#F7E97F] text-[#0A0A0A] px-8 py-4 font-['Poppins'] font-black uppercase tracking-widest text-sm sm:text-base transition-all hover:bg-white hover:scale-105 active:scale-95"
          >
            Otkrij kolekciju
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* 2. TRAKA POVJERENJA */}
      <section className="bg-[#0A0A0A] border-b-4 border-[#F7E97F] py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 divide-y sm:divide-y-0 sm:divide-x divide-neutral-800 text-center">
            <div className="flex items-center justify-center gap-3 pt-4 sm:pt-0">
              <Truck className="w-6 h-6 text-[#F7E97F]" />
              <span className="text-white font-['Poppins'] font-bold text-xs uppercase tracking-wider">Dostava 48-72h</span>
            </div>
            <div className="flex items-center justify-center gap-3 pt-4 sm:pt-0">
              <ShieldCheck className="w-6 h-6 text-[#F7E97F]" />
              <span className="text-white font-['Poppins'] font-bold text-xs uppercase tracking-wider">Plaćanje pouzećem</span>
            </div>
            <div className="flex items-center justify-center gap-3 pt-4 sm:pt-0">
              <RotateCcw className="w-6 h-6 text-[#F7E97F]" />
              <span className="text-white font-['Poppins'] font-bold text-xs uppercase tracking-wider">Zamjena unutar 3 dana</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. VIZUELNE KATEGORIJE (GRID) */}
      <section className="py-12 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-auto md:h-[500px]">
          <Link href="/shop?category=Duksevi%20i%20hoodice" className="relative group overflow-hidden bg-neutral-200 h-[300px] md:h-full">
            <img src="/images/category-hoodie.webp" alt="Duksevi" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors"></div>
            <div className="absolute bottom-6 left-6">
              <h2 className="text-white font-['Poppins'] text-3xl font-black uppercase tracking-widest mb-2 drop-shadow-lg">Duksevi</h2>
              <span className="text-white text-xs font-bold uppercase tracking-wider border-b-2 border-[#F7E97F] pb-1">Istraži modele</span>
            </div>
          </Link>
          
          <div className="grid grid-rows-2 gap-4 h-[500px] md:h-full">
            <Link href="/shop?category=Majice" className="relative group overflow-hidden bg-neutral-200">
              <img src="/images/category-tshirt.webp" alt="Majice" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors"></div>
              <div className="absolute bottom-6 left-6">
                <h2 className="text-white font-['Poppins'] text-2xl font-black uppercase tracking-widest mb-2 drop-shadow-lg">Majice</h2>
                <span className="text-white text-xs font-bold uppercase tracking-wider border-b-2 border-[#F7E97F] pb-1">Vidi ponudu</span>
              </div>
            </Link>

            <Link href="/shop?category=Dodaci%20(Accessories)" className="relative group overflow-hidden bg-[#0A0A0A] border-2 border-neutral-800">
              <img 
                src="/images/sarajevo_geo_tee.jpg" 
                alt="Dodaci" 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-60 mix-blend-overlay"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent group-hover:from-black/70 transition-colors"></div>
              
              <div className="absolute top-4 right-4 bg-[#F7E97F] text-[#0A0A0A] text-[9px] font-['Poppins'] font-black uppercase px-2.5 py-1 tracking-wider flex items-center gap-1 z-10">
                <Sparkles className="w-3 h-3" /> USKORO
              </div>
              <div className="absolute bottom-6 left-6 z-10">
                <h2 className="text-white font-['Poppins'] text-2xl font-black uppercase tracking-widest mb-1 drop-shadow-lg">Dodaci</h2>
                <p className="text-[#F7E97F] text-[10px] font-bold uppercase tracking-widest mb-2 drop-shadow-md">Privjesci • Stikeri • Kape</p>
                <span className="text-neutral-200 text-xs font-bold uppercase tracking-wider border-b-2 border-[#F7E97F] pb-0.5 group-hover:text-white transition-colors">Pregledaj ponudu</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 4. NAJTRAŽENIJI KOMADI */}
      {!loading && featuredProducts.length > 0 && (
        <section className="py-12 bg-white border-y-2 border-neutral-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-end mb-8">
              <div>
                <span className="text-[#0A0A0A] font-['Poppins'] font-black uppercase tracking-widest text-[10px] bg-[#F7E97F] px-2 py-0.5 mb-2 inline-block">Najbolje od nas</span>
                <h2 className="text-3xl font-black uppercase font-['Poppins'] text-black tracking-tight">Najtraženije</h2>
              </div>
              <Link href="/shop" className="text-xs font-bold uppercase text-neutral-500 hover:text-black transition-colors hidden sm:block border-b border-black pb-0.5">
                Vidi sve →
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featuredProducts.map((product) => (
                <Link key={product.id} href={`/proizvod?id=${product.id}`} className="group relative block bg-[#FAF9F5] border-2 border-transparent hover:border-black transition-colors shadow-sm">
                  <div className="aspect-[4/5] overflow-hidden bg-neutral-100">
                    <img src={product.images?.[0] || '/hero-streetwear.webp'} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-4 bg-white border-t border-neutral-100">
                    <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">{product.category}</span>
                    <h3 className="font-['Poppins'] font-bold text-xs sm:text-sm text-black truncate mt-1">{product.name}</h3>
                    <p className="font-['Poppins'] font-black text-sm text-black mt-2">{product.price.toFixed(2)} KM</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. NOVI DROP */}
      {!loading && newDropProducts.length > 0 && (
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center mb-10 text-center">
            <span className="bg-[#0A0A0A] text-white px-3 py-1 font-['Poppins'] text-[10px] font-black uppercase tracking-[0.2em] mb-3">Fresh out the oven</span>
            <h2 className="text-4xl font-black uppercase font-['Poppins'] text-black tracking-tight">Novi Drop</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {newDropProducts.map((product) => (
              <Link key={product.id} href={`/proizvod?id=${product.id}`} className="group relative block border-2 border-neutral-200 hover:border-black transition-colors shadow-sm">
                <span className="absolute top-2 left-2 z-10 bg-[#0A0A0A] text-[#F7E97F] text-[9px] font-black uppercase px-2 py-1 tracking-widest shadow-md">
                  NOVO
                </span>
                <div className="aspect-[4/5] overflow-hidden bg-white">
                  <img src={product.images?.[0] || '/hero-streetwear.webp'} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-4 bg-white border-t border-neutral-100 text-center">
                  <h3 className="font-['Poppins'] font-bold text-xs sm:text-sm text-black truncate">{product.name}</h3>
                  <p className="font-['Poppins'] font-black text-sm text-[#0A0A0A] mt-1">{product.price.toFixed(2)} KM</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

    </div>
  );
};