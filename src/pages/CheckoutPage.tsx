import React, { useState, useEffect } from 'react';
import { Truck, CreditCard, ShieldCheck, ArrowLeft, Lock } from 'lucide-react';
import emailjs from '@emailjs/browser';
import { useCart } from '../context/CartContext';
import { CustomerDetails, Order } from '../types';
import { createOrder } from '../lib/db';
import { trackBeginCheckout, trackPurchase } from '../lib/analytics';
import { recordCheckoutStart, recordCompletedPurchase, saveCartSession } from '../lib/tracking';

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
  const { items, subtotal, shippingFee, freeShippingThreshold, total, clearCart } = useCart();

  const [formData, setFormData] = useState<CustomerDetails>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    postalCode: '',
    note: '',
    termsAccepted: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerDetails | 'terms', string>>>({});

  useEffect(() => {
    if (items.length > 0) {
      trackBeginCheckout(items, total);
      recordCheckoutStart();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    const nextForm = { ...formData, [name]: val };
    setFormData(nextForm);
    if (errors[name as keyof CustomerDetails]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (nextForm.email || nextForm.phone) {
      saveCartSession({
        email: nextForm.email,
        phone: nextForm.phone,
        customerName: `${nextForm.firstName} ${nextForm.lastName}`.trim(),
        items,
        subtotal,
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CustomerDetails | 'terms', string>> = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'Ime je obavezno';
    if (!formData.lastName.trim()) newErrors.lastName = 'Prezime je obavezno';
    if (!formData.phone.trim()) {
      newErrors.phone = 'Broj telefona je obavezan (potreban kurirskoj službi)';
    } else if (formData.phone.trim().length < 6) {
      newErrors.phone = 'Unesite ispravan broj telefona';
    }
    if (!formData.city.trim()) newErrors.city = 'Grad je obavezan';
    if (!formData.address.trim()) newErrors.address = 'Ulica i kućni broj su obavezni';
    if (!formData.postalCode.trim()) newErrors.postalCode = 'Poštanski broj je obavezan';
    if (!formData.termsAccepted) {
      newErrors.terms = 'Morate prihvatiti Uslove korištenja i Politiku privatnosti';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (items.length === 0) return;

    setSubmitting(true);

    try {
      const orderNumber = `CS-${Math.floor(100000 + Math.random() * 900000)}`;

      const orderData: Omit<Order, 'id'> = {
        orderNumber,
        items,
        customer: formData,
        subtotal,
        shippingFee,
        total,
        paymentMethod: 'cash_on_delivery',
        status: 'Nova',
        createdAt: new Date().toISOString(),
      };

      // 1. Spremanje narudžbe i umanjivanje zalihe u jednoj transakciji
      const docId = await createOrder(orderData);
      const finalizedOrder: Order = {
        ...orderData,
        id: docId,
      };

      // 2. Trajno spremanje zadnje narudžbe u localStorage za prikaz potvrde
      localStorage.setItem('casualshop_latest_order', JSON.stringify(finalizedOrder));

      // 3. Automatsko slanje e-mail obavijesti preko EmailJS-a prema tvom predlošku
      try {
        const itemsSummary = items
          .map((i) => `- ${i.quantity}x ${i.name} (Vel: ${i.size}) = ${(i.price * i.quantity).toFixed(2)} KM`)
          .join('\n');

        await emailjs.send(
          'service_h4rxrv2',     // Tvoj Service ID
          '6ylwum8',             // Tvoj Template ID sa slike
          {
            order_number: finalizedOrder.orderNumber,
            customer_name: `${formData.firstName} ${formData.lastName}`,
            customer_phone: formData.phone,
            customer_email: formData.email || 'Nije unesen',
            customer_address: `${formData.address}, ${formData.postalCode} ${formData.city}`,
            customer_note: formData.note || 'Nema napomene',
            items_summary: itemsSummary,
            total_amount: `${finalizedOrder.total.toFixed(2)} KM`,
            shipping_fee: shippingFee === 0 ? 'BESPLATNO' : `${shippingFee.toFixed(2)} KM`,
            reply_to: formData.email || 'noreply@casualshop.ba',
          },
          'mPKyquhWRcGkRq4gS'    // Tvoj EmailJS Public Key
        );
        console.log('E-mail obavijest uspješno poslana na admin email!');
      } catch (err: any) {
        console.warn('E-mail obavijest nije poslana, ali je narudžba spremljena u bazu:', err?.message || err);
      }

      // Analytics event purchase
      trackPurchase(finalizedOrder);
      recordCompletedPurchase(finalizedOrder.orderNumber, finalizedOrder.total);

      // Clear cart
      clearCart();

      // Navigate to order confirmation
      onOrderSuccess(finalizedOrder);
    } catch (error: any) {
      console.error('Greška pri kreiranju narudžbe:', error);
      alert(error?.message || 'Došlo je do greške prilikom obrade narudžbe. Pokušajte ponovo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-['Poppins'] text-xl font-black uppercase tracking-wider text-black">
          Vaša korpa je prazna
        </h2>
        <p className="text-sm text-neutral-600 font-['Inter']">
          Nemate artikala u korpi za završetak narudžbe.
        </p>
        <button
          onClick={onBack}
          className="px-6 py-3 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-bold uppercase tracking-widest transition-colors"
        >
          Povratak na kolekciju
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-['Poppins'] font-bold uppercase tracking-widest text-neutral-600 hover:text-black mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Nazad na korpu</span>
      </button>

      <div className="mb-8">
        <h1 className="font-['Poppins'] text-2xl sm:text-3xl font-black uppercase tracking-tight text-neutral-900">
          ZAVRŠETAK NARUDŽBE (CHECKOUT)
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600 mt-1 font-['Inter']">
          Popunite podatke za dostavu brzom poštom na vašu adresu u Bosni i Hercegovini.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* LEFT COLUMN: CUSTOMER DATA & PAYMENT (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          {/* PODACI O KUPCU */}
          <div className="bg-white p-6 border-2 border-neutral-300 space-y-6 shadow-sm">
            <div className="flex items-center gap-2 border-b-2 border-neutral-200 pb-3">
              <Truck className="w-4 h-4 text-[#0A0A0A]" />
              <h2 className="font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] text-[#0A0A0A]">
                1. Podaci za dostavu u BiH
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Ime *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="npr. Haris"
                  className={`w-full bg-[#F4F2EC] border-2 p-2.5 text-xs sm:text-sm focus:bg-white focus:outline-none ${
                    errors.firstName ? 'border-red-500' : 'border-neutral-300 focus:border-black'
                  }`}
                />
                {errors.firstName && (
                  <p className="text-[11px] text-red-600 mt-1">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Prezime *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="npr. Hodžić"
                  className={`w-full bg-[#F4F2EC] border-2 p-2.5 text-xs sm:text-sm focus:bg-white focus:outline-none ${
                    errors.lastName ? 'border-red-500' : 'border-neutral-300 focus:border-black'
                  }`}
                />
                {errors.lastName && (
                  <p className="text-[11px] text-red-600 mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Broj telefona (mobitel) *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="npr. 061 234 567"
                  className={`w-full bg-[#F4F2EC] border-2 p-2.5 text-xs sm:text-sm focus:bg-white focus:outline-none ${
                    errors.phone ? 'border-red-500' : 'border-neutral-300 focus:border-black'
                  }`}
                />
                <span className="text-[10px] text-neutral-500 block mt-0.5">
                  Obavezno: kurir će vas kontaktirati prije dostave
                </span>
                {errors.phone && (
                  <p className="text-[11px] text-red-600 mt-1">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  E-mail adresa <span className="text-neutral-400 font-normal">(opciono)</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="npr. haris@gmail.com"
                  className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs sm:text-sm focus:bg-white focus:border-black focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Grad / Mjesto u BiH *
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="npr. Sarajevo, Tuzla, Zenica..."
                  className={`w-full bg-[#F4F2EC] border-2 p-2.5 text-xs sm:text-sm focus:bg-white focus:outline-none ${
                    errors.city ? 'border-red-500' : 'border-neutral-300 focus:border-black'
                  }`}
                />
                {errors.city && (
                  <p className="text-[11px] text-red-600 mt-1">{errors.city}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Poštanski broj *
                </label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  placeholder="npr. 71000"
                  className={`w-full bg-[#F4F2EC] border-2 p-2.5 text-xs sm:text-sm focus:bg-white focus:outline-none ${
                    errors.postalCode ? 'border-red-500' : 'border-neutral-300 focus:border-black'
                  }`}
                />
                {errors.postalCode && (
                  <p className="text-[11px] text-red-600 mt-1">{errors.postalCode}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                Adresa stanovanja (Ulica i kućni broj) *
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="npr. Maršala Tita 15 ili Zmaja od Bosne 22"
                className={`w-full bg-[#F4F2EC] border-2 p-2.5 text-xs sm:text-sm focus:bg-white focus:outline-none ${
                  errors.address ? 'border-red-500' : 'border-neutral-300 focus:border-black'
                }`}
              />
              {errors.address && (
                <p className="text-[11px] text-red-600 mt-1">{errors.address}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                Napomena za kurira <span className="text-neutral-400 font-normal">(opciono)</span>
              </label>
              <textarea
                name="note"
                rows={2}
                value={formData.note}
                onChange={handleChange}
                placeholder="npr. Zvati na interfon broj 6, sprat 3..."
                className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs sm:text-sm focus:bg-white focus:border-black focus:outline-none"
              />
            </div>
          </div>

          {/* NAČIN PLAĆANJA */}
          <div className="bg-white p-6 border-2 border-neutral-300 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b-2 border-neutral-200 pb-3">
              <CreditCard className="w-4 h-4 text-[#0A0A0A]" />
              <h2 className="font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] text-[#0A0A0A]">
                2. Način plaćanja
              </h2>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-4 border-2 border-[#F7E97F] bg-[#0A0A0A] text-white cursor-pointer shadow-md">
                <input
                  type="radio"
                  name="paymentOption"
                  checked={true}
                  readOnly
                  className="mt-1 accent-[#F7E97F]"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-['Poppins'] text-xs sm:text-sm font-black uppercase tracking-wider text-[#F7E97F]">
                      Plaćanje pouzećem (Gotovinom kuriru pri preuzimanju)
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 font-['Inter']">
                    Plaćaš gotovinom kuriru brze pošte tek kada paket stigne na tvoju adresu. 100% sigurno.
                  </p>
                </div>
              </label>

              <div className="flex items-start gap-3 p-4 border-2 border-dashed border-neutral-300 bg-neutral-100 opacity-60 cursor-not-allowed">
                <input
                  type="radio"
                  name="paymentOption"
                  disabled
                  className="mt-1 opacity-50 cursor-not-allowed"
                />
                <div className="space-y-1">
                  <span className="font-['Poppins'] text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-600">
                    Kartica
                  </span>
                  <p className="text-xs text-neutral-500 font-['Inter']">
                    Kartično plaćanje uskoro u ponudi.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* OBAVEZAN CHECKBOX ZA USLOVE I PRIVATNOST */}
          <div className="bg-white p-5 border-2 border-neutral-300 space-y-2">
            <label className="flex items-start gap-3 cursor-pointer select-none text-xs text-neutral-800 font-['Inter']">
              <input
                type="checkbox"
                name="termsAccepted"
                checked={formData.termsAccepted}
                onChange={handleChange}
                className="mt-0.5 w-4 h-4 accent-[#0A0A0A] cursor-pointer"
              />
              <span>
                Slažem se s{' '}
                <button
                  type="button"
                  onClick={() => onNavigateToPage('terms')}
                  className="font-bold underline text-black hover:text-[#e5d45d]"
                >
                  Uslovima korištenja
                </button>{' '}
                i{' '}
                <button
                  type="button"
                  onClick={() => onNavigateToPage('privacy')}
                  className="font-bold underline text-black hover:text-[#e5d45d]"
                >
                  Politikom privatnosti
                </button>
                .*
              </span>
            </label>
            {errors.terms && (
              <p className="text-[11px] text-red-600 pl-7">{errors.terms}</p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ORDER SUMMARY (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 border-2 border-[#F7E97F] sticky top-28 space-y-6 shadow-md">
            <h2 className="font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] text-black border-b-2 border-neutral-200 pb-3">
              Pregled narudžbe ({items.length})
            </h2>

            {/* Visual Free Shipping Progress Bar */}
            <div className="bg-[#F4F2EC] p-3.5 border-2 border-neutral-300 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-800 font-['Inter']">
                <div className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#0A0A0A] shrink-0" />
                  {subtotal >= freeShippingThreshold ? (
                    <span className="text-emerald-700 font-bold">
                      🎉 Čestitamo! Ostvarili ste BESPLATNU DOSTAVU (0 KM)!
                    </span>
                  ) : (
                    <span>
                      Dodaj još <strong className="font-['Poppins'] text-black">{(freeShippingThreshold - subtotal).toFixed(2)} KM</strong> za <strong>BESPLATNU DOSTAVU</strong>!
                    </span>
                  )}
                </div>
                <span className="font-['Poppins'] text-[10px] font-bold text-neutral-500">
                  {Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100))}%
                </span>
              </div>
              <div className="w-full bg-neutral-300 h-2 overflow-hidden">
                <div
                  className="bg-[#0A0A0A] h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (subtotal / freeShippingThreshold) * 100)}%` }}
                />
              </div>
            </div>

            {/* List of items */}
            <div className="divide-y divide-neutral-200 max-h-72 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={`${item.id}-${item.size}`} className="py-3 flex gap-3 first:pt-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-14 h-16 object-cover bg-neutral-100 shrink-0 border border-neutral-200"
                  />
                  <div className="flex-1 flex flex-col justify-between text-xs">
                    <div>
                      <h4 className="font-['Poppins'] font-bold text-neutral-900 uppercase line-clamp-1">
                        {item.name}
                      </h4>
                      <div className="text-[11px] text-neutral-500 mt-0.5 font-['Inter']">
                        Veličina: <strong>{item.size}</strong> • Količina: {item.quantity} kom
                      </div>
                    </div>
                    <div className="font-['Poppins'] font-bold text-black text-right">
                      {(item.price * item.quantity).toFixed(2)} KM
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculation */}
            <div className="space-y-2 border-t-2 border-neutral-200 pt-4 text-xs font-['Inter']">
              <div className="flex justify-between text-neutral-700">
                <span>Iznos artikala:</span>
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
              <div className="flex justify-between text-base font-black text-black pt-3 border-t-2 border-neutral-200 font-['Poppins']">
                <span className="uppercase tracking-wider">UKUPNO:</span>
                <span className="text-xl">{total.toFixed(2)} KM</span>
              </div>
              <p className="text-[11px] text-neutral-500 pt-1">
                * Besplatna dostava za sve narudžbe preko {freeShippingThreshold.toFixed(0)} KM.
              </p>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xl active:scale-[0.99] border-2 border-[#0A0A0A]"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {submitting ? 'KREIRANJE NARUDŽBE...' : 'POTVRDI NARUDŽBU (PLAĆANJE POUZEĆEM)'}
              </span>
            </button>

            <div className="pt-2 text-[11px] text-neutral-500 space-y-1">
              <p className="flex items-center gap-1.5 font-medium">
                <Lock className="w-3.5 h-3.5 text-neutral-700" />
                <span>Plaća se isključivo pouzećem pri preuzimanju paketa.</span>
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
