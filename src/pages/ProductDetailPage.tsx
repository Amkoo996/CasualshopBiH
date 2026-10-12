import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Truck,
  ShoppingBag,
  Check,
  Ruler,
  X,
  Heart,
  ZoomIn,
  Instagram,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Share2,
} from 'lucide-react';
import { Product, Size } from '../types';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { trackViewItem } from '../lib/analytics';
import { recordProductView } from '../lib/tracking';
import { ProductReviews } from '../components/shop/ProductReviews';
import { ProductCard } from '../components/shop/ProductCard';

interface ProductDetailPageProps {
  product: Product;
  allProducts?: Product[];
  onBack: () => void;
  onSelectProduct?: (product: Product) => void;
}

const SIZE_ORDER: Size[] = ['S', 'M', 'L', 'XL', 'XXL', '3XL', 'One size'];

const optimizeCloudinaryUrl = (url: string, width: number = 1000) => {
  if (!url) return '';
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
  }
  return url;
};

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  allProducts = [],
  onBack,
  onSelectProduct,
}) => {
  const { addToCart, settings, setIsCartOpen } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isSaved = isInWishlist(product.id);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<Size | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [instaCopied, setInstaCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  // Touch Swipe State
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const availableSizes = SIZE_ORDER.filter(
    (size) => product.sizes && (product.sizes[size] ?? 0) > 0
  );

  useEffect(() => {
    trackViewItem(product);
    recordProductView(product);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (availableSizes.length > 0) {
      setSelectedSize(availableSizes[0]);
    } else {
      setSelectedSize(null);
    }
  }, [product]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsZoomed(false);
        setSizeChartOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || !product.images || product.images.length <= 1) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (diff > 40) {
      setSelectedImageIndex((prev) => (prev + 1) % product.images.length);
    } else if (diff < -40) {
      setSelectedImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
    }
    setTouchStartX(null);
  };

  const totalStock = Object.values(product.sizes || {}).reduce(
    (acc, val) => acc + (val || 0),
    0
  );
  const isSoldOut = totalStock <= 0;
  const isLowStock = totalStock > 0 && totalStock < 5;
  const currentSizeStock = selectedSize ? product.sizes?.[selectedSize] ?? 0 : 0;

  const handleAddToCart = () => {
    if (!selectedSize || currentSizeStock <= 0) return;

    addToCart(product, selectedSize, quantity);
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 3500);
  };

  const handleShareClick = async () => {
    const productUrl = `${window.location.origin}/?product=${product.id}`;
    const shareData = {
      title: `${product.name} | Casual Shop BiH`,
      text: `Pogledaj ${product.name} na Casual Shop BiH po cijeni od ${product.price.toFixed(2)} KM!`,
      url: productUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Korisnik je otkazao dijeljenje:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(productUrl);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
      } catch (err) {
        console.error('Neuspješno kopiranje linka:', err);
      }
    }
  };

  const handleInstagramOrder = () => {
    const sizeText = selectedSize ? selectedSize : 'Nije odabrano';
    const totalPrice = (product.price * quantity).toFixed(2);
    
    const message = `Pozdrav! Želim naručiti artikal preko Instagrama:
----------------------------------
📦 Artikal: ${product.name}
📏 Veličina: ${sizeText}
🔢 Količina: ${quantity} kom
💰 Cijena: ${totalPrice} KM

Podaci za dostavu:
👤 Ime i Prezime: 
📞 Telefon: 
📍 Adresa i Grad: `;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(message);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = message;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }

    setInstaCopied(true);
    setTimeout(() => setInstaCopied(false), 3500);

    const instagramUsername = settings?.instagramUrl 
      ? settings.instagramUrl.replace(/\/\$/, '').split('/').pop() 
      : 'casualshop.bih';
      
    const directDmUrl = `https://ig.me/m/${instagramUsername}`;

    setTimeout(() => {
      window.open(directDmUrl, '_blank');
    }, 400);
  };

  const hasDiscount = Boolean(product.originalPrice && product.originalPrice > product.price);
  const currentImageUrl = product.images?.[selectedImageIndex] || product.images?.[0] || '/images/sarajevo_geo_tee.jpg';

  // Cross-selling: Pronalazak 4 srodna artikla
  const relatedProducts = allProducts
    .filter((p) => p.id !== product.id && !p.isHidden)
    .filter((p) => p.category === product.category || p.featured)
    .slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 font-['Inter'] relative">
      
      {/* ELEGANTNA TOAST NOTIFIKACIJA PRI DODAVANJU U KORPU */}
      {addedSuccess && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 bg-[#0A0A0A] text-white border-2 border-[#F7E97F] p-4 shadow-2xl max-w-sm w-full animate-bounce space-y-2">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <span className="font-['Poppins'] text-xs font-bold uppercase text-[#F7E97F] flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>DODANO U KORPU!</span>
            </span>
            <button onClick={() => setAddedSuccess(false)} className="text-neutral-400 hover:text-white text-xs">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <img src={currentImageUrl} alt={product.name} className="w-12 h-14 object-cover border border-neutral-700 bg-neutral-900" />
            <div className="text-xs space-y-0.5">
              <p className="font-['Poppins'] font-bold text-white uppercase line-clamp-1">{product.name}</p>
              <p className="text-neutral-400 text-[11px]">Veličina: {selectedSize} • Količina: {quantity}</p>
              <p className="font-bold text-[#F7E97F]">{(product.price * quantity).toFixed(2)} KM</p>
            </div>
          </div>
          <button
            onClick={() => {
              setAddedSuccess(false);
              setIsCartOpen(true);
            }}
            className="w-full py-2 bg-[#F7E97F] text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-wider hover:bg-[#ebd965] transition-colors mt-1 cursor-pointer"
          >
            OTVORI KORPU & CHECKOUT
          </button>
        </div>
      )}

      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-['Poppins'] font-bold uppercase tracking-widest text-neutral-600 hover:text-black mb-6 sm:mb-8 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Nazad na kolekciju</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
        {/* GALERIJA SLIKA */}
        <div className="space-y-4">
          <div 
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onClick={() => setIsZoomed(true)}
            className="relative aspect-[3/4] bg-white overflow-hidden border-2 border-neutral-300 group cursor-zoom-in touch-pan-y"
            title="Kliknite za uvećanje"
          >
            <img
              src={optimizeCloudinaryUrl(currentImageUrl, 1000)}
              alt={product.name}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/sarajevo_geo_tee.jpg';
              }}
              className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105 select-none"
            />

            {/* Strelice */}
            {product.images && product.images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors z-20 cursor-pointer backdrop-blur-xs"
                  aria-label="Prethodna slika"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex((prev) => (prev + 1) % product.images.length);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors z-20 cursor-pointer backdrop-blur-xs"
                  aria-label="Sljedeća slika"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            <div className="absolute bottom-3 right-3 bg-black/70 text-white p-2 rounded-full opacity-80 group-hover:opacity-100 transition-opacity backdrop-blur-xs z-10">
              <ZoomIn className="w-4 h-4" />
            </div>

            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10 pointer-events-none">
              {isSoldOut ? (
                <span className="bg-[#9A9A9A] text-white text-[11px] font-['Poppins'] font-black uppercase tracking-[0.2em] px-3 py-1">
                  RASPRODANO
                </span>
              ) : (
                <>
                  {isLowStock && (
                    <span className="bg-[#E63946] text-white text-[11px] font-['Poppins'] font-black uppercase tracking-[0.2em] px-3 py-1 animate-pulse">
                      POSLJEDNJI KOMADI
                    </span>
                  )}
                  {product.isNew && (
                    <span className="bg-[#0A0A0A] text-[#F7E97F] border border-[#F7E97F] text-[11px] font-['Poppins'] font-black uppercase tracking-[0.2em] px-3 py-1">
                      NOVO
                    </span>
                  )}
                </>
              )}
              {hasDiscount && (
                <span className="bg-[#F7E97F] text-[#0A0A0A] text-[11px] font-['Poppins'] font-black uppercase tracking-[0.2em] px-3 py-1">
                  AKCIJA
                </span>
              )}
            </div>
          </div>

          {product.images && product.images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative w-16 h-20 sm:w-20 sm:h-24 bg-white shrink-0 border-2 transition-all cursor-pointer ${
                    selectedImageIndex === idx
                      ? 'border-[#0A0A0A] opacity-100'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={optimizeCloudinaryUrl(img, 150)}
                    alt={`${product.name} ${idx + 1}`}
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/sarajevo_geo_tee.jpg';
                    }}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* DETALJI O PROIZVODU */}
        <div className="flex flex-col space-y-6">
          <div className="space-y-2 border-b-2 border-neutral-200 pb-5 sm:pb-6">
            <div className="flex items-center gap-3">
              <span className="text-xs font-['Poppins'] font-bold uppercase tracking-[0.25em] text-neutral-500">
                {product.category}
              </span>
              {product.color && (
                <span className="text-xs font-['Inter'] font-semibold text-neutral-600 bg-neutral-200 px-2 py-0.5">
                  Boja: {product.color}
                </span>
              )}
            </div>

            <h1 className="font-['Poppins'] text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#0A0A0A]">
              {product.name}
            </h1>

            <div className="flex items-baseline gap-3 pt-1">
              <span className="font-['Poppins'] text-2xl sm:text-3xl font-black text-[#0A0A0A]">
                {product.price.toFixed(2)} KM
              </span>
              {hasDiscount && (
                <span className="text-base font-['Inter'] text-neutral-400 line-through">
                  {product.originalPrice?.toFixed(2)} KM
                </span>
              )}
              <span className="text-[11px] font-['Poppins'] font-bold text-neutral-500 uppercase tracking-wider">
                • Plaćanje pouzećem ili lično
              </span>
            </div>
          </div>

          {/* SIZES SELECTOR */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-900">
                Dostupne veličine:
              </label>
              <button
                onClick={() => setSizeChartOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-['Poppins'] font-bold text-neutral-700 hover:text-black underline cursor-pointer"
              >
                <Ruler className="w-3.5 h-3.5 text-[#0A0A0A]" />
                <span>Tabela veličina</span>
              </button>
            </div>

            {availableSizes.length === 0 ? (
              <p className="text-xs text-red-600 font-['Poppins'] font-bold">
                Artikal je rasprodan u svim veličinama.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((size) => {
                  const isSelected = selectedSize === size;

                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setSelectedSize(size);
                        setQuantity(1);
                      }}
                      className={`min-w-12 h-11 px-3.5 text-xs font-['Poppins'] font-bold tracking-wider uppercase border-2 transition-all flex items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'bg-[#0A0A0A] text-[#F7E97F] border-[#0A0A0A]'
                          : 'bg-white text-neutral-900 border-neutral-300 hover:border-[#0A0A0A]'
                      }`}
                    >
                      <span>{size}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedSize && (
              <div className="text-xs font-medium text-neutral-600 pt-1 flex items-center gap-1.5 font-['Inter']">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Odabrana veličina: <strong>{selectedSize}</strong>
                </span>
              </div>
            )}
          </div>

          {/* QUANTITY & ADD TO CART & WISHLIST & SHARE */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-3">
              <div className="flex items-center border-2 border-neutral-300 bg-white shrink-0">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1 || isSoldOut}
                  className="px-3 py-2.5 hover:bg-neutral-100 font-bold disabled:opacity-30 cursor-pointer text-xs"
                >
                  -
                </button>
                <span className="px-3 text-xs font-['Poppins'] font-bold text-neutral-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(currentSizeStock, quantity + 1))}
                  disabled={quantity >= currentSizeStock || isSoldOut}
                  className="px-3 py-2.5 hover:bg-neutral-100 font-bold disabled:opacity-30 cursor-pointer text-xs"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isSoldOut || !selectedSize || currentSizeStock <= 0}
                className="flex-1 py-3 px-4 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-wider disabled:bg-[#9A9A9A] disabled:text-white disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 active:scale-[0.99] border-2 border-[#0A0A0A] cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {isSoldOut
                    ? 'RASPRODANO'
                    : addedSuccess
                    ? 'DODANO U KORPU!'
                    : 'DODAJ U KORPU'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                className={`py-3 px-3.5 border-2 transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                  isSaved
                    ? 'bg-[#0A0A0A] border-[#0A0A0A] text-red-500 hover:bg-neutral-900'
                    : 'bg-white border-neutral-300 text-neutral-700 hover:border-black hover:text-black'
                }`}
                title={isSaved ? 'Ukloni iz liste želja' : 'Spremi u listu želja'}
              >
                <Heart className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
              </button>

              {/* DUGME ZA DIJELJENJE (SHARE) */}
              <button
                type="button"
                onClick={handleShareClick}
                className="py-3 px-3.5 bg-white border-2 border-neutral-300 text-neutral-700 hover:border-black hover:text-black transition-all flex items-center justify-center shrink-0 cursor-pointer"
                title="Podijeli artikal"
              >
                {shareCopied ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* OBAVIJEST KAD JE LINK KOPIRAN NA DESKTOPU */}
            {shareCopied && (
              <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 p-2 text-center animate-fadeIn font-['Inter']">
                ✓ Link artikla je kopiran u međuspremnik!
              </div>
            )}

            {/* DUGME ZA INSTAGRAM BRZU NARUDŽBU */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleInstagramOrder}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white font-['Poppins'] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:opacity-90 transition-all active:scale-[0.99] border-2 border-transparent cursor-pointer"
              >
                <Instagram className="w-4 h-4 text-white shrink-0" />
                <span className="truncate">
                  {instaCopied
                    ? 'KOPIRANO! OTVARAM INSTAGRAM...'
                    : 'BRZA NARUDŽBA PREKO INSTAGRAMA'}
                </span>
              </button>
              <p className="text-[10px] text-neutral-500 text-center font-['Inter'] mt-1">
                * Klikom se detalji artikla kopiraju u poruku i otvara direktan chat na Instagramu.
              </p>
            </div>
          </div>

          {/* OPIS I NJEGA */}
          <div className="space-y-4 pt-3 border-t-2 border-neutral-200">
            {product.material && (
              <div className="bg-white p-3 border border-neutral-200">
                <span className="text-[11px] font-['Poppins'] font-bold uppercase tracking-wider text-neutral-500 block mb-0.5">
                  Materijal:
                </span>
                <p className="text-xs text-[#111111] font-semibold">{product.material}</p>
              </div>
            )}

            <div>
              <h3 className="font-['Poppins'] text-xs font-bold uppercase tracking-wider text-neutral-900 mb-1">
                Opis artikla
              </h3>
              <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed font-['Inter']">
                {product.description}
              </p>
            </div>

            {product.careInstructions && (
              <div>
                <h4 className="font-['Poppins'] text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                  Upute za njegu:
                </h4>
                <p className="text-xs text-neutral-600 font-['Inter']">{product.careInstructions}</p>
              </div>
            )}
          </div>

          <div className="bg-white p-4 border-2 border-[#F7E97F] space-y-2 text-xs text-neutral-700">
            <h4 className="font-['Poppins'] font-bold text-xs uppercase tracking-wider text-[#0A0A0A] flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#0A0A0A] shrink-0" />
              <span>Dostava i preuzimanje</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-neutral-600 font-['Inter']">
              <li>• <strong>Brza pošta BiH:</strong> Rok 48–72h. Cijena {settings.shippingFee || 12} KM (besplatno preko {settings.freeShippingThreshold || 100} KM). Obavezno otvaranje paketa prije preuzimanja.</li>
              <li>• <strong>Lično preuzimanje:</strong> Sarajevo - 0.00 KM.</li>
              <li>• <strong>Plaćanje:</strong> Pouzećem gotovinom kuriru ili pri ličnom preuzimanju.</li>
            </ul>
          </div>
        </div>
      </div>

      <ProductReviews productId={product.id} productName={product.name} />

      {/* CROSS-SELLING: SRODNI ARTIKLI (MOGLO BI TI SE SVIDJETI) */}
      {relatedProducts.length > 0 && (
        <section className="mt-16 pt-10 border-t-2 border-neutral-200 space-y-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#0A0A0A]" />
            <h2 className="font-['Poppins'] text-xl sm:text-2xl font-black uppercase tracking-tight text-[#0A0A0A]">
              Moglo bi ti se svidjeti
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((relProd) => (
              <ProductCard
                key={relProd.id}
                product={relProd}
                onSelect={(p) => {
                  if (onSelectProduct) onSelectProduct(p);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* MODAL ZA UVEĆANJE SLIKE */}
      {isZoomed && (
        <div 
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-fadeIn"
          title="Kliknite za odzumiranje"
        >
          <button
            type="button"
            onClick={() => setIsZoomed(false)}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white hover:text-[#F7E97F] p-2 rounded-full bg-black/50 border border-neutral-700 transition-colors z-50 cursor-pointer"
            title="Zatvori (Esc)"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center cursor-zoom-out">
            <img
              src={optimizeCloudinaryUrl(currentImageUrl, 1200)}
              alt={product.name}
              onClick={() => setIsZoomed(false)}
              className="max-w-full max-h-full object-contain rounded-sm border border-neutral-800 shadow-2xl select-none cursor-zoom-out"
              title="Kliknite za odzumiranje"
            />
          </div>
        </div>
      )}

      {/* TABELA VELIČINA MODAL */}
      {sizeChartOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 font-['Inter']">
          <div className="bg-white max-w-lg w-full p-6 sm:p-8 space-y-5 border-2 border-[#F7E97F] shadow-2xl relative">
            <div className="flex items-center justify-between border-b-2 border-neutral-200 pb-3">
              <div className="flex items-center gap-2">
                <Ruler className="w-5 h-5 text-[#0A0A0A]" />
                <h3 className="font-['Poppins'] text-sm font-black uppercase tracking-wider text-black">
                  Tabela veličina (cm)
                </h3>
              </div>
              <button
                onClick={() => setSizeChartOpen(false)}
                className="text-neutral-500 hover:text-black p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-neutral-700 space-y-3 leading-relaxed">
              <p>{settings.sizeGuideText || 'Sve dimenzije su izražene u centimetrima (cm).'}</p>

              <div className="overflow-x-auto border border-neutral-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#0A0A0A] text-white font-['Poppins'] font-bold uppercase">
                    <tr>
                      <th className="p-2.5">Veličina</th>
                      <th className="p-2.5">Širina prsa (cm)</th>
                      <th className="p-2.5">Dužina (cm)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 font-semibold">
                    <tr>
                      <td className="p-2.5 font-bold">S</td>
                      <td className="p-2.5">54 cm</td>
                      <td className="p-2.5">70 cm</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold">M</td>
                      <td className="p-2.5">57 cm</td>
                      <td className="p-2.5">73 cm</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold">L</td>
                      <td className="p-2.5">60 cm</td>
                      <td className="p-2.5">76 cm</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold">XL</td>
                      <td className="p-2.5">63 cm</td>
                      <td className="p-2.5">79 cm</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold">XXL</td>
                      <td className="p-2.5">66 cm</td>
                      <td className="p-2.5">82 cm</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold">3XL</td>
                      <td className="p-2.5">69 cm</td>
                      <td className="p-2.5">85 cm</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold">One size</td>
                      <td className="p-2.5" colSpan={2}>Univerzalna veličina za kape i dodatke</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSizeChartOpen(false)}
                className="w-full py-2.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Zatvori
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
