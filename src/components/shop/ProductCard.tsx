import React from 'react';
import { Heart } from 'lucide-react';
import { Product } from '../../types';
import { useWishlist } from '../../context/WishlistContext';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

// Nova helper funkcija za optimizaciju Cloudinary slika
const optimizeCloudinaryUrl = (url: string, width: number = 500) => {
  if (!url) return '';
  // Provjeravamo da li je Cloudinary link
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    // Ubacujemo f_auto,q_auto,w_X parametre za format, kvalitet i rezoluciju
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
  }
  return url;
};

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isSaved = isInWishlist(product.id);

  // Računanje ukupne zalihe
  const totalStock = Object.values(product.sizes || {}).reduce((acc, stock) => acc + (stock || 0), 0);
  const isSoldOut = totalStock <= 0;
  
  // Note "POSLJEDNJI KOMADI" ako je zaliha ispod 5 komada
  const isLowStock = totalStock > 0 && totalStock < 5;

  // Provjera za NOVO (posljednjih 30 dana)
  const isWithin30Days = product.createdAt
    ? (Date.now() - new Date(product.createdAt).getTime()) <= (30 * 24 * 60 * 60 * 1000)
    : false;
  const showNewBadge = (product.isNew || isWithin30Days) && !isSoldOut;

  const hasDiscount = Boolean(product.originalPrice && product.originalPrice > product.price);

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  // Redoslijed prikazivanja veličina
  const sizeOrder = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
  const sortedSizes = Object.entries(product.sizes || {}).sort(
    ([a], [b]) => sizeOrder.indexOf(a) - sizeOrder.indexOf(b)
  );

  return (
    <div
      onClick={() => onSelect(product)}
      className="group cursor-pointer flex flex-col bg-white border-2 border-neutral-200 hover:border-[#F7E97F] transition-all duration-300 shadow-sm relative"
    >
      {/* Product Image Container */}
      <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
        {/* Favoriti (Srce) Dugme */}
        <button
          type="button"
          onClick={handleHeartClick}
          aria-label={isSaved ? 'Ukloni iz liste želja' : 'Dodaj u listu želja'}
          className={`absolute top-2.5 right-2.5 z-20 p-2 rounded-full transition-all duration-200 shadow-md ${
            isSaved
              ? 'bg-[#0A0A0A] text-red-500 border border-neutral-700 hover:scale-110'
              : 'bg-white/85 text-neutral-600 hover:text-black hover:bg-white hover:scale-110 backdrop-blur-xs'
          }`}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
        </button>

        {/* PRVA SLIKA - Ovdje smo ubacili optimizeCloudinaryUrl */}
        <img
          src={optimizeCloudinaryUrl(product.images[0])}
          alt={product.name}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/images/sarajevo_geo_tee.jpg';
          }}
          className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
        />

        {/* DRUGA SLIKA (Hover) - Ovdje smo ubacili optimizeCloudinaryUrl */}
        {product.images[1] && (
          <img
            src={optimizeCloudinaryUrl(product.images[1])}
            alt={`${product.name} alternate view`}
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/images/sarajevo_geo_tee.jpg';
            }}
            className="absolute inset-0 w-full h-full object-cover object-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 hidden sm:block"
          />
        )}

        {/* Badges Overlay */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          {isSoldOut ? (
            <span className="bg-[#9A9A9A] text-white text-[10px] font-['Poppins'] font-black uppercase tracking-[0.18em] px-2.5 py-1">
              RASPRODANO
            </span>
          ) : (
            <>
              {isLowStock && (
                <span className="bg-[#E63946] text-white text-[10px] font-['Poppins'] font-black uppercase tracking-[0.18em] px-2.5 py-1 shadow-sm animate-pulse">
                  POSLJEDNJI KOMADI
                </span>
              )}
              {showNewBadge && (
                <span className="bg-[#0A0A0A] text-[#F7E97F] border border-[#F7E97F] text-[10px] font-['Poppins'] font-black uppercase tracking-[0.18em] px-2.5 py-1">
                  NOVO
                </span>
              )}
              {hasDiscount && (
                <span className="bg-[#F7E97F] text-[#0A0A0A] text-[10px] font-['Poppins'] font-black uppercase tracking-[0.18em] px-2.5 py-1">
                  AKCIJA
                </span>
              )}
            </>
          )}
        </div>

        {/* Dostupne veličine na hover */}
        <div className="absolute bottom-0 inset-x-0 bg-[#0A0A0A]/90 text-white py-1.5 px-2 text-[10px] font-['Inter'] font-semibold tracking-wider flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {sortedSizes.map(([size, stock]) => (
            <span
              key={size}
              className={`${
                (stock ?? 0) > 0 ? 'text-[#F7E97F] font-bold' : 'text-[#9A9A9A] line-through'
              }`}
            >
              {size}
            </span>
          ))}
        </div>
      </div>

      {/* Info Container */}
      <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between space-y-2 bg-white">
        <div>
          <div className="flex items-center justify-between text-[10px] uppercase font-['Poppins'] font-bold text-neutral-400 mb-1">
            <span>{product.category}</span>
            {product.color && <span className="text-neutral-500">{product.color}</span>}
          </div>
          <h3 className="font-['Poppins'] text-xs sm:text-sm font-bold text-[#111111] uppercase tracking-tight line-clamp-1 group-hover:text-black transition-colors">
            {product.name}
          </h3>
        </div>

        <div className="flex items-baseline justify-between pt-2 border-t border-neutral-100">
          <div className="flex items-baseline gap-2">
            <span className="text-sm sm:text-base font-black font-['Poppins'] text-[#0A0A0A]">
              {product.price.toFixed(2)} KM
            </span>
            {hasDiscount && (
              <span className="text-xs font-['Inter'] text-neutral-400 line-through">
                {product.originalPrice?.toFixed(2)} KM
              </span>
            )}
          </div>

          <span className="text-[10px] font-['Poppins'] font-bold uppercase">
            {isSoldOut ? (
              <span className="text-[#9A9A9A]">RASPRODANO</span>
            ) : isLowStock ? (
              <span className="text-[#E63946]">POSLJEDNJI KOMADI</span>
            ) : (
              <span className="text-neutral-400">DOSTUPNO</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
