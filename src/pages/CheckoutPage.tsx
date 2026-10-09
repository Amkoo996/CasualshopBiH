import React, { useState, useEffect } from 'react';
import { Truck, CreditCard, ShieldCheck, ArrowLeft, Loader2, MapPin, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { CustomerDetails, Order } from '../types';
import { createOrder } from '../lib/db';
import { trackBeginCheckout, trackPurchase } from '../lib/analytics';
import { recordCheckoutStart, recordCompletedPurchase, saveCartSession } from '../lib/tracking';
import { validateAndApplyPromoCode, markPromoCodeAsUsed, createPromoCode } from '../lib/promo';
import { normalizePhone, isValidEmail, isValidName, isValidPostalCode } from '../lib/validation';

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
  const { items, subtotal, shippingFee, clearCart, settings } = useCart();

  const [deliveryMethod, setDeliveryMethod] = useState<'courier' | 'pickup'>('courier');
  const [pickupTime, setPickupTime] = useState('');

  const [formData, setFormData] = useState<CustomerDetails & { bot_field?: string }>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    city: 'Sarajevo',
    address: '',
    postalCode: '71000',
    note: '',
    termsAccepted: false,
    bot_field: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerDetails | 'terms' | 'pickupTime', string>>>({});

  // Promo Code State
  const [promoInput, setPromoInput] = useState('');
  const [promoDiscountPercent, setPromoDiscountPercent] = useState(0);
  const [appliedPromoCode, setAppliedPromoCode] = useState('');
  const [promoValidating, setPromoValidating] = useState(false);
  const [promoMessage, setPromoMessage] = useState<{ text: string; error: boolean } | null>(null);

  // Izračun konačnih iznosa
  const activeShippingFee = deliveryMethod === 'pickup' ? 0 : shippingFee;
  const discountAmount = Number(((subtotal * promoDiscountPercent) / 100).toFixed(2));
  const finalSubtotal = Number((subtotal - discountAmount).toFixed(2));
  const calculatedTotal = Number((finalSubtotal + activeShippingFee).toFixed(2));

  useEffect(() => {
    if (items.length > 0) {
      trackBeginCheckout(items, calculatedTotal);
      recordCheckoutStart();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    const nextForm = { ...formData, [name]: val };
    setFormData(nextForm);

    if (errors[name as keyof CustomerDetails]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }

    if (submitError) setSubmitError(null);

    if (nextForm.email || nextForm.phone) {
      saveCartSession({
        email: nextForm.email,
        phone: nextForm.phone,
        customerName: `${nextForm.firstName} ${nextForm.lastName}`.trim(),
        items,
        subtotal: calculatedTotal,
      });
    }
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoValidating(true);
    setPromoMessage(null);

    const result = await validateAndApplyPromoCode(promoInput);
    if (result.valid) {
      setPromoDiscountPercent(result.discountPercent);
      setAppliedPromoCode(promoInput.trim().toUpperCase());
      setPromoMessage({ text: result.message, error: false });
    } else {
      setPromoMessage({ text: result.message, error: true });
    }
    setPromoValidating(false);
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CustomerDetails | 'terms' | 'pickupTime', string>> = {};

    if (!isValidName(formData.firstName)) newErrors.firstName = 'Unesite ispravno ime (samo slova)';
    if (!isValidName(formData.lastName)) newErrors.lastName = 'Unesite ispravno prezime (samo slova)';

    if (!formData.phone.trim()) {
      newErrors.phone = 'Broj telefona je obavezan';
    } else if (!normalizePhone(formData.phone)) {
      newErrors.phone = 'Unesite ispravan broj telefona, npr. 061 123 456';
    }

    const mail = formData.email.trim();
    if (mail && !isValidEmail(mail)) {
      newErrors.email = 'Unesite ispravnu e-mail adresu';
    }

    if (deliveryMethod === 'courier') {
      if (formData.city.trim().length < 2) newErrors.city = 'Grad je obavezan';
      if (formData.address.trim().length < 5) newErrors.address = 'Unesite ulicu i kućni broj';
      
      if (formData.postalCode.trim() && !isValidPostalCode(formData.postalCode)) {
        newErrors.postalCode = 'Poštanski broj mora imati tačno 5 cifara (npr. 71000)';
      }
    } else {
      if (!pickupTime.trim()) {
        newErrors.pickupTime = 'Molimo navedite željeni dan i okvirno vrijeme preuzimanja';
      }
    }

    if (!formData.termsAccepted) {
      newErrors.terms = 'Morate prihvatiti uslove kupovine i proceduru povrata';
    }

    setErrors(newErrors);

    const firstKey = Object.keys(newErrors)[0];
    if (firstKey) {
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(`[name="${firstKey}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus();
      });
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // HONEYPOT PROVJERA: Ako je bot popunio skriveno polje
    if (formData.bot_field) {
      return;
    }
    
    if (submitting) return;
    if (!validate()) return;
    if (items.length === 0) return;

    const lastOrderTime = localStorage.getItem('casualshop_last_order_time');
    if (lastOrderTime && Date.now() - parseInt(lastOrderTime) < 30000) {
      setSubmitError('Molimo sačekajte 30 sekundi prije nove narudžbe.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const date = new Date();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
      const orderNumber = `CS-${mm}${dd}-${randomStr}`;

      const cleanPhone = normalizePhone(formData.phone) || formData.phone.trim();
      const cleanEmail = formData.email.trim().toLowerCase();

      const noteDetails = deliveryMethod === 'pickup'
        ? `LIČNO PREUZIMANJE (Sarajevo). Željeno vrijeme: ${pickupTime}. ${formData.note.trim()}`
        : formData.note.trim();

      const orderData: Omit<Order, 'id'> = {
        orderNumber,
        items,
        customer: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: cleanPhone,
          email: cleanEmail,
          address: deliveryMethod === 'pickup' ? 'Lično preuzimanje - Sarajevo' : formData.address.trim(),
          city: deliveryMethod === 'pickup' ? 'Sarajevo' : formData.city.trim(),
          postalCode: deliveryMethod === 'pickup' ? '71000' : formData.postalCode.trim(),
          note: noteDetails.substring(0, 300),
          termsAccepted: formData.termsAccepted,
        },
        subtotal: finalSubtotal,
        shippingFee: activeShippingFee,
        total: calculatedTotal,
        paymentMethod: 'cash_on_delivery',
        status: 'Nova',
        createdAt: new Date().toISOString(),
        ...(appliedPromoCode ? { promoCode: appliedPromoCode, discountAmount } : {}),
      };

      const docId = await createOrder(orderData);
      const finalizedOrder: Order = {
        ...orderData,
        id: docId,
      };

      if (appliedPromoCode) {
        try {
          await markPromoCodeAsUsed(appliedPromoCode);
        } catch (err) {
          console.warn('Upozorenje: Promo kod primijenjen ali nije označen kao iskorišten:', err);
        }
      }

      let nextPromoCode = '';
      if (cleanEmail) {
        try {
          const nextPromo = await createPromoCode(cleanEmail, 'post_purchase', 30 * 24);
          nextPromoCode = nextPromo.code;
        } catch (err) {
          console.warn('Greška pri kreiranju narednog koda:', err);
        }
      }

      localStorage.setItem('casualshop_latest_order', JSON.stringify(finalizedOrder));
      localStorage.setItem('casualshop_last_order_time', Date.now().toString());

      // Slanje e-mail obavijesti preko EmailJS
      const fallbackSellerEmail = settings?.email || 'info@casualshop.ba';
      try {
        const itemsSummary = items
          .map((i) => `- ${i.quantity}x ${i.name} (Vel: ${i.size}) = ${(i.price * i.quantity).toFixed(2)} KM`)
          .join('\n');

        const promoNote = nextPromoCode
          ? `\n\nHVALA NA KUPOVINI! Tvoj promo kod od 10% za narednu narudžbu (važi 30 dana): ${nextPromoCode}`
          : '';

        const recipientEmail = cleanEmail && cleanEmail.includes('@')
          ? cleanEmail
          : fallbackSellerEmail;

        const emailRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            service_id: 'service_h4rxrv2',
            template_id: 'template_b7r6ees', // TEMPLATE 1: Za transakcije i narudžbe
            user_id: 'mPKyquhWRcGkRq4gS',
            template_params: {
              order_number: finalizedOrder.orderNumber,
              customer_name: `${formData.firstName} ${formData.lastName}`,
              customer_phone: cleanPhone,
              customer_email: recipientEmail,
              customer_address: finalizedOrder.customer.address,
              customer_note: (noteDetails || 'Nema napomene') + promoNote,
              items_summary: itemsSummary,
              total_amount: `${finalizedOrder.total.toFixed(2)} KM`,
              shipping_fee: activeShippingFee === 0 ? 'BESPLATNO (Lično preuzimanje / Prag)' : `${activeShippingFee.toFixed(2)} KM`,
              reply_to: cleanEmail || fallbackSellerEmail,
            },
          }),
        });

        if (!emailRes.ok) {
          console.warn('EmailJS obavijest nije uspješno poslata:', await emailRes.text());
        }
      } catch (err: any) {
        console.warn('Greška pri slanju e-maila:', err);
      }

      trackPurchase(finalizedOrder);
      recordCompletedPurchase(finalizedOrder.orderNumber, finalizedOrder.total);

      clearCart();
      onOrderSuccess(finalizedOrder);
    } catch (error: any) {
      console.error('Greška pri kreiranju narudžbe:', error);
      setSubmitError(error?.message || 'Došlo je do greške prilikom obrade narudžbe. Osvježite stranicu i pokušajte ponovo.');
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
          className="px-6 py-3 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer"
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
        className="inline-flex items-center gap-2 text-xs font-[#Poppins] font-bold uppercase tracking-widest text-neutral-600 hover:text-black mb-8 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Nazad na korpu</span>
      </button>

      <div className="mb-8">
        <h1 className="font-['Poppins'] text-2xl sm:text-3xl font-black uppercase tracking-tight text-neutral-900">
          ZAVRŠETAK NARUDŽBE (CHECKOUT)
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600 mt-1 font-['Inter']">
          Izaberite način preuzimanja i unesite podatke za narudžbu.
        </p>
      </div>

      {submitError && (
        <div className="mb-8 p-4 bg-red-50 border-2 border-red-500 text-red-800 text-xs font-['Inter'] flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span className="font-semibold">{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-8">
          
          {/* ODABIR DOSTAVE */}
          <div className="bg-white p-6 border-2 border-neutral-300 space-y-4 shadow-sm">
            <h2 className="font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] text-[#0A0A0A] border-b-2 border-neutral-200 pb-3">
              1. Način dostave i preuzimanja
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                onClick={() => setDeliveryMethod('courier')}
                className={`p-4 border-2 flex items-start gap-3 cursor-pointer transition-all ${
                  deliveryMethod === 'courier'
                    ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                    : 'border-neutral-300 bg-white text-black hover:border-neutral-400'
                }`}
              >
                <Truck className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-['Poppins'] text-xs font-bold uppercase block">
                    Brza pošta (BiH)
                  </span>
                  <span className="text-[11px] opacity-80 block">Dostava na vašu adresu ({shippingFee.toFixed(2)} KM)</span>
                </div>
              </label>

              <label
                onClick={() => setDeliveryMethod('pickup')}
                className={`p-4 border-2 flex items-start gap-3 cursor-pointer transition-all ${
                  deliveryMethod === 'pickup'
                    ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                    : 'border-neutral-300 bg-white text-black hover:border-neutral-400'
                }`}
              >
                <MapPin className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-['Poppins'] text-xs font-bold uppercase block">
                    Lično preuzimanje
                  </span>
                  <span className="text-[11px] opacity-80 block">Sarajevo - 0.00 KM</span>
                </div>
              </label>
            </div>

            {deliveryMethod === 'pickup' && (
              <div className="p-3 bg-[#F7E97F] border border-black text-black text-xs font-['Inter'] space-y-2">
                <p className="font-bold font-['Poppins'] uppercase">📍 Lokacija za lično preuzimanje:</p>
                <p>Sarajevo. Tačnu lokaciju i kontakt dobijate nakon potvrde narudžbe.</p>
              </div>
            )}
          </div>

          {/* FORMULAR PODATAKA */}
          <div className="bg-white p-6 border-2 border-neutral-300 space-y-6 shadow-sm">
            <div className="flex items-center gap-2 border-b-2 border-neutral-200 pb-3">
              <h2 className="font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] text-[#0A0A0A]">
                2. Podaci o kupcu
              </h2>
            </div>

            {/* HONEYPOT NEVIDLJIVO POLJE */}
            <div className="hidden" aria-hidden="true">
              <input
                type="text"
                name="bot_field"
                tabIndex={-1}
                autoComplete="off"
                value={formData.bot_field || ''}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Ime *
                </label>
                <input
                  type="text"
                  name="firstName"
                  autoComplete="given-name"
                  maxLength={50}
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
                  autoComplete="family-name"
                  maxLength={50}
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
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={20}
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="npr. 061 234 567"
                  className={`w-full bg-[#F4F2EC] border-2 p-2.5 text-xs sm:text-sm focus:bg-white focus:outline-none ${
                    errors.phone ? 'border-red-500' : 'border-neutral-300 focus:border-black'
                  }`}
                />
                <p className="text-[10px] text-neutral-500 mt-1">Nazvat ćemo te radi potvrde.</p>
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
                  inputMode="email"
                  autoComplete="email"
                  maxLength={100}
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="npr. haris@gmail.com"
                  className={`w-full bg-[#F4F2EC] border-2 p-2.5 text-xs sm:text-sm focus:bg-white focus:outline-none ${
                    errors.email ? 'border-red-500' : 'border-neutral-300 focus:border-black'
                  }`}
                />
                <p className="text-[10px] text-neutral-500 mt-1">Za slanje promo koda za iduću kupovinu.</p>
                {errors.email && (
                  <p className="text-[11px] text-red-600 mt-1">{errors.email}</p>
                )}
              </div>
            </div>

            {deliveryMethod === 'courier' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                      Grad / Mjesto u BiH *
                    </label>
                    <input
                      type="text"
                      name="city"
                      autoComplete="address-level2"
                      maxLength={50}
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="npr. Sarajevo, Tuzla..."
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
                      Poštanski broj
                    </label>
                    <input
                      type="text"
                      name="postalCode"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={5}
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
                    autoComplete="street-address"
                    maxLength={100}
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="npr. Maršala Tita 15 (ili bb)"
                    className={`w-full bg-[#F4F2EC] border-2 p-2.5 text-xs sm:text-sm focus:bg-white focus:outline-none ${
                      errors.address ? 'border-red-500' : 'border-neutral-300 focus:border-black'
                    }`}
                  />
                  {errors.address && (
                    <p className="text-[11px] text-red-600 mt-1">{errors.address}</p>
                  )}
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Željeni dan i vrijeme preuzimanja *
                </label>
                <input
                  type="text"
                  name="pickupTime"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  placeholder="npr. Sutra u 17:00h / Subota u toku dana"
                  className={`w-full bg-[#F4F2EC] border-2 p-2.5 text-xs sm:text-sm focus:bg-white focus:outline-none ${
                    errors.pickupTime ? 'border-red-500' : 'border-neutral-300 focus:border-black'
                  }`}
                />
                {errors.pickupTime && (
                  <p className="text-[11px] text-red-600 mt-1">{errors.pickupTime}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                Napomena za narudžbu <span className="text-neutral-400 font-normal">(opciono)</span>
              </label>
              <textarea
                name="note"
                rows={2}
                maxLength={300}
                value={formData.note}
                onChange={handleChange}
                placeholder="Dodatne napomene..."
                className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs sm:text-sm focus:bg-white focus:border-black focus:outline-none"
              />
            </div>
          </div>

          {/* NAČIN PLAĆANJA */}
          <div className="bg-white p-6 border-2 border-neutral-300 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b-2 border-neutral-200 pb-3">
              <CreditCard className="w-4 h-4 text-[#0A0A0A]" />
              <h2 className="font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] text-[#0A0A0A]">
                3. Način plaćanja
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
                  <span className="font-['Poppins'] text-xs sm:text-sm font-black uppercase tracking-wider text-[#F7E97F]">
                    {deliveryMethod === 'pickup' ? 'Plaćanje gotovinom pri preuzimanju' : 'Plaćanje pouzećem (Gotovinom kuriru)'}
                  </span>
                  <p className="text-xs text-neutral-300 font-['Inter']">
                    {deliveryMethod === 'pickup'
                      ? 'Plaćate u gotovini na licu mjesta prilikom preuzimanja paketa.'
                      : 'Plaćate gotovinom kuriru brze pošte. Moguće otvaranje i pregled paketa prije preuzimanja.'}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* TEKST I USLOVI POVRATA */}
          <div className="bg-white p-5 border-2 border-neutral-300 space-y-4 font-['Inter']">
            <div className="p-3 bg-[#F4F2EC] border border-neutral-300 space-y-2 text-xs text-neutral-700">
              <p className="font-bold text-black font-['Poppins'] uppercase flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-black" />
                <span>Procedura za povrat pošiljke i reklamacije:</span>
              </p>
              <p>
                Pri primitku robe provjera ispravnosti narudžbe ovisi o kupcu. Molimo Vas da uporedite primljene artikle s narudžbom, te ukoliko nešto nedostaje odmah to napomenite Vašem dostavljaču ili se odmah obratite direktno nama, jer naknadne reklamacije ne uvažavamo.
              </p>
              <p>
                U slučaju povrata robe kupac je dužan uputiti opravdanu reklamaciju putem e-maila ili Instagram profila. Kupac ima pravo na povrat robe u sljedećim slučajevima:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li>isporuka robe koja nije naručena</li>
                <li>isporuka robe koja ima grešku ili oštećenja koja nisu nastala u transportu</li>
              </ul>
              <p className="text-[11px] font-semibold text-black">
                Naručilac snosi troškove povrata robe i obavezan je artikal vratiti u originalnom nenošenom stanju.
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer select-none text-xs text-neutral-800">
              <input
                type="checkbox"
                name="termsAccepted"
                checked={formData.termsAccepted}
                onChange={handleChange}
                className="mt-0.5 w-4 h-4 accent-[#0A0A0A] cursor-pointer"
              />
              <span>
                Slažem se i prihvatam uslove kupovine, otvaranje paketa pri dostavi i navedenu proceduru za povrat robe.*
              </span>
            </label>
            {errors.terms && (
              <p className="text-[11px] text-red-600 pl-7">{errors.terms}</p>
            )}
          </div>
        </div>

        {/* REGIONALNI PREGLED PROIZVODA I PREDRAČUNA */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 border-2 border-[#F7E97F] sticky top-28 space-y-6 shadow-md">
            <h2 className="font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] text-black border-b-2 border-neutral-200 pb-3">
              Pregled narudžbe ({items.length})
            </h2>

            {/* UNOS PROMO KODA */}
            <div className="space-y-2 bg-[#F4F2EC] p-3.5 border border-neutral-300">
              <label className="block text-[11px] font-['Poppins'] font-bold uppercase text-neutral-700">
                Imate promo kod za popust?
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="npr. FIRST100"
                  disabled={Boolean(appliedPromoCode)}
                  className="w-full bg-white border border-neutral-300 px-3 py-1.5 text-xs font-mono font-bold focus:border-black focus:outline-none uppercase"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  disabled={promoValidating || Boolean(appliedPromoCode)}
                  className="px-4 py-1.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-bold uppercase tracking-wider shrink-0 transition-colors border border-black cursor-pointer disabled:opacity-50"
                >
                  {promoValidating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Primijeni'}
                </button>
              </div>

              {promoMessage && (
                <p className={`text-[11px] font-['Inter'] font-semibold ${promoMessage.error ? 'text-red-600' : 'text-emerald-700'}`}>
                  {promoMessage.text}
                </p>
              )}
            </div>

            <div className="divide-y divide-neutral-200 max-h-64 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={`${item.id}-${item.size}`} className="py-3 flex gap-3 first:pt-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-14 h-16 object-cover bg-neutral-100 shrink-0 border border-neutral-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/sarajevo_geo_tee.jpg';
                    }}
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

            <div className="space-y-2 border-t-2 border-neutral-200 pt-4 text-xs font-['Inter']">
              <div className="flex justify-between text-neutral-700">
                <span>Iznos artikala:</span>
                <span className="font-['Poppins'] font-bold">{subtotal.toFixed(2)} KM</span>
              </div>

              {promoDiscountPercent > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Popust ({promoDiscountPercent}%):</span>
                  <span className="font-['Poppins']">-{discountAmount.toFixed(2)} KM</span>
                </div>
              )}

              <div className="flex justify-between text-neutral-700">
                <span>Dostava:</span>
                <span className="font-['Poppins'] font-bold">
                  {deliveryMethod === 'pickup' ? (
                    <span className="text-emerald-700 font-black">LIČNO PREUZIMANJE (0 KM)</span>
                  ) : activeShippingFee === 0 ? (
                    <span className="text-emerald-700 font-black">BESPLATNO</span>
                  ) : (
                    `${activeShippingFee.toFixed(2)} KM`
                  )}
                </span>
              </div>

              <div className="flex justify-between text-base font-black text-black pt-3 border-t-2 border-neutral-200 font-['Poppins']">
                <span className="uppercase tracking-wider">UKUPNO:</span>
                <span className="text-xl">{calculatedTotal.toFixed(2)} KM</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xl active:scale-[0.99] border-2 border-[#0A0A0A] cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {submitting ? 'KREIRANJE NARUDŽBE...' : 'POTVRDI NARUDŽBU'}
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
