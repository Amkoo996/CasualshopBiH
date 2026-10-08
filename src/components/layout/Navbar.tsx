import React, { useState } from 'react';
import { ShoppingBag, Menu, X, Instagram, Search, Heart } from 'lucide-react';
import { Logo } from '../common/Logo';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { CATEGORIES } from '../../types';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onSearch?: (term: string) => void;
  onSelectCategory?: (category: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onSearch,
  onSelectCategory,
}) => {
  const { totalCount, setIsCartOpen, settings } = useCart();
  const { wishlistCount } = useWishlist();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false);

  // Reorganizovane navigacijske linije bez 'wishlist'
  const navLinks = [
    { id: 'home', label: 'Početna' },
    { id: 'shop', label: 'Kolekcija' },
    { id: 'about', label: 'O nama' },
    { id: 'shipping', label: 'Dostava i povrat' },
    { id: 'contact', label: 'Kontakt' },
  ];

  const handleNavClick = (id: string) => {
    setCurrentTab(id);
    setMobileMenuOpen(false);
    setCategoriesDropdownOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategoryClick = (category: string) => {
    if (onSelectCategory) {
      onSelectCategory(category);
    }
    setMobileMenuOpen(false);
    setCategoriesDropdownOpen(false);
    setCurrentTab('shop');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchValue);
      setCurrentTab('shop');
      setSearchOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0A0A0A] text-white border-b border-neutral-800">
      {/* Tanka traka iznad headera */}
      <div className="bg-[#0A0A0A] text-[#F7E97F] text-[11px] font-['Poppins'] font-bold tracking-widest uppercase py-1.5 px-4 text-center border-b border-neutral-900 flex items-center justify-center gap-3">
        <span>{settings.topBarText || 'Plaćanje pouzećem • Dostava širom BiH'}</span>
      </div>

      {/* Main Navbar Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 sm:h-20">
          {/* Mobile menu hamburger button */}
          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 -ml-2 text-white hover:text-[#F7E97F] transition-colors focus:outline-none"
              aria-label="Otvori navigaciju"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Circular Brand Logo */}
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-center focus:outline-none text-left py-2"
          >
            <Logo className="w-12 h-12 sm:w-13 sm:h-13" />
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-7">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleNavClick(link.id)}
                className={`text-xs font-['Poppins'] font-bold uppercase tracking-[0.18em] transition-colors py-1 ${
                  currentTab === link.id
                    ? 'text-[#F7E97F] border-b-2 border-[#F7E97F]'
                    : 'text-neutral-300 hover:text-[#F7E97F]'
                }`}
              >
                {link.label}
              </button>
            ))}

            {/* Quick Categories dropdown trigger */}
            <div className="relative group">
              <button
                onClick={() => setCategoriesDropdownOpen(!categoriesDropdownOpen)}
                className="text-xs font-['Poppins'] font-bold uppercase tracking-[0.18em] text-neutral-300 hover:text-[#F7E97F] flex items-center gap-1 py-1"
              >
                <span>Kategorije</span>
                <span className="text-[10px]">▼</span>
              </button>

              <div className="absolute top-full left-0 hidden group-hover:block w-52 bg-[#0A0A0A] border-2 border-[#F7E97F] shadow-2xl py-2 z-50 animate-fadeIn">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryClick(cat)}
                    className="w-full text-left px-4 py-2 text-xs font-['Inter'] font-semibold text-neutral-200 hover:bg-[#171717] hover:text-[#F7E97F] transition-colors block"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Search Trigger */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 text-neutral-300 hover:text-[#F7E97F] transition-colors"
              title="Pretraži artikle"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Instagram Link */}
            <a
              href={settings.instagramUrl || 'https://www.instagram.com/casualshop.bih'}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex p-2 text-neutral-300 hover:text-[#F7E97F] transition-colors"
              title="Instagram @casualshop.bih"
            >
              <Instagram className="w-5 h-5" />
            </a>

            {/* Favoriti (Srce) Ikona pored korpe */}
            <button
              onClick={() => handleNavClick('wishlist')}
              className="relative p-2 text-neutral-300 hover:text-[#F7E97F] transition-colors flex items-center justify-center"
              title="Moji Favoriti"
            >
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#F7E97F] text-[#0A0A0A] font-['Poppins'] font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative px-3.5 py-2.5 bg-[#171717] text-white border border-neutral-700 hover:bg-[#F7E97F] hover:text-[#0A0A0A] hover:border-[#F7E97F] transition-all flex items-center gap-2 group active:scale-95 shadow-sm ml-1"
              aria-label="Otvori korpu"
            >
              <ShoppingBag className="w-4 h-4 transition-transform group-hover:scale-110" />
              <span className="text-xs font-['Poppins'] font-black">
                {totalCount}
              </span>
            </button>
          </div>
        </div>

        {/* Dropdown Search Bar sa očišćenim tekstom */}
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
                className="absolute right-3 text-neutral-400 hover:text-[#F7E97F]"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-[102px] bg-black/80 backdrop-blur-sm z-50 flex">
          <div className="bg-[#0A0A0A] border-r-2 border-[#F7E97F] w-4/5 max-w-sm h-full p-6 flex flex-col justify-between shadow-2xl animate-slideRight">
            <div className="space-y-6 overflow-y-auto">
              <div className="border-b border-neutral-800 pb-4">
                <Logo />
              </div>

              {/* General Links */}
              <nav className="flex flex-col space-y-3">
                {navLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => handleNavClick(link.id)}
                    className={`text-left text-sm font-['Poppins'] font-bold uppercase tracking-wider py-1.5 border-b border-neutral-900 ${
                      currentTab === link.id ? 'text-[#F7E97F]' : 'text-neutral-300'
                    }`}
                  >
                    {link.label}
                  </button>
                ))}

                {/* Categories sub-list */}
                <div className="pt-2">
                  <span className="text-[10px] font-['Poppins'] font-black uppercase tracking-[0.2em] text-[#F7E97F] block mb-2">
                    KATEGORIJE PROIZVODA
                  </span>
                  <div className="flex flex-col space-y-1.5 pl-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => handleCategoryClick(cat)}
                        className="text-left text-xs font-['Inter'] font-semibold text-neutral-400 hover:text-white py-1"
                      >
                        • {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </nav>
            </div>

            <div className="border-t border-neutral-800 pt-4 text-xs text-neutral-400 space-y-2">
              <a
                href={settings.instagramUrl || 'https://www.instagram.com/casualshop.bih'}
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
