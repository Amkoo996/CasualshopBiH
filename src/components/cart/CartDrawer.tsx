import React from 'react';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag, Truck } from 'lucide-react';
import { useCart } from '../../context/CartContext';

interface CartDrawerProps {
  onCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onCheckout }) => {
  const {
    items,
    removeFromCart,
    updateQuantity,
    subtotal,
    shippingFee,
    freeShippingThreshold,
    total,
    isCartOpen,
    setIsCartOpen,
  } = useCart();

  if (!isCartOpen) return null;

  const amountToFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const freeShippingProgress = Math.min(100, (subtotal / freeShippingThreshold) * 100);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col animate-slideLeft border-l-2 border-[#F7E97F]">
          {/* Header */}
          <div className="p-5 bg-[#0A0A0A] text-white flex items-center justify-between border-b-2 border-[#F7E97F]">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#F7E97F]" />
              <h2 className="font-['Poppins'] text-sm font-black uppercase tracking-[0.15em] text-white">
                Vaša korpa ({items.length})
              </h2>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 text-neutral-400 hover:text-white transition-colors"
              aria-label="Zatvori korpu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress Indicator */}
          <div className="bg-[#F4F2EC] p-4 border-b border-neutral-300">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800 mb-2 font-['Inter']">
              <Truck className="w-4 h-4 text-[#0A0A0A]" />
              {amountToFreeShipping > 0 ? (
                <span>
                  Dodaj još <strong className="font-['Poppins'] text-black">{amountToFreeShipping.toFixed(2)} KM</strong> za <strong>BESPLATNU DOSTAVU</strong>!
                </span>
              ) : (
                <span className="text-emerald-700 font-bold">
                  🎉 Ostvarili ste BESPLATNU DOSTAVU širom BiH!
                </span>
              )}
            </div>
            <div className="w-full bg-neutral-300 h-2 overflow-hidden">
              <div
                className="bg-[#0A0A0A] h-full transition-all duration-300"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 divide-y divide-neutral-200">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500 space-y-4">
                <div className="w-16 h-16 bg-[#F4F2EC] border-2 border-neutral-300 flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8 text-neutral-400" />
                </div>
                <div className="space-y-1">
                  <p className="font-['Poppins'] text-sm font-bold uppercase tracking-wider text-neutral-800">
                    Vaša korpa je prazna
                  </p>
                  <p className="text-xs text-neutral-500 max-w-xs font-['Inter']">
                    Istražite našu novu casual kolekciju i izaberite svoje komade.
                  </p>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="px-6 py-2.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-bold uppercase tracking-widest transition-colors border-2 border-[#0A0A0A]"
                >
                  Započni kupovinu
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div key={`${item.id}-${item.size}`} className="py-4 flex gap-4 first:pt-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    className="w-20 h-24 object-cover bg-neutral-100 border border-neutral-300 shrink-0"
                  />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-['Poppins'] text-xs font-bold text-neutral-900 uppercase leading-snug line-clamp-2">
                          {item.name}
                        </h3>
                        <button
                          onClick={() => removeFromCart(item.id, item.size)}
                          className="text-neutral-400 hover:text-red-600 transition-colors p-1"
                          title="Ukloni iz korpe"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="mt-1 flex items-center gap-2 font-['Inter']">
                        <span className="text-[11px] font-bold bg-[#F4F2EC] px-2 py-0.5 text-neutral-800">
                          Veličina: {item.size}
                        </span>
                        <span className="font-['Poppins'] text-xs font-bold text-neutral-900">
                          {item.price.toFixed(2)} KM
                        </span>
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center border border-neutral-300">
                        <button
                          onClick={() => updateQuantity(item.id, item.size, item.quantity - 1)}
                          className="p-1.5 hover:bg-neutral-100 text-neutral-700"
                          aria-label="Smanji količinu"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-3 text-xs font-['Poppins'] font-bold text-neutral-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)}
                          disabled={item.quantity >= item.maxStock}
                          className="p-1.5 hover:bg-neutral-100 text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label="Povećaj količinu"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="font-['Poppins'] text-xs font-black text-neutral-900">
                        {(item.price * item.quantity).toFixed(2)} KM
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer calculation */}
          {items.length > 0 && (
            <div className="p-5 border-t-2 border-neutral-200 bg-[#F4F2EC] space-y-3 font-['Inter']">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-neutral-700">
                  <span>Međuzbir artikala:</span>
                  <span className="font-['Poppins'] font-bold">{subtotal.toFixed(2)} KM</span>
                </div>
                <div className="flex justify-between text-neutral-700">
                  <span>Dostava (Brza pošta BiH):</span>
                  <span className="font-['Poppins'] font-bold">
                    {shippingFee === 0 ? (
                      <span className="text-emerald-700 font-black">BESPLATNO</span>
                    ) : (
                      `${shippingFee.toFixed(2)} KM`
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-black text-black pt-2 border-t border-neutral-300 font-['Poppins']">
                  <span className="uppercase tracking-wider">UKUPNO ZA PLAĆANJE:</span>
                  <span className="text-base">{total.toFixed(2)} KM</span>
                </div>
                <p className="text-[11px] text-neutral-500 text-right pt-0.5">
                  * Plaćanje pouzećem gotovinom prilikom preuzimanja od kurira
                </p>
              </div>

              {/* Dugme: crno sa bijelim tekstom, hover žuta sa crnim tekstom */}
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  onCheckout();
                }}
                className="w-full py-4 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 active:scale-[0.99] border-2 border-[#0A0A0A] shadow-md"
              >
                <span>Nastavi na plaćanje</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
