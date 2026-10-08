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

  // Sigurna filtracija artikala (poređenje ID-jeva pretvorenih u string radi izbjegavanja nepoklapanja tipova)
  const safeWishlistIds = (wishlistIds || []).map((id) => String(id));
  const wishlistProducts = (products || []).filter((p) =>
    safeWishlistIds.includes(String(p.id))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 space-y-8 animate-fadeIn">
      {/* Top Breadcrumb & Title */}
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
            className="px-4 py-2 border border-neutral-300 hover:border-black text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-600 hover:text-black self-start sm:self-auto flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Isprazni listu</span>
          </button>
        )}
      </div>

      {/* Auth Callout for Guests */}
      {!user && wishlistProducts.length > 0 && (
        <div className="bg-[#F4F2EC] border-2 border-neutral-300 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="font-['Poppins'] font-bold text-xs uppercase tracking-wider text-black block">
              Želite trajno sačuvati listu želja na svim uređajima?
            </span>
            <p className="text-xs text-neutral-600 font-['Inter']">
              Prijavite se putem svog Google računa kako bi vaša lista ostala sinhronizovana i dostupna bilo kada.
            </p>
          </div>
          <button
            onClick={signInWithGoogle}
            className="px-4 py-2 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-bold uppercase tracking-wider flex items-center gap-2 self-start sm:self-auto shrink-0 transition-colors border border-black cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Prijavi se putem Googlea</span>
          </button>
        </div>
      )}

      {/* Products Grid or Empty State */}
      {wishlistProducts.length === 0 ? (
        <div className="bg-white border-2 border-neutral-200 p-12 sm:p-16 text-center space-y-4 max-w-xl mx-auto shadow-sm">
          <div className="w-16 h-16 bg-[#F4F2EC] text-[#0A0A0A] rounded-full flex items-center justify-center mx-auto border-2 border-neutral-300">
            <Heart className="w-8 h-8 text-neutral-400" />
          </div>
          <h2 className="font-['Poppins'] text-lg sm:text-xl font-black uppercase tracking-wider text-black">
            Vaša lista želja je prazna
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 font-['Inter'] leading-relaxed">
            Još niste sačuvali nijedan artikal. Istražite našu kolekciju majica, dukseva i kapa, pa kliknite na ikonicu srca kako biste ih dodali ovdje.
          </p>
          <div className="pt-2">
            <button
              onClick={onExploreProducts}
              className="px-6 py-3.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] transition-all inline-flex items-center gap-2 border-2 border-[#0A0A0A] shadow-md cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Istraži ponudu artikala</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {wishlistProducts.map((prod) => (
              <ProductCard
                key={prod.id}
                product={prod}
                onSelect={onSelectProduct}
              />
            ))}
          </div>

          <div className="pt-6 border-t border-neutral-200 flex justify-between items-center text-xs text-neutral-500 font-['Inter']">
            <span>Klikom na artikal otvarate detalje sa odabirom veličine i naručivanjem.</span>
            <button
              onClick={onExploreProducts}
              className="font-['Poppins'] font-bold text-black uppercase underline hover:text-[#0A0A0A] cursor-pointer"
            >
              Nastavi kupovinu →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
