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
    <div className="bg-white p-4 sm:p-6 border-2 border-neutral-200 mb-8 space-y-5 shadow-sm">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#0A0A0A]" />
          <span className="font-['Poppins'] text-xs font-bold uppercase tracking-[0.2em] text-[#0A0A0A]">
            Filteri i Sortiranje
          </span>
          <span className="text-xs text-neutral-500 font-['Inter']">
            ({totalProductsCount} artikala)
          </span>
        </div>

        <div className="flex items-center gap-3">
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 text-xs font-['Poppins'] font-bold text-neutral-600 hover:text-black transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Poništi filtere</span>
            </button>
          )}

          {/* Sort selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="sort-select" className="text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-600 hidden sm:inline">
              Sortiraj:
            </label>
            <select
              id="sort-select"
              value={sortOption}
              onChange={(e) => onSelectSort(e.target.value)}
              className="bg-white border-2 border-neutral-300 text-xs font-['Poppins'] font-semibold px-3 py-1.5 text-neutral-900 focus:border-[#0A0A0A] focus:outline-none cursor-pointer"
            >
              <option value="newest">Najnovije</option>
              <option value="price-low">Cijena: Niža prema višoj</option>
              <option value="price-high">Cijena: Viša prema nižoj</option>
              <option value="name">Naziv (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Categories - KORISTI PROČIŠĆENI NIZ iz PROPSA */}
      <div className="space-y-2">
        <span className="text-[11px] font-['Poppins'] font-bold uppercase tracking-[0.15em] text-neutral-500 block">
          Kategorija
        </span>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`px-3.5 py-1.5 text-xs font-['Poppins'] font-bold uppercase tracking-wider transition-all border-2 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#0A0A0A] text-[#F7E97F] border-[#0A0A0A]'
                  : 'bg-white text-neutral-700 border-neutral-200 hover:border-[#0A0A0A]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Row with Sizes & Price Slider */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Size pills */}
        <div className="space-y-2">
          <span className="text-[11px] font-['Poppins'] font-bold uppercase tracking-[0.15em] text-neutral-500 block">
            Veličina
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onSelectSize('')}
              className={`h-9 px-3 text-xs font-['Poppins'] font-bold transition-all border-2 cursor-pointer ${
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
                className={`h-9 px-3 text-xs font-['Poppins'] font-bold transition-all border-2 cursor-pointer ${
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
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[11px] font-['Poppins'] font-bold uppercase tracking-[0.15em] text-neutral-500">
            <span>Maksimalna cijena:</span>
            <span className="text-[#0A0A0A] font-black text-xs">
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
            className="w-full accent-[#0A0A0A] cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
