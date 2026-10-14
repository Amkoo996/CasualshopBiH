"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ShoppingBag, Menu, X, Instagram, Search, Heart } from 'lucide-react';
import { Logo } from '../common/Logo';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { CATEGORIES, Category } from '../../types';

export const Navbar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  
  const { totalCount, setIsCartOpen, settings } = useCart();
  const { wishlistIds = [] } = useWishlist();
  const wishlistCount = wishlistIds.length;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false);

  const hiddenCats = settings?.hiddenCategories || [];
  const visibleCategories = CATEGORIES.filter(
    (cat) => !hiddenCats.includes(cat as Category)
  );

  const navLinks = [
    { href: '/', label: 'Početna' },
    { href: '/shop', label: 'Kolekcija' },
    { href: '/o-nama', label: 'O nama' },
    { href: '/dostava-i-povrat', label: 'Dostava i povrat' },
    { href: '/kontakt', label: 'Kontakt' },
  ];

  const handleCategoryClick = (category: string) => {
    setMobileMenuOpen(false);
    setCategoriesDropdownOpen(false);
    router.push(`/shop?category=${encodeURIComponent(category)}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      setSearchOpen(false);
      router.push(`/shop?search=${encodeURIComponent(searchValue)}`);
    }
  };

  return (
    <header className="relative z-40 bg-[#0A0A0A] text-white border-b border-neutral-800">
      <div className="bg-[#0A0A0A] text-[#F7E97F] text-[11px] font-['Poppins'] font-bold tracking-widest uppercase py-1.5 px-4 text-center border-b border-neutral-900 flex items-center justify-center gap-3">
        <span>{settings?.topBarText || 'Plaćanje pouzećem • Dostava širom BiH'}</span>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* UKLONJEN overflow-hidden kako padajući meni ne bi bio odsječen */}
        <div className="flex items-center justify-between h-16 sm:h-20 gap-1 flex-nowrap w-full relative">
          
          {/* Burger meni (mobilni) */}
          <div className="flex items-center lg:hidden shrink-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1 text-white hover:text-[#F7E97F] transition-colors focus:outline-none cursor-pointer"
              aria-label="Otvori navigaciju"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
          </div>

          {/* Logo */}
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center focus:outline-none text-left py-1 cursor-pointer shrink min-w-0 max-w-[150px] xs:max-w-[180px] sm:max-w-none"
          >
            <div className="scale-90 origin-left sm:scale-100 transition-transform">
              <Logo />
            </div>
          </Link>

          {/* Desktop Navigacija */}
          <nav className="hidden lg:flex items-center space-x-7 shrink-0">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-xs font-['Poppins'] font-bold uppercase tracking-[0.18em] transition-colors py-1 cursor-pointer ${
                  pathname === link.href
                    ? 'text-[#F7E97F] border-b-2 border-[#F7E97F]'
                    : 'text-neutral-300 hover:text-[#F7E97F]'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {visibleCategories.length > 0 && (
              <div 
                className="relative group"
                onMouseLeave={() => setCategoriesDropdownOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setCategoriesDropdownOpen(!categoriesDropdownOpen)}
                  className="text-xs font-['Poppins'] font-bold uppercase tracking-[0.18em] text-neutral-300 hover:text-[#F7E97F] flex items-center gap-1 py-1 cursor-pointer"
                >
                  <span>Kategorije</span>
                  <span className="text-[10px]">▼</span>
                </button>

                {/* Padajući meni s potpunim prikazom (radi na hover i na klik) */}
                <div 
                  className={`absolute top-full left-0 mt-2 w-56 bg-[#0A0A0A] border-2 border-[#F7E97F] shadow-2xl py-2 z-50 animate-fadeIn ${
                    categoriesDropdownOpen ? 'block' : 'hidden group-hover:block'
                  }`}
                >
                  {visibleCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryClick(cat)}
                      className="w-full text-left px-4 py-2.5 text-xs font-['Inter'] font-semibold text-neutral-200 hover:bg-[#171717] hover:text-[#F7E97F] transition-colors block cursor-pointer"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </nav>

          {/* Desne akcije: Pretraga, Instagram, Favoriti, Korpa */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-1 text-neutral-300 hover:text-[#F7E97F] transition-colors cursor-pointer"
              title="Pretraži artikle"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <a
              href={settings?.instagramUrl || 'https://www.instagram.com/casualshop.bih'}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex p-1.5 text-neutral-300 hover:text-[#F7E97F] transition-colors"
              title="Instagram @casualshop.bih"
            >
              <Instagram className="w-5 h-5" />
            </a>

            <Link
              href="/wishlist"
              className="relative p-1 text-neutral-300 hover:text-[#F7E97F] transition-colors flex items-center justify-center cursor-pointer"
              title="Moji Favoriti"
            >
              <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#F7E97F] text-[#0A0A0A] font-['Poppins'] font-black text-[9px] w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative px-2 sm:px-3 py-1.5 sm:py-2.5 bg-[#171717] text-white border border-neutral-700 hover:bg-[#F7E97F] hover:text-[#0A0A0A] hover:border-[#F7E97F] transition-all flex items-center gap-1 group active:scale-95 shadow-sm cursor-pointer shrink-0"
              aria-label="Otvori korpu"
            >
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:scale-110 shrink-0" />
              <span className="text-xs font-['Poppins'] font-black leading-none">
                {totalCount}
              </span>
            </button>
          </div>
        </div>

        {/* Polje za pretragu */}
        {searchOpen && (
          <div className="py-3 border-t border-neutral-800 animate-fadeIn">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Pretražite artikle (npr. majica, dukserica, jakna...)"
                className="w-full bg-[#171717] border border-neutral-700 text-white px-4 py-2.5 pr-10 text-xs focus:ring-1 focus:ring-[#F7E97F] focus:border-[#F7E97F] placeholder-neutral-500"
                autoFocus
              />
              <button
                type="submit"
                className="absolute right-3 text-neutral-400 hover:text-[#F7E97F] cursor-pointer"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Mobilni meni */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-black/80 backdrop-blur-sm z-50 flex min-h-screen">
          <div className="bg-[#0A0A0A] border-r-2 border-[#F7E97F] w-4/5 max-w-sm p-6 flex flex-col justify-between shadow-2xl animate-slideRight">
            <div className="space-y-6 overflow-y-auto">
              <div className="border-b border-neutral-800 pb-4">
                <Logo />
              </div>

              <nav className="flex flex-col space-y-3">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`text-left text-sm font-['Poppins'] font-bold uppercase tracking-wider py-1.5 border-b border-neutral-900 cursor-pointer ${
                      pathname === link.href ? 'text-[#F7E97F]' : 'text-neutral-300'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}

                {visibleCategories.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] font-['Poppins'] font-black uppercase tracking-[0.2em] text-[#F7E97F] block mb-2">
                      KATEGORIJE PROIZVODA
                    </span>
                    <div className="flex flex-col space-y-1.5 pl-2">
                      {visibleCategories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => handleCategoryClick(cat)}
                          className="text-left text-xs font-['Inter'] font-semibold text-neutral-400 hover:text-white py-1 cursor-pointer"
                        >
                          • {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </nav>
            </div>

            <div className="border-t border-neutral-800 pt-4 text-xs text-neutral-400 space-y-2 mt-6">
              <a
                href={settings?.instagramUrl || 'https://www.instagram.com/casualshop.bih'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white hover:text-[#F7E97F]"
              >
                <Instagram className="w-4 h-4 text-[#F7E97F]" />
                <span>@casualshop.bih</span>
              </a>
              <p className="text-[11px] text-neutral-400">
                Plaćanje pouzećem • Dostava širom BiH
              </p>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}
    </header>
  );
};