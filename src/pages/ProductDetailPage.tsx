import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Truck,
  ShoppingBag,
  Check,
  Ruler,
  X,
  Heart,
} from 'lucide-react';
import { Product, Size } from '../types';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { trackViewItem } from '../lib/analytics';
import { recordProductView } from '../lib/tracking';
import { ProductReviews } from '../components/shop/ProductReviews';

interface ProductDetailPageProps {
  product: Product;
  onBack: () => void;
}

const SIZE_ORDER: Size[] = ['S', 'M', 'L', 'XL', 'XXL', '3XL', 'One size'];

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  onBack,
}) => {
  const { addToCart, settings } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isSaved = isInWishlist(product.id);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<Size | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Filtriramo isključivo veličine koje postoje u objektu 'product.sizes' i koje imaju zalihu
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
    setTimeout(() => setAddedSuccess(false), 2500);
  };

  const hasDiscount = Boolean(product.originalPrice && product.originalPrice > product.price);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-['Poppins'] font-bold uppercase tracking-widest text-neutral-600 hover:text-black mb-8 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Nazad na kolekciju</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
        {/* GALERIJA SLIKA */}
        <div className="space-y-4">
          <div className="relative aspect-[3/4] bg-white overflow-hidden border-2 border-neutral-300">
            <img
              src={product.images?.[selectedImageIndex] || product.images?.[0] || '/images/sarajevo_geo_tee.jpg'}
              alt={product.name}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/sarajevo_geo_tee.jpg';
              }}
              className="w-full h-full object-cover object-center transition-all duration-300"
            />

            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
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
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative w-20 h-24 bg-white shrink-0 border-2 transition-all cursor-pointer ${
                    selectedImageIndex === idx
                      ? 'border-[#0A0A0A] opacity-100'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img}
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

        {/* DETALJI */}
        <div className="flex flex-col space-y-6">
          <div className="space-y-2 border-b-2 border-neutral-200 pb-6">
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

            <div className="flex items-baseline gap-3 pt-2">
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
              <div className="flex flex-wrap gap-2.5">
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
                      className={`min-w-14 h-12 px-4 text-xs font-['Poppins'] font-bold tracking-wider uppercase border-2 transition-all flex items-center justify-center cursor-pointer ${
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

          {/* QUANTITY & ADD TO CART */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center border-2 border-neutral-300 bg-white">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1 || isSoldOut}
                  className="px-3.5 py-3 hover:bg-neutral-100 font-bold disabled:opacity-30 cursor-pointer"
                >
                  -
                </button>
                <span className="px-4 text-xs font-['Poppins'] font-bold text-neutral-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(currentSizeStock, quantity + 1))}
                  disabled={quantity >= currentSizeStock || isSoldOut}
                  className="px-3.5 py-3 hover:bg-neutral-100 font-bold disabled:opacity-30 cursor-pointer"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isSoldOut || !selectedSize || currentSizeStock <= 0}
                className="flex-1 py-3.5 px-6 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] disabled:bg-[#9A9A9A] disabled:text-white disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 active:scale-[0.99] border-2 border-[#0A0A0A] cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>
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
                className={`py-3.5 px-4 border-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isSaved
                    ? 'bg-[#0A0A0A] border-[#0A0A0A] text-red-500 hover:bg-neutral-900'
                    : 'bg-white border-neutral-300 text-neutral-700 hover:border-black hover:text-black'
                }`}
                title={isSaved ? 'Ukloni iz liste želja' : 'Spremi u listu želja'}
              >
                <Heart className={`w-5 h-5 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
              </button>
            </div>

            {addedSuccess && (
              <div className="bg-white border-2 border-[#F7E97F] text-[#0A0A0A] text-xs p-3 font-semibold flex items-center gap-2 animate-fadeIn font-['Inter']">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Artikal je uspješno dodan u vašu korpu!</span>
              </div>
            )}
          </div>

          {/* OPIS I NJEGA */}
          <div className="space-y-4 pt-4 border-t-2 border-neutral-200">
            {product.material && (
              <div className="bg-white p-3.5 border border-neutral-200">
                <span className="text-[11px] font-['Poppins'] font-bold uppercase tracking-wider text-neutral-500 block mb-0.5">
                  Materijal:
                </span>
                <p className="text-xs text-[#111111] font-semibold">{product.material}</p>
              </div>
            )}

            <div>
              <h3 className="font-['Poppins'] text-xs font-bold uppercase tracking-wider text-neutral-900 mb-1.5">
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

          <div className="bg-white p-4 border-2 border-[#F7E97F] space-y-2.5 text-xs text-neutral-700">
            <h4 className="font-['Poppins'] font-bold text-xs uppercase tracking-wider text-[#0A0A0A] flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#0A0A0A]" />
              <span>Dostava i preuzimanje</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-neutral-600 font-['Inter']">
              <li>• <strong>Brza pošta BiH:</strong> Rok 48–72h. Cijena {settings.shippingFee || 12} KM (besplatno preko {settings.freeShippingThreshold || 100} KM). Obavezno otvaranje paketa prije preuzimanja.</li>
              <li>• <strong>Lično preuzimanje:</strong> Sarajevo (Alipašino polje) - 0.00 KM.</li>
              <li>• <strong>Plaćanje:</strong> Pouzećem gotovinom kuriru ili pri ličnom preuzimanju.</li>
            </ul>
          </div>
        </div>
      </div>

      <ProductReviews productId={product.id} productName={product.name} />

      {sizeChartOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
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

            <div className="text-xs text-neutral-700 space-y-3 leading-relaxed font-['Inter']">
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
                  <tbody className="divide-y divide-neutral-200 font-['Inter'] font-semibold">
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
