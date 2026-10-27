"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Truck, ShieldCheck, RotateCcw, Mail, CheckCircle2 } from 'lucide-react';
import { getProducts } from '../lib/db';
import { Product } from '../types';

export const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newDropProducts, setNewDropProducts] = useState<Product[]>([]);
  const [accessoryImage, setAccessoryImage] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Newsletter stanja
  const [email, setEmail] = useState('');
  const [subLoading, setSubLoading] = useState(false);
  const [subSuccess, setSubSuccess] = useState(false);
  const [subError, setSubError] = useState('');

  useEffect(() => {
    async function loadHomepageData() {
      try {
        const allProds = await getProducts();
        const activeProds = allProds.filter(p => !p.isHidden);
        
        setFeaturedProducts(activeProds.filter(p => p.featured).slice(0, 4));
        
        setNewDropProducts(
          activeProds
            .filter(p => p.isNew)
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            .slice(0, 4)
        );

        const accessoryProd = activeProds.find(p => {
          if (p.category !== 'Dodaci (Accessories)') return false;
          const totalStock = Object.values(p.sizes || {}).reduce((sum, val) => sum + (val as number), 0);
          return totalStock > 0 && p.images && p.images.length > 0;
        }) || activeProds.find(p => p.category === 'Dodaci (Accessories)' && p.images && p.images.length > 0);

        if (accessoryProd && accessoryProd.images?.[0]) {
          setAccessoryImage(accessoryProd.images[0]);
        }
      } catch (err) {
        console.error("Greška pri učitavanju proizvoda:", err);
      } finally {
        setLoading(false);
      }
    }
    loadHomepageData();
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSubLoading(true);
    setSubError('');
    setSubSuccess(false);

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success !== false) {
        setSubSuccess(true);
        setEmail('');
      } else {
        setSubError(data.error || 'Došlo je do greške. Pokušajte ponovo.');
      }
    } catch (err) {
      setSubError('Greška pri povezivanju sa serverom. Pokušajte ponovo.');
    } finally {
      setSubLoading(false);
    }
  };

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

      {/* 2. TRAKA POVJERENJA - ISPRAVLJENO CENTRIRANJE */}
      <section className="bg-[#0A0A0A] border-b-4 border-[#F7E97F] py-2 sm:py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-center items-center divide-y sm:divide-y-0 sm:divide-x divide-neutral-800">
            
            <div className="flex items-center justify-start gap-4 py-4 sm:py-0 sm:px-10 w-[240px] sm:w-auto mx-auto">
              <Truck className="w-6 h-6 text-[#F7E97F] shrink-0" />
              <span className="text-white font-['Poppins'] font-bold text-xs uppercase tracking-wider mt-0.5">Dostava 48-72h</span>
            </div>
            
            <div className="flex items-center justify-start gap-4 py-4 sm:py-0 sm:px-10 w-[240px] sm:w-auto mx-auto">
              <ShieldCheck className="w-6 h-6 text-[#F7E97F] shrink-0" />
              <span className="text-white font-['Poppins'] font-bold text-xs uppercase tracking-wider mt-0.5">Plaćanje pouzećem</span>
            </div>
            
            <div className="flex items-center justify-start gap-4 py-4 sm:py-0 sm:px-10 w-[240px] sm:w-auto mx-auto">
              <RotateCcw className="w-6 h-6 text-[#F7E97F] shrink-0" />
              <span className="text-white font-['Poppins'] font-bold text-xs uppercase tracking-wider mt-0.5">Zamjena unutar 3 dana</span>
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

            <Link href="/shop?category=Dodaci%20(Accessories)" className="relative group overflow-hidden bg-neutral-200">
              <img 
                src={accessoryImage || "/images/category-tshirt.webp"} 
                alt="Dodaci" 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors"></div>
              
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

      {/* 6. NEWSLETTER SEKCIJA */}
      <section className="bg-[#0A0A0A] border-t-4 border-[#F7E97F] py-16 sm:py-20 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1A1A1A] text-[#F7E97F] border border-neutral-800 mb-4">
            <Mail className="w-6 h-6" />
          </div>

          <div>
            <span className="text-[#0A0A0A] font-['Poppins'] font-black uppercase tracking-widest text-[10px] bg-[#F7E97F] px-2.5 py-1 mb-3 inline-block">
              BUDI DIO EKIPE
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black uppercase font-['Poppins'] tracking-tight mb-3">
            Ne propusti novi drop
          </h2>

          <p className="text-neutral-400 text-xs sm:text-sm max-w-lg mx-auto mb-8 font-medium">
            Prijavi se na newsletter i saznaj prvi za nove streetwear kolekcije, ograničene zalihe i ekskluzivne pogodnosti.
          </p>

          <form onSubmit={handleSubscribe} className="max-w-md mx-auto flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              required
              placeholder="Unesite Vaš e-mail..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={subLoading || subSuccess}
              className="flex-1 bg-[#141414] border-2 border-neutral-700 focus:border-[#F7E97F] px-4 py-3 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={subLoading || subSuccess}
              className="bg-[#F7E97F] text-[#0A0A0A] hover:bg-white px-6 py-3 font-['Poppins'] font-black uppercase text-xs sm:text-sm tracking-wider transition-all disabled:opacity-50 cursor-pointer shrink-0"
            >
              {subLoading ? 'Prijava...' : 'Prijavi se'}
            </button>
          </form>

          {subSuccess && (
            <div className="mt-4 flex items-center justify-center gap-2 text-emerald-400 text-xs sm:text-sm font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Uspješno ste se pretplatili! Hvala na povjerenju.</span>
            </div>
          )}

          {subError && (
            <p className="mt-4 text-red-400 text-xs sm:text-sm font-bold">
              {subError}
            </p>
          )}
        </div>
      </section>

    </div>
  );
};
