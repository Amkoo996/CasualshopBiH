"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingBag, Search, Menu, X, Heart, Instagram, ChevronDown, MonitorPlay } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { CATEGORIES } from '../../types';

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { items, setIsCartOpen, settings } = useCart();
  
  const wishlistContext = useWishlist() as any;
  const wishlistItems = wishlistContext.wishlist || wishlistContext.items || wishlistContext.wishlistItems || [];
  
  const pathname = usePathname();
  const router = useRouter();

  const cartItemCount = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
  const wishlistItemCount = wishlistItems.length;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
  }, [pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  const navLinks = [
    { href: '/', label: 'Početna' },
    { href: '/shop', label: 'Kolekcija' },
    { href: '/o-nama', label: 'O nama' },
    { href: '/dostava-i-povrat', label: 'Dostava i Povrat' },
    { href: '/kontakt', label: 'Kontakt' },
  ];

  const visibleCategories = CATEGORIES.filter((cat) => {
    const isHidden = settings?.hiddenCategories?.includes(cat);
    return cat !== 'Rasprodano' && !isHidden;
  });

  return (
    <header className={`sticky top-0 z-40 bg-[#0A0A0A] text-white border-b border-neutral-800 transition-all ${isScrolled ? 'shadow-2xl' : ''} font-['Inter']`}>
      
      {/* Glavni Meni */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          
          {/* Sređeni Logo */}
          <Link href="/" className="flex items-center gap-3 group z-50">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-[#F7E97F] flex items-center justify-center p-1.5 shrink-0 bg-black group-hover:border-white transition-colors">
              <img 
                src="/logo-favicon.svg" 
                alt="Casual Shop BiH Logo" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback ako SVG ne postoji
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.parentElement) {
                    e.currentTarget.parentElement.innerHTML = `<span class="font-['Poppins'] font-black text-xs text-[#F7E97F] leading-none">CS</span>`;
                  }
                }}
              />
            </div>
            <div className="flex flex-col justify-center">
              <span className="font-['Poppins'] text-base sm:text-lg font-black tracking-widest text-white leading-none">
                CASUAL <span className="text-[#F7E97F] text-xs">shop</span>
              </span>
              <span className="text-[8px] sm:text-[9px] text-neutral-400 font-bold tracking-[0.2em] uppercase mt-1 hidden sm:block">
                BiH • Casual. Svaki dan.
              </span>
            </div>
          </Link>

          {/* Desktop Navigacija */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`font-['Poppins'] text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  pathname === link.href ? 'text-[#F7E97F] border-b-2 border-[#F7E97F] pb-1' : 'text-neutral-300 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Dropdown Kategorije */}
            <div className="relative group py-6">
              <Link
                href="/shop"
                className={`flex items-center gap-1 font-['Poppins'] text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  pathname === '/shop' ? 'text-[#F7E97F]' : 'text-neutral-300 group-hover:text-white'
                }`}
              >
                <span>Kategorije</span>
                <ChevronDown className="w-3.5 h-3.5 transition-transform group-hover:rotate-180" />
              </Link>

              <div className="absolute top-full left-0 w-48 bg-[#0A0A0A] border-2 border-[#F7E97F] shadow-2xl py-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none group-hover:pointer-events-auto translate-y-2 group-hover:translate-y-0">
                {visibleCategories.map((cat) => (
                  <Link
                    key={cat}
                    href={`/shop?category=${encodeURIComponent(cat)}`}
                    className="block px-4 py-2.5 text-[11px] font-bold text-neutral-300 hover:text-[#0A0A0A] hover:bg-[#F7E97F] transition-colors"
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            </div>
          </nav>

          {/* Ikone */}
          <div className="flex items-center gap-3 sm:gap-5 z-50">
            <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="text-neutral-300 hover:text-[#F7E97F] transition-colors cursor-pointer p-1">
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <a href={(settings as any)?.instagramUrl || 'https://www.instagram.com/casualshop.bih'} target="_blank" rel="noopener noreferrer" className="hidden sm:block text-neutral-300 hover:text-[#F7E97F] transition-colors p-1">
              <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />
            </a>

            <Link href="/wishlist" className="relative text-neutral-300 hover:text-[#F7E97F] transition-colors group hidden sm:block p-1">
              <Heart className="w-4 h-4 sm:w-5 sm:h-5 group-hover:fill-[#F7E97F]" />
              {wishlistItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {wishlistItemCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-1.5 text-white hover:text-[#F7E97F] transition-colors cursor-pointer bg-neutral-900 border border-neutral-700 px-2.5 py-1.5 rounded-xs"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="text-[10px] sm:text-xs font-['Poppins'] font-bold">
                {cartItemCount}
              </span>
            </button>

            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-white hover:text-[#F7E97F] cursor-pointer p-1">
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {isSearchOpen && (
          <div className="absolute top-full left-0 w-full bg-[#0A0A0A] border-b-2 border-[#F7E97F] p-4 shadow-xl animate-fadeIn z-30">
            <form onSubmit={handleSearch} className="max-w-3xl mx-auto flex gap-2">
              <input
                type="text"
                placeholder="Pretražite dukseve, majice, jakne..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="flex-1 bg-[#141414] border border-neutral-700 text-white px-4 py-2.5 text-xs sm:text-sm focus:border-[#F7E97F] focus:outline-none placeholder-neutral-500"
              />
              <button type="submit" className="bg-[#F7E97F] text-[#0A0A0A] px-5 py-2.5 font-['Poppins'] text-xs font-black uppercase cursor-pointer hover:bg-white transition-colors">
                Traži
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Promo traka ispod navbara */}
      <div className="bg-[#F7E97F] text-[#0A0A0A] text-center py-1.5 text-[9px] sm:text-[10px] font-['Poppins'] font-black uppercase tracking-[0.2em]">
        PLAĆANJE POUZEĆEM • DOSTAVA 48-72h ŠIROM BiH
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-[#0A0A0A] border-b-2 border-[#F7E97F] shadow-2xl h-[calc(100vh-80px)] overflow-y-auto z-30">
          <div className="flex flex-col p-6 space-y-6">
            <div className="flex flex-col space-y-4 border-b border-neutral-800 pb-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href} href={link.href}
                  className={`font-['Poppins'] text-sm font-bold uppercase tracking-widest ${pathname === link.href ? 'text-[#F7E97F]' : 'text-white'}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="space-y-4 pb-6 border-b border-neutral-800">
              <h3 className="font-['Poppins'] text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-2">Kategorije</h3>
              {visibleCategories.map((cat) => (
                <Link key={cat} href={`/shop?category=${encodeURIComponent(cat)}`} className="block font-['Poppins'] text-sm font-bold text-neutral-300 uppercase tracking-widest hover:text-[#F7E97F]">
                  {cat}
                </Link>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Link href="/wishlist" className="flex items-center gap-2 text-white text-xs font-bold uppercase bg-neutral-900 p-3 rounded-xs border border-neutral-800">
                <Heart className="w-4 h-4 text-red-500" />Lista želja ({wishlistItemCount})
              </Link>
              <a href={(settings as any)?.instagramUrl || 'https://www.instagram.com/casualshop.bih'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white text-xs font-bold uppercase bg-neutral-900 p-3 rounded-xs border border-neutral-800">
                <Instagram className="w-4 h-4 text-pink-500" />Instagram
              </a>
            </div>
            
            <Link href="/admin" className="flex items-center justify-center gap-2 text-[#0A0A0A] text-xs font-black uppercase bg-[#F7E97F] p-3 rounded-xs mt-4">
              <MonitorPlay className="w-4 h-4" />Admin Panel
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};