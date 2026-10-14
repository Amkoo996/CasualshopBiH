import React, { useState, useEffect, useMemo } from 'react';
import { Product, Size, CATEGORIES, Category } from '../types';
import { ProductCard } from '../components/shop/ProductCard';
import { FilterBar } from '../components/shop/FilterBar';
import { useCart } from '../context/CartContext';
import { X, SlidersHorizontal, RefreshCw } from 'lucide-react';

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
  const { settings } = useCart();
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedSize, setSelectedSize] = useState<Size | ''>('');
  const [sortOption, setSortOption] = useState<string>('newest');

  // Sinhronizacija kategorije pri kliku na meni/Navbar
  useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  // Dinamicka filtracija lista kategorija na osnovu postavki u Admin Panelu
  const hiddenCats = settings?.hiddenCategories || [];
  const categories = useMemo(() => {
    const visibleFromGlobal = CATEGORIES.filter(
      (cat) => !hiddenCats.includes(cat as Category)
    );
    return ['Sve', ...visibleFromGlobal];
  }, [hiddenCats]);

  // Izracun maksimalne cijene za slider
  const maxProductPrice = useMemo(() => {
    if (products.length === 0) return 150;
    return Math.ceil(Math.max(...products.map((p) => p.price), 150));
  }, [products]);

  const [priceRange, setPriceRange] = useState<number>(maxProductPrice);

  // Azuriranje priceRange ako se ucitaju novi proizvodi
  useEffect(() => {
    setPriceRange(maxProductPrice);
  }, [maxProductPrice]);

  // Logika filtriranja i sortiranja artikala
  const filteredProducts = useMemo(() => {
    const normalizedSelectedCat = selectedCategory.trim().toLowerCase();

    return products
      .filter((product) => {
        // Ukupna zaliha po svim velicinama
        const totalStock = Object.values(product.sizes || {}).reduce(
          (sum, val) => sum + (val || 0),
          0
        );
        const isSoldOut = totalStock <= 0;

        // Ako je odabrana kategorija "Rasprodano", prikazi SAMO rasprodane artikle
        if (normalizedSelectedCat === 'rasprodano') {
          if (!isSoldOut) return false;
        } else {
          // Za sve ostale kategorije (ukljucujuci "Sve"), SAKRIJ rasprodane artikle
          if (isSoldOut) return false;

          // Filtriranje po specificnoj kategoriji
          if (
            normalizedSelectedCat !== 'sve' &&
            (product.category || '').trim().toLowerCase() !== normalizedSelectedCat
          ) {
            return false;
          }
        }

        // Filtriranje po velicini
        if (selectedSize !== '') {
          const sizeStock = product.sizes?.[selectedSize] ?? 0;
          if (sizeStock <= 0) return false;
        }

        // Filtriranje po cijeni
        if (product.price > priceRange) {
          return false;
        }

        // Pretraga po nazivu, opisu ili kategoriji
        if (searchTerm.trim() !== '') {
          const term = searchTerm.trim().toLowerCase();
          const matchName = (product.name || '').toLowerCase().includes(term);
          const matchDesc = (product.description || '').toLowerCase().includes(term);
          const matchCat = (product.category || '').toLowerCase().includes(term);
          if (!matchName && !matchDesc && !matchCat) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'price-low') return a.price - b.price;
        if (sortOption === 'price-high') return b.price - a.price;
        if (sortOption === 'name') return a.name.localeCompare(b.name);

        // Zadano: Najnovije
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

  const hasActiveFilters = Boolean(
    selectedCategory !== 'Sve' ||
    selectedSize !== '' ||
    priceRange < maxProductPrice ||
    searchTerm !== ''
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16 font-['Inter']">
      {/* Naslov stranice */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-[#0A0A0A] text-[#F7E97F] text-[10px] font-['Poppins'] font-black uppercase tracking-[0.2em] px-2 py-0.5 border border-[#F7E97F]">
            KATALOG
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-neutral-900 font-['Poppins']">
          STREETWEAR KOLEKCIJA
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600 mt-1 max-w-xl font-['Inter']">
          Kompletna ponuda muSke i uniseks ulicne odjece. Pronađite savrSenu velicinu i kroj uz brzu dostavu u BiH.
        </p>

        {/* Aktivni Filteri / Tags Bar */}
        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-200">
            <span className="text-[11px] font-['Poppins'] font-bold uppercase text-neutral-500 mr-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Aktivni filteri:</span>
            </span>

            {selectedCategory !== 'Sve' && (
              <button
                onClick={() => setSelectedCategory('Sve')}
                className="inline-flex items-center gap-1 bg-[#0A0A0A] text-white text-[11px] font-['Poppins'] font-bold uppercase px-2.5 py-1 rounded-xs hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <span>Kategorija: {selectedCategory}</span>
                <X className="w-3.5 h-3.5 text-[#F7E97F]" />
              </button>
            )}

            {selectedSize !== '' && (
              <button
                onClick={() => setSelectedSize('')}
                className="inline-flex items-center gap-1 bg-[#0A0A0A] text-white text-[11px] font-['Poppins'] font-bold uppercase px-2.5 py-1 rounded-xs hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <span>Velicina: {selectedSize}</span>
                <X className="w-3.5 h-3.5 text-[#F7E97F]" />
              </button>
            )}

            {priceRange < maxProductPrice && (
              <button
                onClick={() => setPriceRange(maxProductPrice)}
                className="inline-flex items-center gap-1 bg-[#0A0A0A] text-white text-[11px] font-['Poppins'] font-bold uppercase px-2.5 py-1 rounded-xs hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <span>Do {priceRange} KM</span>
                <X className="w-3.5 h-3.5 text-[#F7E97F]" />
              </button>
            )}

            {searchTerm && (
              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-mono px-2.5 py-1 font-bold">
                Upit: "{searchTerm}"
              </span>
            )}

            <button
              onClick={handleReset}
              className="text-[11px] font-['Poppins'] font-bold uppercase text-neutral-600 hover:text-black underline ml-2 cursor-pointer"
            >
              Resetuj sve
            </button>
          </div>
        )}
      </div>

      {/* Filter Traka */}
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

      {/* Prikaz Mreze Proizvoda */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-white border-2 border-neutral-300 p-8 shadow-sm space-y-3">
          <p className="text-sm font-black uppercase tracking-wider text-black font-['Poppins']">
            Nema artikala koji odgovaraju odabranim filterima.
          </p>
          <p className="text-xs text-neutral-600 max-w-md mx-auto font-['Inter']">
            PokuSajte promijeniti raspon cijene, odabrati drugu kategoriju ili ukloniti odabranu velicinu.
          </p>
          <button
            onClick={handleReset}
            className="mt-2 px-6 py-3 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] text-xs font-['Poppins'] font-bold uppercase tracking-wider transition-all border-2 border-[#0A0A0A] cursor-pointer inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Resetuj sve filtere</span>
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
