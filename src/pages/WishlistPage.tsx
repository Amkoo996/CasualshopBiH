import React from 'react';
import { Heart, ArrowLeft, ShoppingBag, Trash2, LogIn } from 'lucide-react';
import { Product } from '../types';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { ProductCard } from '../components/shop/ProductCard';

interface WishlistPageProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onExploreProducts: () => void;
}

export const WishlistPage: React.FC<WishlistPageProps> = ({
  products = [],
  onSelectProduct,
  onExploreProducts,
}) => {
  const { wishlistIds = [], clearWishlist } = useWishlist();
  const { user, signInWithGoogle } = useAuth();

  // Ekstrakcija čistih string ID-jeva bez obzira na zapis
  const rawIds = (wishlistIds || []).map((item: any) =>
    typeof item === 'object' && item !== null ? String(item.id) : String(item)
  );

  // Filtracija artikala s višestrukom provjerom (ID, slug ili podudaranje naziva)
  const wishlistProducts = (products || []).filter((p) =>
    rawIds.includes(String(p.id))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 space-y-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-neutral-200">
        <div>
          <button
            onClick={onExploreProducts}
            className="inline-flex items-center gap-1.5 text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-500 hover:text-black mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Nazad na ponudu</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0A0A0A] text-[#F7E97F] flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5 fill-[#F7E97F]" />
            </div>
            <div>
              <h1 className="font-['Poppins'] text-2xl sm:text-4xl font-black uppercase tracking-tight text-[#0A0A0A]">
                Moja lista želja
              </h1>
              <p className="text-xs text-neutral-500 font-['Inter']">
                Vaši sačuvani komadi za brzu kupovinu ({wishlistProducts.length})
              </p>
            </div>
          </div>
        </div>

        {wishlistProducts.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Jeste li sigurni da želite ukloniti sve artikle iz liste želja?')) {
                clearWishlist();
              }
            }}
            className="px-4 py-2 border border-neutral-300 hover:border-black text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-600 hover:text-black flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Isprazni listu</span>
          </button>
        )}
      </div>

      {/* Grid or Empty State */}
      {wishlistProducts.length === 0 ? (
        <div className="bg-white border-2 border-neutral-200 p-12 text-center space-y-4 max-w-xl mx-auto shadow-sm">
          <div className="w-16 h-16 bg-[#F4F2EC] text-[#0A0A0A] rounded-full flex items-center justify-center mx-auto border-2 border-neutral-300">
            <Heart className="w-8 h-8 text-neutral-400" />
          </div>
          <h2 className="font-['Poppins'] text-lg font-black uppercase tracking-wider text-black">
            Vaša lista želja je prazna
          </h2>
          <p className="text-xs text-neutral-600 font-['Inter']">
            Kliknite na ikonicu srca na bilo kojem artiklu u trgovini kako biste ga spremili ovdje.
          </p>
          <div className="pt-2">
            <button
              onClick={onExploreProducts}
              className="px-6 py-3.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] transition-all inline-flex items-center gap-2 border-2 border-[#0A0A0A] cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Istraži ponudu artikala</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {wishlistProducts.map((prod) => (
            <ProductCard key={prod.id} product={prod} onSelect={onSelectProduct} />
          ))}
        </div>
      )}
    </div>
  );
};
