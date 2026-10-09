import React from 'react';
import { X, Trash2, ArrowRight, ShoppingBag, ShieldCheck } from 'lucide-react';
import { useCart } from '../../context/CartContext';

interface CartDrawerProps {
  onCheckout: () => void;
}

// Helper funkcija za optimizaciju slika u korpi
const optimizeCloudinaryUrl = (url: string, width: number = 200) => {
  if (!url) return '';
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
  }
  return url;
};

export const CartDrawer: React.FC<CartDrawerProps> = ({ onCheckout }) => {
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    subtotal,
    shippingFee,
    total,
  } = useCart();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Pozadinski tamni overlay */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
        <div className="w-screen max-w-md bg-white border-l-2 border-neutral-300 shadow-2xl flex flex-col justify-between">
          
          {/* Header korpe */}
          <div className="p-4 sm:p-6 border-b-2 border-neutral-200 flex items-center justify-between bg-[#0A0A0A] text-white">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#F7E97F]" />
              <h2 className="font-['Poppins'] text-sm sm:text-base font-black uppercase tracking-wider text-white">
                Moja korpa ({items.length})
              </h2>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Zatvori korpu"
              aria-label="Zatvori korpu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Lista artikala */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 bg-[#F4F2EC] text-neutral-400 rounded-full flex items-center justify-center mx-auto border border-neutral-300">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <p className="font-['Poppins'] text-sm font-bold uppercase text-black">
                  Vaša korpa je prazna
                </p>
                <p className="text-xs text-neutral-500 font-['Inter'] max-w-xs mx-auto">
                  Dodajte artikle iz kolekcije kako biste završili kupovinu.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="px-6 py-3 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border border-black"
                >
                  Nastavi kupovinu
                </button>
              </div>
            ) : (
              <div className="divide-y divide-neutral-200">
                {items.map((item) => (
                  <div key={`${item.id}-${item.size}`} className="py-4 flex gap-3.5 first:pt-0">
                    <img
                      src={optimizeCloudinaryUrl(item.image || '/images/sarajevo_geo_tee.jpg', 200)}
                      alt={`${item.name} - Veličina ${item.size}`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/sarajevo_geo_tee.jpg';
                      }}
                      className="w-16 h-20 object-cover bg-neutral-100 border border-neutral-200 shrink-0"
                    />

                    <div className="flex-1 flex flex-col justify-between text-xs">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-['Poppins'] font-bold text-neutral-900 uppercase line-clamp-1 text-xs">
                            {item.name}
                          </h3>
                          <button
                            onClick={() => removeFromCart(item.id, item.size)}
                            className="text-neutral-400 hover:text-red-600 p-0.5 transition-colors cursor-pointer shrink-0"
                            title="Ukloni artikal"
                            aria-label={`Ukloni ${item.name} iz korpe`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-[11px] text-neutral-500 font-['Inter'] mt-0.5">
                          Veličina: <strong>{item.size}</strong>
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        {/* Količina selector */}
                        <div className="flex items-center border border-neutral-300 bg-white">
                          <button
                            onClick={() => updateQuantity(item.id, item.size, item.quantity - 1)}
                            className="px-2 py-0.5 font-bold hover:bg-neutral-100 text-xs cursor-pointer"
                            aria-label="Smanji količinu"
                          >
                            -
                          </button>
                          <span className="px-2.5 font-['Poppins'] font-bold text-xs">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)}
                            disabled={item.quantity >= item.maxStock}
                            className="px-2 py-0.5 font-bold hover:bg-neutral-100 text-xs disabled:opacity-30 cursor-pointer"
                            aria-label="Povećaj količinu"
                          >
                            +
                          </button>
                        </div>

                        <span className="font-['Poppins'] font-bold text-black text-xs">
                          {(item.price * item.quantity).toFixed(2)} KM
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer sa kalkulacijom i gumbom za checkout */}
          {items.length > 0 && (
            <div className="p-4 sm:p-6 border-t-2 border-neutral-200 bg-[#F4F2EC] space-y-4">
              <div className="space-y-1.5 text-xs font-['Inter']">
                <div className="flex justify-between text-neutral-600">
                  <span>Iznos artikala:</span>
                  <span className="font-['Poppins'] font-bold text-black">{subtotal.toFixed(2)} KM</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Dostava (Brza pošta BiH):</span>
                  <span className="font-['Poppins'] font-bold text-black">
                    {shippingFee === 0 ? (
                      <span className="text-emerald-700 font-black">BESPLATNO</span>
                    ) : (
                      `${shippingFee.toFixed(2)} KM`
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-black text-black pt-2 border-t border-neutral-300 font-['Poppins']">
                  <span>UKUPNO:</span>
                  <span className="text-base">{total.toFixed(2)} KM</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsCartOpen(false);
                  onCheckout();
                }}
                className="w-full py-3.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border-2 border-[#0A0A0A] cursor-pointer shadow-lg active:scale-95"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>NASTAVI NA CHECKOUT</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-[10px] text-center text-neutral-500 font-['Inter']">
                Plaćanje pouzećem gotovinom prilikom preuzimanja od kurira.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
