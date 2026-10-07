import React, { useState, useMemo } from 'react';
import { Product, Size } from '../types';
import { ProductCard } from '../components/shop/ProductCard';
import { FilterBar } from '../components/shop/FilterBar';

interface ShopPageProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  initialCategory?: string;
  searchTerm?: string;
}

export const ShopPage: React.FC<ShopPageProps> = ({
  products,
  onSelectProduct,
  initialCategory = 'Sve',
  searchTerm = '',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedSize, setSelectedSize] = useState<Size | ''>('');
  const [sortOption, setSortOption] = useState<string>('newest');

  // Find max price dynamically
  const maxProductPrice = useMemo(() => {
    return Math.ceil(Math.max(...products.map((p) => p.price), 150));
  }, [products]);

  const [priceRange, setPriceRange] = useState<number>(maxProductPrice);

  const categories = ['Sve', 'Duksevi', 'Majice', 'Trenerke', 'Jakne', 'Kape & Aksesoari'];

  // Filtering & Sorting logic
  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        // Category filter
        if (selectedCategory !== 'Sve' && product.category !== selectedCategory) {
          return false;
        }

        // Size filter
        if (selectedSize !== '') {
          const sizeStock = product.sizes[selectedSize] ?? 0;
          if (sizeStock <= 0) return false;
        }

        // Price filter
        if (product.price > priceRange) {
          return false;
        }

        // Search term
        if (searchTerm.trim() !== '') {
          const term = searchTerm.toLowerCase();
          const matchName = product.name.toLowerCase().includes(term);
          const matchDesc = product.description.toLowerCase().includes(term);
          const matchCat = product.category.toLowerCase().includes(term);
          if (!matchName && !matchDesc && !matchCat) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'price-low') return a.price - b.price;
        if (sortOption === 'price-high') return b.price - a.price;
        if (sortOption === 'name') return a.name.localeCompare(b.name);
        // Default: newest
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
  }, [products, selectedCategory, selectedSize, priceRange, sortOption, searchTerm]);

  const handleReset = () => {
    setSelectedCategory('Sve');
    setSelectedSize('');
    setPriceRange(maxProductPrice);
    setSortOption('newest');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-neutral-900">
          STREETWEAR KOLEKCIJA
        </h1>
        <p className="text-sm text-neutral-500 mt-1 max-w-xl">
          Kompletna ponuda muške i uniseks ulične odjeće. Pronađite savršenu veličinu i kroj uz brzu dostavu u BiH.
        </p>
        {searchTerm && (
          <div className="mt-3 inline-block bg-neutral-100 text-neutral-800 text-xs px-3 py-1 font-mono">
            Rezultati pretrage za: <strong>"{searchTerm}"</strong>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <FilterBar
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedSize={selectedSize}
        onSelectSize={setSelectedSize}
        sortOption={sortOption}
        onSelectSort={setSortOption}
        maxPrice={maxProductPrice}
        priceRange={priceRange}
        onPriceChange={setPriceRange}
        onReset={handleReset}
        totalProductsCount={filteredProducts.length}
      />

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-neutral-50 border border-neutral-200">
          <p className="text-sm font-bold uppercase tracking-wider text-neutral-700">
            Nema artikala koji odgovaraju odabranim filterima.
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Pokušajte promijeniti raspon cijene ili odabrati drugu veličinu.
          </p>
          <button
            onClick={handleReset}
            className="mt-4 px-6 py-2.5 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors"
          >
            Resetuj sve filtere
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={onSelectProduct}
            />
          ))}
        </div>
      )}
    </div>
  );
};
