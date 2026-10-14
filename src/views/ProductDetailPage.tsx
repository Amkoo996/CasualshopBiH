"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  ShoppingBag, 
  Truck, 
  ShieldCheck, 
  RotateCcw, 
  Check, 
  Heart, 
  X, 
  ChevronRight,
  Flame,
  Clock,
  Sparkles
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { getProductById, getProducts } from '../lib/db';
import { Product, Size } from '../types';
import { ProductReviews } from '../components/shop/ProductReviews';

export interface ProductDetailPageProps {
  productId?: string;
  product?: Product;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ 
  productId: propId, 
  product: propProduct 
}) => {
  const router = useRouter();
  const params = useParams();
  const activeId = propId || propProduct?.id || (params?.id as string);

  const { addToCart, setIsCartOpen, settings } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [product, setProduct] = useState<Product | null>(propProduct || null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(!propProduct);

  // Odabir veličine i slike
  const [selectedSize, setSelectedSize] = useState<Size | ''>('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [sizeError, setSizeError] = useState(false);

  // Skočni prozor nakon dodavanja u korpu
  const [showAddedModal, setShowAddedModal] = useState(false);

  useEffect(() => {
    async function loadProductData() {
      if (propProduct) {
        setProduct(propProduct);
        const availableSizes = Object.entries(propProduct.sizes || {})
          .filter(([_, stock]) => (stock as number) > 0)
          .map(([sz]) => sz as Size);
        if (availableSizes.length > 0) {
          setSelectedSize(availableSizes[0]);
        }

        try {
          const allProds = await getProducts();
          const related = allProds
            .filter((p) => p.id !== propProduct.id && p.category === propProduct.category && !p.isHidden)
            .slice(0, 4);
          setRelatedProducts(related);
        } catch (err) {
          console.error('Greška pri učitavanju povezanih artikala:', err);
        }
        setLoading(false);
        return;
      }

      if (!activeId) return;
      setLoading(true);
      try {
        const data = await getProductById(activeId);
        if (data) {
          setProduct(data);
          const availableSizes = Object.entries(data.sizes || {})
            .filter(([_, stock]) => (stock as number) > 0)
            .map(([sz]) => sz as Size);
          if (availableSizes.length > 0) {
            setSelectedSize(availableSizes[0]);
          }

          const allProds = await getProducts();
          const related = allProds
            .filter((p) => p.id !== data.id && p.category === data.category && !p.isHidden)
            .slice(0, 4);
          setRelatedProducts(related);
        }
      } catch (err) {
        console.error('Greška pri učitavanju artikla:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProductData();
  }, [activeId, propProduct]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#FAF9F5]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-black border-t-[#F7E97F] rounded-full animate-spin mx-auto" />
          <p className="font-['Poppins'] font-bold text-xs uppercase tracking-widest text-neutral-600">
            Učitavanje streetwear kolekcije...
          </p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#FAF9F5] px-4 font-['Inter']">
        <div className="max-w-md w-full bg-white border-2 border-black p-8 text-center space-y-4 shadow-xl">
          <h2 className="font-['Poppins'] text-lg font-black uppercase text-black">
            Traženi artikal nije pronađen
          </h2>
          <p className="text-xs text-neutral-600">
            Moguće je da je artikal rasprodan ili uklonjen iz ponude.
          </p>
          <Link
            href="/shop"
            className="inline-block px-6 py-2.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Pregledaj sve artikle
          </Link>
        </div>
      </div>
    );
  }

  const isFavorite = isInWishlist(product.id);
  const images = product.images && product.images.length > 0 ? product.images : ['/hero-streetwear.webp'];
  const currentStock = selectedSize && product.sizes ? (product.sizes[selectedSize] ?? 0) : 0;
  const isSoldOut = Object.values(product.sizes || {}).every((s) => (s as number) <= 0);

  const handleAddToCart = () => {
    if (!selectedSize) {
      setSizeError(true);
      return;
    }
    setSizeError(false);

    addToCart(product, selectedSize as Size, quantity);
    setShowAddedModal(true);
  };

  return (
    <div className="bg-[#FAF9F5] text-neutral-900 min-h-screen py-6 sm:py-12 font-['Inter']">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Navigacijski link "Nazad" */}
        <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-600 hover:text-black transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Nazad u kolekciju</span>
          </button>

          <div className="flex items-center gap-2 text-[11px] font-['Poppins'] text-neutral-400 uppercase">
            <Link href="/" className="hover:text-black">Početna</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/shop" className="hover:text-black">{product.category}</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-black font-bold truncate max-w-[150px] sm:max-w-xs">{product.name}</span>
          </div>
        </div>

        {/* Glavna sekcija artikla */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-14 items-start">
          
          {/* GALERIJA SLIKA */}
          <div className="space-y-4">
            <div className="relative aspect-4/5 w-full bg-white border-2 border-neutral-200 overflow-hidden shadow-sm">
              <img
                src={images[selectedImageIndex] || images[0]}
                alt={product.name}
                className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
              />

              {product.isNew && (
                <span className="absolute top-3 left-3 bg-[#0A0A0A] text-[#F7E97F] border border-[#F7E97F] text-[10px] font-['Poppins'] font-black uppercase px-2.5 py-1 tracking-wider">
                  NOVI DROP
                </span>
              )}

              {product.originalPrice && product.originalPrice > product.price && (
                <span className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-['Poppins'] font-black uppercase px-2 py-1">
                  AKCIJA
                </span>
              )}
            </div>

            {/* Sličice (Thumbnails) */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative w-18 h-22 sm:w-20 sm:h-24 bg-white border-2 overflow-hidden shrink-0 transition-all cursor-pointer ${
                      selectedImageIndex === idx ? 'border-black ring-2 ring-[#F7E97F]' : 'border-neutral-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`${product.name} - ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* DETALJI I NARUČIVANJE */}
          <div className="space-y-6">
            <div>
              <span className="text-[11px] font-['Poppins'] font-black uppercase tracking-[0.2em] text-[#0A0A0A] bg-[#F7E97F] px-2 py-0.5 inline-block mb-2">
                {product.category}
              </span>
              <h1 className="font-['Poppins'] text-2xl sm:text-3xl font-black uppercase tracking-tight text-black leading-tight">
                {product.name}
              </h1>

              <div className="flex items-center gap-3 mt-3">
                <span className="font-['Poppins'] text-2xl font-black text-black">
                  {product.price.toFixed(2)} KM
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-sm font-['Poppins'] font-bold text-neutral-400 line-through">
                    {product.originalPrice.toFixed(2)} KM
                  </span>
                )}
                <span className="text-xs text-neutral-500 font-medium">
                  • Plaćanje pouzećem
                </span>
              </div>
            </div>

            {/* Odabir veličine */}
            <div className="space-y-2.5 pt-2 border-t border-neutral-200">
              <div className="flex justify-between items-center text-xs">
                <span className="font-['Poppins'] font-bold uppercase text-black">
                  Odaberite veličinu:
                </span>
                {sizeError && (
                  <span className="text-red-600 font-bold text-[11px] animate-pulse">
                    Molimo izaberite veličinu!
                  </span>
                )}
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {['S', 'M', 'L', 'XL', 'XXL', '3XL'].map((sz) => {
                  const stock = product.sizes ? (product.sizes[sz as Size] ?? 0) : 0;
                  const isAvailable = stock > 0;
                  const isSelected = selectedSize === sz;

                  return (
                    <button
                      key={sz}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => {
                        setSelectedSize(sz as Size);
                        setSizeError(false);
                      }}
                      className={`py-2.5 border-2 text-xs font-['Poppins'] font-black uppercase transition-all cursor-pointer ${
                        !isAvailable
                          ? 'bg-neutral-100 text-neutral-300 border-neutral-200 line-through cursor-not-allowed'
                          : isSelected
                          ? 'bg-[#0A0A0A] text-[#F7E97F] border-[#0A0A0A] shadow-md'
                          : 'bg-white text-black border-neutral-300 hover:border-black'
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>

              {selectedSize && (
                <p className="text-[11px] text-neutral-500">
                  Stanje za veličinu {selectedSize}:{' '}
                  <strong className={currentStock > 0 ? 'text-black' : 'text-red-600'}>
                    {currentStock > 0 ? `${currentStock} komada na stanju` : 'Trenutno rasprodano'}
                  </strong>
                </p>
              )}
            </div>

            {/* Količina i dugme za dodavanje */}
            <div className="space-y-3 pt-2">
              <div className="flex gap-3">
                <div className="flex items-center border-2 border-neutral-300 bg-white">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-3 py-2 text-sm font-bold hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    -
                  </button>
                  <span className="px-4 font-['Poppins'] font-bold text-xs">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(currentStock || 10, q + 1))}
                    className="px-3 py-2 text-sm font-bold hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  disabled={isSoldOut || (selectedSize !== '' && currentStock <= 0)}
                  onClick={handleAddToCart}
                  className="flex-1 py-3.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border-2 border-[#0A0A0A] shadow-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-98"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{isSoldOut ? 'RASPRODANO' : 'DODAJ U KORPU'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleWishlist(product.id)}
                  className={`p-3.5 border-2 border-neutral-300 transition-colors cursor-pointer ${
                    isFavorite ? 'bg-red-50 text-red-600 border-red-300' : 'bg-white text-neutral-600 hover:text-black'
                  }`}
                  title="Spremi u favorite"
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-600' : ''}`} />
                </button>
              </div>

              {/* Informacije o povjerenju */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-4 border-t border-neutral-200 text-[11px] text-neutral-700">
                <div className="flex items-center gap-2 p-2.5 bg-white border border-neutral-200">
                  <Truck className="w-4 h-4 text-black shrink-0" />
                  <span>Dostava 24–48h širom BiH</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-white border border-neutral-200">
                  <ShieldCheck className="w-4 h-4 text-black shrink-0" />
                  <span>Pregled paketa prije plaćanja</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-white border border-neutral-200">
                  <RotateCcw className="w-4 h-4 text-black shrink-0" />
                  <span>Zamjena veličine unutar 14 dana</span>
                </div>
              </div>
            </div>

            {/* Opis i karakteristike materijala */}
            <div className="space-y-4 pt-4 border-t border-neutral-200 text-xs text-neutral-700 leading-relaxed">
              <div>
                <h3 className="font-['Poppins'] font-black uppercase text-black mb-1.5 text-xs">
                  Opis artikla:
                </h3>
                <p>{product.description || 'Premium streetwear casual kroj. Vrhunska udobnost i postojanost materijala.'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-white p-3.5 border border-neutral-200">
                <div>
                  <span className="font-bold text-black block">Materijal:</span>
                  <span>{product.material || '100% češljani pamuk 240 GSM'}</span>
                </div>
                <div>
                  <span className="font-bold text-black block">Boja:</span>
                  <span>{product.color || 'Crna'}</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-neutral-100">
                  <span className="font-bold text-black block">Održavanje:</span>
                  <span>{product.careInstructions || 'Prati na 30°C izvrnuto, ne peglati preko štampe'}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* RECENZIJE KUPACA */}
        <div className="pt-8 border-t-2 border-neutral-200">
          <ProductReviews productId={product.id} />
        </div>

        {/* PREPORUČENI ARTIKLI */}
        {relatedProducts.length > 0 && (
          <div className="space-y-6 pt-8 border-t-2 border-neutral-200">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-[10px] font-['Poppins'] font-black uppercase tracking-[0.2em] text-[#0A0A0A] bg-[#F7E97F] px-2 py-0.5">
                  PREPORUKA ZA VAS
                </span>
                <h2 className="font-['Poppins'] text-xl sm:text-2xl font-black uppercase tracking-tight text-black mt-1">
                  Povezani artikli iz kolekcije
                </h2>
              </div>
              <Link
                href="/shop"
                className="text-xs font-['Poppins'] font-bold uppercase text-black hover:text-amber-700 underline"
              >
                Pogledaj sve →
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/proizvod/${rel.id}`}
                  className="group bg-white border-2 border-neutral-200 p-3 flex flex-col justify-between hover:border-black transition-all"
                >
                  <div className="aspect-4/5 w-full bg-neutral-100 overflow-hidden mb-3">
                    <img
                      src={rel.images?.[0] || '/hero-streetwear.webp'}
                      alt={rel.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">{rel.category}</span>
                    <h4 className="font-['Poppins'] font-bold text-xs text-black truncate">{rel.name}</h4>
                    <p className="font-['Poppins'] font-black text-xs text-black mt-1">{rel.price.toFixed(2)} KM</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* SKOČNI PROZOR NAKON DODAVANJA U KORPU */}
      {showAddedModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-6 border-2 border-[#0A0A0A] shadow-2xl space-y-5 animate-fadeIn">
            
            <div className="flex justify-between items-start border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-700 font-['Poppins'] font-bold text-xs uppercase">
                <div className="w-5 h-5 bg-emerald-100 text-emerald-700 flex items-center justify-center rounded-full">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span>Uspješno dodano u vašu korpu!</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddedModal(false)}
                className="text-neutral-400 hover:text-black cursor-pointer p-1"
                aria-label="Zatvori prozor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-3 bg-[#FAF9F5] p-3.5 border border-neutral-200">
              <img
                src={images[0] || '/hero-streetwear.webp'}
                alt={product.name}
                className="w-14 h-16 object-cover bg-white border border-neutral-200 shrink-0"
              />
              <div className="min-w-0 flex-1 text-xs">
                <h4 className="font-['Poppins'] font-bold text-black truncate">{product.name}</h4>
                <p className="text-neutral-600 mt-0.5">Veličina: <strong>{selectedSize}</strong></p>
                <p className="font-['Poppins'] font-black text-black mt-1">
                  {quantity} × {product.price.toFixed(2)} KM
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowAddedModal(false);
                  setIsCartOpen(true);
                }}
                className="w-full py-3 bg-[#F7E97F] text-black font-['Poppins'] text-xs font-black uppercase tracking-wider hover:bg-yellow-300 border-2 border-black transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Otvori korpu & završi narudžbu</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAddedModal(false);
                  router.push('/checkout');
                }}
                className="w-full py-2.5 bg-[#0A0A0A] text-white font-['Poppins'] text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Direktno na plaćanje pouzećem →</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddedModal(false)}
                className="w-full py-2 text-neutral-500 hover:text-black text-xs font-['Poppins'] font-bold uppercase transition-colors cursor-pointer text-center block"
              >
                Nastavi kupovinu
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};