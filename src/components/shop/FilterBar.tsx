import React from 'react';
import { Size } from '../../types';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';

interface FilterBarProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  selectedSize: Size | '';
  onSelectSize: (size: Size | '') => void;
  sortOption: string;
  onSelectSort: (sort: string) => void;
  maxPrice: number;
  priceRange: number;
  onPriceChange: (price: number) => void;
  onReset: () => void;
  totalProductsCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  selectedSize,
  onSelectSize,
  sortOption,
  onSelectSort,
  maxPrice,
  priceRange,
  onPriceChange,
  onReset,
  totalProductsCount,
}) => {
  const sizes: Size[] = ['S', 'M', 'L', 'XL', 'XXL', '3XL', 'One size'];

  const hasActiveFilters =
    selectedCategory !== 'Sve' || selectedSize !== '' || priceRange < maxPrice;

  return (
    <div className="bg-white p-5 sm:p-7 border-2 border-neutral-900 mb-10 space-y-6 shadow-[4px_4px_0px_0px_rgba(10,10,10,1)]">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-neutral-100 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#0A0A0A] text-[#F7E97F] flex items-center justify-center rounded-xs">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <span className="font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] text-[#0A0A0A] block leading-none">
              Filteri i Sortiranje
            </span>
            <span className="text-[10px] text-neutral-500 font-['Inter'] font-semibold mt-1 block">
              Pronađeno: <strong className="text-black">{totalProductsCount}</strong> artikala
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 text-[11px] font-['Poppins'] font-bold text-neutral-600 hover:text-red-600 transition-colors cursor-pointer bg-neutral-100 px-3 py-1.5 rounded-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Poništi sve</span>
            </button>
          )}

          {/* Sort selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="sort-select" className="text-[11px] font-['Poppins'] font-bold uppercase tracking-wider text-neutral-600 hidden sm:inline">
              Sortiraj:
            </label>
            <select
              id="sort-select"
              value={sortOption}
              onChange={(e) => onSelectSort(e.target.value)}
              className="bg-[#FAF9F5] border-2 border-neutral-900 text-xs font-['Poppins'] font-bold px-3 py-2 text-neutral-900 focus:border-[#F7E97F] focus:outline-none cursor-pointer"
            >
              <option value="newest">Najnovije dodano</option>
              <option value="position">Pozicija u kolekciji</option>
              <option value="price-low">Cijena: Niža prema višoj</option>
              <option value="price-high">Cijena: Viša prema nižoj</option>
            </select>
          </div>
        </div>
      </div>

      {/* Categories - Quick Pill Bar */}
      <div className="space-y-2.5">
        <span className="text-[10px] font-['Poppins'] font-black uppercase tracking-[0.2em] text-neutral-400 block">
          Odaberi kategoriju
        </span>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`px-4 py-2 text-xs font-['Poppins'] font-black uppercase tracking-wider transition-all border-2 cursor-pointer rounded-xs ${
                selectedCategory === cat
                  ? 'bg-[#0A0A0A] text-[#F7E97F] border-[#0A0A0A] shadow-xs'
                  : 'bg-[#FAF9F5] text-neutral-800 border-neutral-200 hover:border-[#0A0A0A] hover:bg-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Row with Sizes & Price Slider */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 border-t border-neutral-100">
        {/* Size pločice */}
        <div className="space-y-2.5">
          <span className="text-[10px] font-['Poppins'] font-black uppercase tracking-[0.2em] text-neutral-400 block">
            Veličina
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onSelectSize('')}
              className={`h-9 px-3.5 text-xs font-['Poppins'] font-black transition-all border-2 cursor-pointer rounded-xs ${
                selectedSize === ''
                  ? 'bg-[#0A0A0A] text-[#F7E97F] border-[#0A0A0A]'
                  : 'bg-white text-neutral-700 border-neutral-200 hover:border-[#0A0A0A]'
              }`}
            >
              SVE
            </button>
            {sizes.map((sz) => (
              <button
                key={sz}
                onClick={() => onSelectSize(selectedSize === sz ? '' : sz)}
                className={`h-9 w-10 flex items-center justify-center text-xs font-['Poppins'] font-black transition-all border-2 cursor-pointer rounded-xs ${
                  selectedSize === sz
                    ? 'bg-[#0A0A0A] text-[#F7E97F] border-[#0A0A0A]'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:border-[#0A0A0A]'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        {/* Max price filter slider */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-center text-[10px] font-['Poppins'] font-black uppercase tracking-[0.2em] text-neutral-400">
            <span>Maksimalna cijena:</span>
            <span className="text-[#0A0A0A] bg-[#F7E97F] px-2 py-0.5 font-black text-xs border border-black">
              do {priceRange.toFixed(0)} KM
            </span>
          </div>
          <input
            type="range"
            min={15}
            max={maxPrice}
            step={5}
            value={priceRange}
            onChange={(e) => onPriceChange(Number(e.target.value))}
            className="w-full accent-[#0A0A0A] cursor-pointer h-2 bg-neutral-200 rounded-lg appearance-none"
          />
        </div>
      </div>
    </div>
  );
};