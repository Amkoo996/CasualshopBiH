"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingBag, Search, Menu, X, Heart, Instagram, ChevronDown } from 'lucide-react';
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
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

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
    <header className={`sticky top-0 z-40 transition-all duration-300 font-['Inter'] ${isScrolled ? 'bg-[#0A0A0A]/95 backdrop-blur-md shadow-2xl border-b border-neutral-800' : 'bg-[#0A0A0A] text-white'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-24 sm:h-28">
          <Link href="/" className="flex items-center gap-3.5 group z-50">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
              <img 
                src="/logo.png" 
                alt="Casual Shop Logo" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.parentElement) {
                    e.currentTarget.parentElement.innerHTML = `<span class="font-['Poppins'] font-black text-xs text-[#F7E97F] leading-none">CS</span>`;
                  }
                }}
              />
            </div>
            <div className="flex flex-col justify-center">
              <span className="font-['Poppins'] text-xl sm:text-2xl font-black tracking-widest text-white leading-none group-hover:text-[#F7E97F] transition-colors">
                CASUAL <span className="text-[#F7E97F] text-sm group-hover:text-white transition-colors">shop</span>
              </span>
              <span className="text-[10px] sm:text-[11px] text-neutral-400 font-bold tracking-[0.25em] uppercase mt-1 hidden sm:block">
                BiH • Ulična pravila
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative font-['Poppins'] text-[11px] font-bold uppercase tracking-widest transition-colors py-2 group ${
                  pathname === link.href ? 'text-[#F7E97F]' : 'text-neutral-300 hover:text-white'
                }`}
              >
                {link.label}
                <span className={`absolute bottom-0 left-0 w-full h-[2px] bg-[#F7E97F] transform origin-left transition-transform duration-300 ${pathname === link.href ? 'scale-x-100' : 'scale-x-0'}`} />
              </Link>
            ))}

            <div className="relative group py-6">
              <Link
                href="/shop"
                className={`flex items-center gap-1 font-['Poppins'] text-[11px] font-bold uppercase tracking-widest transition-colors ${
                  pathname === '/shop' ? 'text-[#F7E97F]' : 'text-neutral-300 group-hover:text-white'
                }`}
              >
                <span>Kategorije</span>
                <ChevronDown className="w-3.5 h-3.5 transition-transform group-hover:rotate-180" />
              </Link>

              <div className="absolute top-[80%] left-1/2 -translate-x-1/2 w-56 bg-[#0A0A0A]/95 backdrop-blur-md border border-neutral-800 shadow-2xl py-3 rounded-b-md z-50 opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all duration-300">
                {visibleCategories.map((cat) => (
                  <Link
                    key={cat}
                    href={`/shop?category=${encodeURIComponent(cat)}`}
                    className="block px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400 hover:text-[#0A0A0A] hover:bg-[#F7E97F] transition-all"
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            </div>
          </nav>

          <div className="flex items-center gap-4 sm:gap-6 z-50">
            <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="text-neutral-300 hover:text-[#F7E97F] hover:scale-110 transition-all cursor-pointer p-1">
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <a href="https://ig.me/m/casualshop.bih" target="_blank" rel="noopener noreferrer" className="hidden sm:block text-neutral-300 hover:text-[#F7E97F] hover:scale-110 transition-all p-1">
              <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />
            </a>

            <Link href="/wishlist" className="relative text-neutral-300 hover:text-red-500 transition-all group hidden sm:block p-1 hover:scale-110">
              <Heart className="w-4 h-4 sm:w-5 sm:h-5 group-hover:fill-red-500" />
              {wishlistItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md">
                  {wishlistItemCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 bg-white text-black hover:bg-[#F7E97F] rounded-full transition-all cursor-pointer shadow-lg hover:scale-105"
            >
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-black">
                  {cartItemCount}
                </span>
              )}
            </button>

            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-white hover:text-[#F7E97F] cursor-pointer p-1">
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {isSearchOpen && (
          <div className="absolute top-full left-0 w-full bg-[#0A0A0A]/95 backdrop-blur-md border-b-2 border-[#F7E97F] p-5 shadow-xl animate-fadeIn z-30">
            <form onSubmit={handleSearch} className="max-w-3xl mx-auto flex gap-3">
              <input
                type="text"
                placeholder="Pretražite dukseve, majice, jakne..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="flex-1 bg-neutral-900 border border-neutral-700 text-white px-5 py-3 text-sm focus:border-[#F7E97F] focus:outline-none placeholder-neutral-500 rounded-sm transition-colors"
              />
              <button type="submit" className="bg-[#F7E97F] text-[#0A0A0A] px-6 py-3 font-['Poppins'] text-xs font-black uppercase tracking-wider cursor-pointer hover:bg-white transition-colors rounded-sm">
                Traži
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="bg-[#F7E97F] text-[#0A0A0A] text-center py-2 text-[9px] sm:text-[10px] font-['Poppins'] font-black uppercase tracking-[0.2em] shadow-sm">
        PLAĆANJE POUZEĆEM • DOSTAVA 48-72h ŠIROM BiH
      </div>

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
              <Link href="/wishlist" className="flex flex-col items-center justify-center gap-2 text-white text-[10px] font-bold uppercase bg-neutral-900 p-4 rounded-sm border border-neutral-800 hover:border-[#F7E97F] transition-colors">
                <Heart className="w-5 h-5 text-red-500" />Lista želja ({wishlistItemCount})
              </Link>
              <a href="https://ig.me/m/casualshop.bih" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center gap-2 text-white text-[10px] font-bold uppercase bg-neutral-900 p-4 rounded-sm border border-neutral-800 hover:border-[#F7E97F] transition-colors">
                <Instagram className="w-5 h-5 text-pink-500" />Instagram
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
