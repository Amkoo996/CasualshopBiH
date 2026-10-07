import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, MessageCircle, Package, Phone, MapPin } from 'lucide-react';
import { Order } from '../types';

interface OrderSuccessPageProps {
  order: Order;
  onContinueShopping: () => void;
}

export const OrderSuccessPage: React.FC<OrderSuccessPageProps> = ({
  order,
  onContinueShopping,
}) => {
  useEffect(() => {
    try {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#0A0A0A', '#F7E97F', '#FFFFFF', '#10B981'],
      });
    } catch {
      // Ignore
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const whatsappMessage = encodeURIComponent(
    `Pozdrav Casual Shop BiH timu! Upravo sam kreirao narudžbu broj: ${order.orderNumber}. Ime: ${order.customer.firstName} ${order.customer.lastName}. Iznos za plaćanje pouzećem: ${order.total.toFixed(2)} KM.`
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
      <div className="bg-white border-2 border-[#F7E97F] p-6 sm:p-10 space-y-8 shadow-2xl text-center">
        {/* Success Icon & Header */}
        <div className="space-y-3">
          <div className="w-16 h-16 bg-[#F7E97F] text-[#0A0A0A] rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h1 className="font-['Poppins'] text-2xl sm:text-4xl font-black uppercase tracking-tight text-[#0A0A0A]">
            HVALA NA NARUDŽBI!
          </h1>

          {/* Exact required confirmation text */}
          <div className="p-4 bg-[#F4F2EC] border-2 border-neutral-300 max-w-lg mx-auto">
            <p className="font-['Poppins'] text-sm sm:text-base font-bold text-[#0A0A0A]">
              "Hvala na narudžbi! Kontaktirat ćemo te telefonom radi potvrde. Plaćaš kuriru pri preuzimanju."
            </p>
          </div>
        </div>

        {/* Order Number Box */}
        <div className="bg-[#0A0A0A] text-white p-5 border-2 border-[#F7E97F] max-w-md mx-auto space-y-1">
          <span className="text-[11px] font-['Poppins'] font-bold uppercase tracking-[0.2em] text-[#F7E97F] block">
            BROJ NARUDŽBE:
          </span>
          <div className="text-2xl sm:text-3xl font-['Poppins'] font-black tracking-wider text-white select-all">
            {order.orderNumber}
          </div>
          <span className="text-[10px] text-neutral-400 block">
            Sačuvaj ovaj broj za kontakt s podrškom ili zamjenu veličine
          </span>
        </div>

        {/* Customer & Delivery Summary */}
        <div className="text-left border-t-2 border-neutral-200 pt-6 space-y-4">
          <h3 className="font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] text-black">
            Podaci o dostavi
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-neutral-700 bg-[#F4F2EC] p-4 border border-neutral-300 font-['Inter']">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-neutral-500">Primalac:</span>
              <p className="font-bold text-neutral-900">
                {order.customer.firstName} {order.customer.lastName}
              </p>
              <p className="flex items-center gap-1.5 text-neutral-800">
                <Phone className="w-3.5 h-3.5 text-[#0A0A0A]" />
                {order.customer.phone}
              </p>
              {order.customer.email && <p className="text-neutral-500">{order.customer.email}</p>}
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-neutral-500">Adresa isporuke:</span>
              <p className="flex items-start gap-1.5 font-medium text-neutral-900">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#0A0A0A]" />
                <span>
                  {order.customer.address}, {order.customer.postalCode} {order.customer.city}
                </span>
              </p>
              <div className="pt-1">
                <span className="text-[10px] font-bold uppercase text-neutral-500">Plaćanje:</span>
                <p className="font-bold text-[#0A0A0A]">
                  Plaćanje pouzećem gotovinom kuriru ({order.total.toFixed(2)} KM)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Items Summary */}
        <div className="text-left border-t-2 border-neutral-200 pt-6 space-y-3">
          <h3 className="font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] text-black">
            Naručeni artikli
          </h3>
          <div className="divide-y divide-neutral-200">
            {order.items.map((item) => (
              <div key={`${item.id}-${item.size}`} className="py-2.5 flex justify-between items-center text-xs font-['Inter']">
                <div className="flex items-center gap-3">
                  <img src={item.image} alt={item.name} className="w-10 h-12 object-cover bg-neutral-100 border border-neutral-300" />
                  <div>
                    <span className="font-['Poppins'] font-bold text-neutral-900 uppercase block">{item.name}</span>
                    <span className="text-neutral-500 text-[11px]">Veličina: {item.size} • Količina: {item.quantity} kom</span>
                  </div>
                </div>
                <span className="font-['Poppins'] font-bold text-neutral-900">
                  {(item.price * item.quantity).toFixed(2)} KM
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t-2 border-neutral-200 flex justify-between items-center text-sm font-black text-black font-['Poppins']">
            <span>UKUPNO ZA PLAĆANJE POUZEĆEM:</span>
            <span className="text-lg">{order.total.toFixed(2)} KM</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-6 border-t-2 border-neutral-200 flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href={`https://wa.me/38761000000?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3.5 bg-[#0A0A0A] hover:bg-[#F7E97F] text-white hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border-2 border-[#0A0A0A]"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Pošalji potvrdu na WhatsApp</span>
          </a>

          <button
            onClick={onContinueShopping}
            className="px-6 py-3.5 bg-[#F7E97F] hover:bg-[#ebd965] text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border-2 border-[#F7E97F]"
          >
            <Package className="w-4 h-4" />
            <span>Nastavi kupovinu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
