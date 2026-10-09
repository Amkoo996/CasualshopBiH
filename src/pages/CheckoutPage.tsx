import React, { useState } from 'react';
import { ArrowLeft, ShoppingBag, ShieldCheck, Truck, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { createOrder } from '../lib/db';
import { Order } from '../types';

interface CheckoutPageProps {
  onBack: () => void;
  onOrderSuccess: (order: Order) => void;
  onNavigateToPage: (page: string) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  onBack,
  onOrderSuccess,
  onNavigateToPage,
}) => {
  const { cart, totalAmount, discount, promoCode, clearCart, settings } = useCart();

  const [customerName, setCustomerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [note, setNote] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'shipping' | 'pickup'>('shipping');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const shippingFee = deliveryMethod === 'pickup' 
    ? 0 
    : (totalAmount >= (settings.freeShippingThreshold || 100) ? 0 : (settings.shippingFee || 12));

  const finalTotal = Math.max(0, totalAmount + shippingFee);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!agreedToTerms) {
      setErrorMsg('Molimo potvrdite da se slažete sa uslovima kupovine i procedurom povrata.');
      return;
    }

    if (!customerName.trim() || !phone.trim()) {
      setErrorMsg('Molimo popunite obavezna polja (Ime i prezime, Broj telefona).');
      return;
    }

    if (deliveryMethod === 'shipping' && (!address.trim() || !city.trim())) {
      setErrorMsg('Za dostavu brzom poštom obavezno unesite adresu i grad.');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderData: Partial<Order> = {
        customerName,
        email: email.trim() || 'Nije uneseno',
        phone,
        address: deliveryMethod === 'pickup' ? 'Lično preuzimanje u Sarajevu' : address,
        city: deliveryMethod === 'pickup' ? 'Sarajevo' : city,
        postalCode: deliveryMethod === 'pickup' ? '71000' : postalCode,
        note,
        items: cart,
        subtotal: totalAmount + discount,
        discount,
        promoCode,
        shippingFee,
        totalAmount: finalTotal,
        paymentMethod: 'cod',
        deliveryMethod,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      const createdOrder = await createOrder(orderData as any);

      // Slanje e-mail obavijesti prodavcu i kupcu
      try {
        const itemsSummary = cart
          .map((i) => `• ${i.name} (${i.size}) x${i.quantity} = ${(i.price * i.quantity).toFixed(2)} KM`)
          .join('\n');

        await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: 'service_h4rxrv2',
            template_id: 'template_b7r6ees',
            user_id: 'mPKyquhWRcGkRq4gS',
            template_params: {
              order_number: createdOrder.id?.slice(-6).toUpperCase() || 'NOVA-NARUDZBA',
              customer_name: customerName,
              customer_phone: phone,
              customer_email: email || 'Nije uneseno',
              customer_address: deliveryMethod === 'pickup' ? 'Lično preuzimanje u Sarajevu' : `${address}, ${city}`,
              customer_note: note || 'Nema napomene',
              items_summary: itemsSummary,
              total_amount: `${finalTotal.toFixed(2)} KM`,
              shipping_fee: `${shippingFee.toFixed(2)} KM`,
              reply_to: email.trim() || settings.email || 'info@casualshop.ba',
            },
          }),
        });
      } catch (mailErr) {
        console.warn('E-mail obavijest narudžbe nije poslana:', mailErr);
      }

      clearCart();
      onOrderSuccess(createdOrder);
    } catch (err: any) {
      console.error('Greška pri kreiranju narudžbe:', err);
      setErrorMsg('Došlo je do greške prilikom obrade narudžbe. Pokušajte ponovo ili nas kontaktirajte.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <ShoppingBag className="w-12 h-12 text-neutral-400 mx-auto" />
        <h2 className="font-['Poppins'] text-2xl font-black uppercase text-black">Vaša korpa je prazna</h2>
        <p className="text-xs text-neutral-500 font-['Inter']">Dodajte artikle u korpu prije odlaska na checkout.</p>
        <button
          onClick={onBack}
          className="px-6 py-3 bg-[#0A0A0A] text-white font-['Poppins'] text-xs uppercase font-bold tracking-wider hover:bg-[#F7E97F] hover:text-[#0A0A0A] transition-colors cursor-pointer"
        >
          Nazad na prodavnicu
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 font-['Inter']">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-600 hover:text-black mb-8 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Nazad na korpu</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Lijeva kolona: Checkout Forma */}
        <div className="lg:col-span-7 space-y-8">
          <div>
            <h1 className="font-['Poppins'] text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#0A0A0A]">
              ZAVRŠETAK NARUDŽBE
            </h1>
            <p className="text-xs text-neutral-500 mt-1">Unesite vaše podatke za dostavu i potvrdu narudžbe.</p>
          </div>

          <form onSubmit={handleSubmitOrder} className="space-y-6">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-300 text-red-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Način dostave */}
            <div className="space-y-3 bg-white p-5 border-2 border-neutral-200">
              <span className="font-['Poppins'] text-xs font-black uppercase tracking-wider text-black block">
                1. NAČIN ISPORUKE
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  onClick={() => setDeliveryMethod('shipping')}
                  className={`p-3.5 border-2 flex items-start gap-3 cursor-pointer transition-all ${
                    deliveryMethod === 'shipping'
                      ? 'border-[#0A0A0A] bg-[#F7E97F]/10'
                      : 'border-neutral-200 hover:border-neutral-400 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="delivery"
                    checked={deliveryMethod === 'shipping'}
                    onChange={() => setDeliveryMethod('shipping')}
                    className="mt-0.5 accent-black"
                  />
                  <div>
                    <span className="font-['Poppins'] font-bold text-xs uppercase block text-black">
                      Brza pošta (BiH)
                    </span>
                    <span className="text-[11px] text-neutral-500 block mt-0.5">
                      {totalAmount >= (settings.freeShippingThreshold || 100) ? 'BESPLATNO' : `${settings.shippingFee || 12} KM`} (48-72h)
                    </span>
                  </div>
                </label>

                <label
                  onClick={() => setDeliveryMethod('pickup')}
                  className={`p-3.5 border-2 flex items-start gap-3 cursor-pointer transition-all ${
                    deliveryMethod === 'pickup'
                      ? 'border-[#0A0A0A] bg-[#F7E97F]/10'
                      : 'border-neutral-200 hover:border-neutral-400 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="delivery"
                    checked={deliveryMethod === 'pickup'}
                    onChange={() => setDeliveryMethod('pickup')}
                    className="mt-0.5 accent-black"
                  />
                  <div>
                    <span className="font-['Poppins'] font-bold text-xs uppercase block text-black">
                      Lično preuzimanje u Sarajevu
                    </span>
                    <span className="text-[11px] text-emerald-700 font-bold block mt-0.5">
                      0.00 KM (Po dogovoru)
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* 2. Podaci o kupcu */}
            <div className="space-y-4 bg-white p-5 border-2 border-neutral-200">
              <span className="font-['Poppins'] text-xs font-black uppercase tracking-wider text-black block">
                2. PODACI ZA DOSTAVU
              </span>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-['Poppins'] font-bold uppercase text-neutral-700 mb-1">
                    Ime i prezime *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="npr. Haris Hodžić"
                    className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs focus:bg-white focus:border-black focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-['Poppins'] font-bold uppercase text-neutral-700 mb-1">
                      Broj telefona (za kurira) *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="npr. 061 234 567"
                      className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs focus:bg-white focus:border-black focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-['Poppins'] font-bold uppercase text-neutral-700 mb-1">
                      E-mail adresa (opciono)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="npr. haris@gmail.com"
                      className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs focus:bg-white focus:border-black focus:outline-none"
                    />
                  </div>
                </div>

                {deliveryMethod === 'shipping' && (
                  <>
                    <div>
                      <label className="block font-['Poppins'] font-bold uppercase text-neutral-700 mb-1">
                        Adresa stanovanja i broj *
                      </label>
                      <input
                        type="text"
                        required={deliveryMethod === 'shipping'}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="npr. Zmaja od Bosne 12"
                        className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs focus:bg-white focus:border-black focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-['Poppins'] font-bold uppercase text-neutral-700 mb-1">
                          Grad *
                        </label>
                        <input
                          type="text"
                          required={deliveryMethod === 'shipping'}
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="npr. Tuzla"
                          className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs focus:bg-white focus:border-black focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-['Poppins'] font-bold uppercase text-neutral-700 mb-1">
                          Poštanski broj
                        </label>
                        <input
                          type="text"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          placeholder="npr. 75000"
                          className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs focus:bg-white focus:border-black focus:outline-none"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block font-['Poppins'] font-bold uppercase text-neutral-700 mb-1">
                    Napomena za narudžbu / kurira (opciono)
                  </label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Npr. Pozvati prije isporuke, zvono ne radi..."
                    className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs focus:bg-white focus:border-black focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            {/* 3. Način plaćanja */}
            <div className="space-y-3 bg-white p-5 border-2 border-neutral-200">
              <span className="font-['Poppins'] text-xs font-black uppercase tracking-wider text-black block">
                3. NAČIN PLAĆANJA
              </span>

              <div className="p-4 bg-[#0A0A0A] text-white border-2 border-[#F7E97F] flex items-center justify-between">
                <div>
                  <span className="font-['Poppins'] font-bold text-xs uppercase block text-[#F7E97F]">
                    PLAĆANJE POUZEĆEM (GOTOVINOM KURIRU)
                  </span>
                  <span className="text-[11px] text-neutral-300 block mt-0.5">
                    Plaćate gotovinom kuriru brze pošte. Moguće otvaranje i pregled paketa prije preuzimanja.
                  </span>
                </div>
              </div>
            </div>

            {/* Obavezna procedura povrata (BEZ FISKALNOG RAČUNA) */}
            <div className="bg-[#F4F2EC] p-4 sm:p-5 border-2 border-neutral-300 text-xs text-neutral-800 space-y-2 font-['Inter']">
              <p className="font-['Poppins'] font-bold uppercase text-[#0A0A0A] flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#0A0A0A]" />
                <span>PROCEDURA ZA POVRAT POŠILJKE I REKLAMACIJE:</span>
              </p>
              <p className="text-neutral-700 leading-relaxed">
                Pri primitku robe provjera ispravnosti narudžbe ovisi o kupcu. Molimo Vas da uporedite primljene artikle sa narudžbom, te ukoliko nešto nedostaje odmah to napomenite Vašem dostavljaču ili se odmah obratite direktno nama, jer naknadne reklamacije ne uvažavamo.
              </p>
              <p className="text-neutral-700 leading-relaxed">
                U slučaju povrata robe kupac je dužan uputiti opravdanu reklamaciju putem e-maila ili Instagram profila. Kupac ima pravo na povrat robe u sljedećim slučajevima:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-neutral-700 pl-2">
                <li>isporuka robe koja nije naručena</li>
                <li>isporuka robe koja ima grešku ili oštećenja koja nisu nastala u transportu</li>
              </ul>
              <p className="font-bold text-neutral-900 pt-1">
                Naručilac snosi troškove povrata robe i obavezan je artikal vratiti u originalnom nenošenom stanju.
              </p>
            </div>

            {/* Prihvatanje uslova */}
            <label className="flex items-start gap-3 cursor-pointer p-1">
              <input
                type="checkbox"
                required
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 accent-black cursor-pointer"
              />
              <span className="text-xs text-neutral-700 font-['Inter']">
                Slažem se i prihvatam{' '}
                <button
                  type="button"
                  onClick={() => onNavigateToPage('terms')}
                  className="underline font-bold text-black hover:text-neutral-600"
                >
                  uslove kupovine
                </button>
                , otvaranje paketa pri dostavi i navedenu proceduru za povrat robe.*
              </span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-[#0A0A0A] hover:bg-[#F7E97F] hover:text-[#0A0A0A] text-white font-['Poppins'] font-black text-sm uppercase tracking-[0.2em] transition-colors border-2 border-[#0A0A0A] flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>OBRADA NARUDŽBE...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>POTVRDI NARUDŽBU ({finalTotal.toFixed(2)} KM)</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Desna kolona: Pregled Korpe */}
        <div className="lg:col-span-5">
          <div className="bg-white border-2 border-neutral-300 p-6 space-y-6 sticky top-24 shadow-sm">
            <h3 className="font-['Poppins'] text-sm font-black uppercase tracking-wider text-black border-b pb-3 border-neutral-200">
              PREGLED NARUDŽBE ({cart.length})
            </h3>

            <div className="divide-y divide-neutral-200 max-h-80 overflow-y-auto pr-1 space-y-3">
              {cart.map((item) => (
                <div key={`${item.id}-${item.size}`} className="pt-3 first:pt-0 flex items-center gap-3 text-xs">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-14 object-cover bg-neutral-100 border border-neutral-300 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-['Poppins'] font-bold text-neutral-900 truncate">{item.name}</h4>
                    <p className="text-neutral-500 font-mono text-[11px]">Veličina: {item.size} • x{item.quantity}</p>
                  </div>
                  <div className="font-['Poppins'] font-bold text-black">
                    {(item.price * item.quantity).toFixed(2)} KM
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t-2 border-neutral-200 pt-4 space-y-2 text-xs font-['Inter']">
              <div className="flex justify-between text-neutral-600">
                <span>Ukupno artikli:</span>
                <span className="font-mono font-bold">{(totalAmount + discount).toFixed(2)} KM</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Popust ({promoCode}):</span>
                  <span className="font-mono">-{discount.toFixed(2)} KM</span>
                </div>
              )}

              <div className="flex justify-between text-neutral-600">
                <span>Dostava:</span>
                <span className="font-mono font-bold">
                  {deliveryMethod === 'pickup'
                    ? '0.00 KM (Sarajevo)'
                    : shippingFee === 0
                    ? 'BESPLATNO'
                    : `${shippingFee.toFixed(2)} KM`}
                </span>
              </div>

              <div className="flex justify-between text-sm font-['Poppins'] font-black text-black pt-2 border-t border-neutral-200">
                <span>ZA PLATITI:</span>
                <span className="text-base text-black">{finalTotal.toFixed(2)} KM</span>
              </div>
            </div>

            <div className="p-3 bg-[#F4F2EC] border border-neutral-300 text-[11px] text-neutral-600 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-black uppercase font-['Poppins']">
                <Truck className="w-3.5 h-3.5" />
                <span>Sigurna dostava</span>
              </div>
              <p>Paket pregledate pri preuzimanju. Plaćate gotovinom kuriru ili preuzimate lično u Sarajevu.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
