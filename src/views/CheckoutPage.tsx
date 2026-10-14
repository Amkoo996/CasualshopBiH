"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  ShoppingBag, 
  Lock,
  ArrowRight,
  Check
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { createOrder } from '../lib/db';
import { isValidPhone, isValidName } from '../lib/validation';
import { Order } from '../types';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

// Provjera e-mail adrese (podržava brojeve, tačke, crtice)
const checkValidEmail = (emailStr: string): boolean => {
  if (!emailStr || !emailStr.trim()) return true; // Polje je opciono
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}\$/.test(emailStr.trim());
};

// Provjera poštanskog broja
const checkValidPostal = (codeStr: string): boolean => {
  if (!codeStr || !codeStr.trim()) return true; // Opciono
  const digits = codeStr.trim().replace(/\D/g, '');
  return digits.length === 5;
};

export const CheckoutPage: React.FC<{
  onBack?: () => void;
  onOrderSuccess?: (order: Order) => void;
  onNavigateToPage?: (page: string) => void;
}> = ({ onBack, onOrderSuccess, onNavigateToPage }) => {
  const { 
    items, 
    subtotal, 
    shippingFee, 
    total, 
    clearCart 
  } = useCart();

  // Način dostave
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');

  // Podaci o kupcu
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    city: '',
    postalCode: '',
    address: '',
    pickupTime: 'Danas ili sutra po dogovoru',
    note: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');

  // Kupon kod
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountPercent: number } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');

  // Obrada narudžbe
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  const actualShippingFee = deliveryMethod === 'pickup' ? 0 : shippingFee;
  const discountAmount = appliedPromo 
    ? (subtotal * appliedPromo.discountPercent) / 100 
    : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount + actualShippingFee);

  // Automatsko bilježenje napuštene korpe
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (items.length === 0 || completedOrder) return;

    const safePhone = formData.phone || '';
    const safeEmail = formData.email || '';
    const cleanPhone = safePhone.replace(/\D/g, '');

    if (cleanPhone.length >= 6 || safeEmail.includes('@')) {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

      syncTimeoutRef.current = setTimeout(async () => {
        try {
          const cartSessionId = `cart-${cleanPhone || safeEmail.replace(/[^a-zA-Z0-9]/g, '')}`;
          await setDoc(doc(db, 'abandoned_carts', cartSessionId), {
            customerName: `${formData.firstName} ${formData.lastName}`.trim() || 'Posjetilac',
            phone: safePhone,
            email: safeEmail,
            city: formData.city || '',
            address: formData.address || '',
            deliveryMethod,
            items: items.map(i => ({ name: i.name, size: i.size, quantity: i.quantity, price: i.price })),
            itemsSummary: items.map(i => `${i.quantity}x ${i.name} (${i.size})`).join(', '),
            total: finalTotal,
            updatedAt: new Date().toISOString(),
            status: 'in_checkout'
          }, { merge: true });
        } catch (err) {
          console.warn('Silent fail: Abandoned cart sync failed.');
        }
      }, 2000);
    }

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [formData, items, finalTotal, deliveryMethod, completedOrder]);

  const handleEmailChange = (val: string) => {
    setFormData(prev => ({ ...prev, email: val }));
    if (val.trim() && !checkValidEmail(val)) {
      setErrors(prev => ({ ...prev, email: 'Unesite ispravnu e-mail adresu (npr. ime@gmail.com)' }));
    } else {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy.email;
        return copy;
      });
    }
  };

  const handlePostalChange = (val: string) => {
    setFormData(prev => ({ ...prev, postalCode: val }));
    if (val.trim() && !checkValidPostal(val)) {
      setErrors(prev => ({ ...prev, postalCode: 'Poštanski broj mora imati tačno 5 cifara (npr. 71000)' }));
    } else {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy.postalCode;
        return copy;
      });
    }
  };

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError('');
    setPromoSuccess('');

    const cleanCode = promoCodeInput.trim().toUpperCase();
    if (!cleanCode) return;

    if (cleanCode === 'FIRST100' || cleanCode === 'CASUAL10') {
      setAppliedPromo({ code: cleanCode, discountPercent: 10 });
      setPromoSuccess(`Kupon "${cleanCode}" je aktiviran! Ostvarili ste 10% popusta.`);
    } else if (cleanCode === 'CASUAL20') {
      setAppliedPromo({ code: cleanCode, discountPercent: 20 });
      setPromoSuccess(`Kupon "${cleanCode}" je aktiviran! Ostvarili ste 20% popusta.`);
    } else {
      setPromoError('Navedeni promo kod nije važeći ili je istekao.');
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    const newErrors: Record<string, string> = {};

    if (!isValidName(formData.firstName)) {
      newErrors.firstName = 'Molimo unesite vaše ime.';
    }
    if (!isValidName(formData.lastName)) {
      newErrors.lastName = 'Molimo unesite vaše prezime.';
    }
    if (!isValidPhone(formData.phone)) {
      newErrors.phone = 'Molimo unesite ispravan broj telefona (npr. 061 123 456).';
    }
    if (formData.email.trim() && !checkValidEmail(formData.email)) {
      newErrors.email = 'Unesite ispravnu e-mail adresu.';
    }

    if (deliveryMethod === 'delivery') {
      if (!formData.city.trim()) {
        newErrors.city = 'Molimo unesite grad dostave.';
      }
      if (!formData.address.trim()) {
        newErrors.address = 'Molimo unesite ulicu i kućni broj.';
      }
      if (formData.postalCode.trim() && !checkValidPostal(formData.postalCode)) {
        newErrors.postalCode = 'Poštanski broj mora imati 5 cifara (npr. 71000).';
      }
    } else {
      if (!formData.pickupTime.trim()) {
        newErrors.pickupTime = 'Molimo navedite željeni dan i vrijeme preuzimanja.';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setGeneralError('Molimo ispravite označena polja prije potvrde narudžbe.');
      return;
    }

    setIsSubmitting(true);

    try {
      const randomId = Math.random().toString(36).substring(2, 6).toUpperCase();
      const orderNumber = `CS-${Date.now().toString().slice(-4)}-${randomId}`;

      const deliveryAddressText = deliveryMethod === 'pickup' 
        ? `Lično preuzimanje Sarajevo (${formData.pickupTime})`
        : formData.address.trim();

      const orderPayload: Omit<Order, 'id'> = {
        orderNumber,
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          size: item.size,
          quantity: item.quantity,
          image: item.image || '/hero-streetwear.webp',
          maxStock: item.maxStock ?? 99
        })),
        customer: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim(),
          city: deliveryMethod === 'pickup' ? 'Sarajevo (Lično)' : formData.city.trim(),
          postalCode: deliveryMethod === 'pickup' ? '71000' : (formData.postalCode.trim() || '71000'),
          address: deliveryAddressText,
          email: formData.email.trim() || '',
          note: formData.note.trim() || (deliveryMethod === 'pickup' ? `Vrijeme: ${formData.pickupTime}` : 'Nema napomene')
        },
        subtotal: Number(subtotal.toFixed(2)),
        shippingFee: Number(actualShippingFee.toFixed(2)),
        total: Number(finalTotal.toFixed(2)),
        paymentMethod: 'cash_on_delivery',
        status: 'Nova',
        createdAt: new Date().toISOString(),
        promoCode: appliedPromo?.code || null,
        discountAmount: Number(discountAmount.toFixed(2))
      };

      const createdOrderId = await createOrder(orderPayload);
      const fullOrderRecord: Order = { ...orderPayload, id: createdOrderId };

      setCompletedOrder(fullOrderRecord);
      clearCart();

      if (onOrderSuccess) {
        onOrderSuccess(fullOrderRecord);
      }
    } catch (err: any) {
      console.error('Greška pri kreiranju narudžbe:', err);
      setGeneralError('Došlo je do greške prilikom spremanja narudžbe. Pokušajte ponovo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (completedOrder) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-[#FAF9F5] px-4 py-12 font-['Inter']">
        <div className="max-w-lg w-full bg-white border-2 border-[#0A0A0A] p-6 sm:p-10 text-center space-y-6 shadow-2xl animate-fadeIn">
          <div className="w-16 h-16 bg-[#F7E97F] border-2 border-black rounded-full flex items-center justify-center mx-auto text-black">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-['Poppins'] font-black uppercase tracking-[0.2em] bg-[#0A0A0A] text-[#F7E97F] px-2.5 py-0.5">
              NARUDŽBA EVIDENTIRANA
            </span>
            <h1 className="font-['Poppins'] text-2xl font-black uppercase text-black pt-2">
              HVALA VAM NA POVJERENJU!
            </h1>
            <p className="text-xs text-neutral-600">
              Vaša narudžba <strong className="text-black font-mono">#{completedOrder.orderNumber}</strong> je uspješno zaprimljena.
            </p>
          </div>

          <div className="bg-[#FAF9F5] border border-neutral-200 p-4 text-left text-xs space-y-2">
            <div className="flex justify-between border-b border-neutral-200 pb-2">
              <span className="text-neutral-500">Kupac:</span>
              <span className="font-bold text-black">{completedOrder.customer.firstName} {completedOrder.customer.lastName}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-200 pb-2">
              <span className="text-neutral-500">Kontakt telefon:</span>
              <span className="font-bold text-black">{completedOrder.customer.phone}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-200 pb-2">
              <span className="text-neutral-500">Način preuzimanja:</span>
              <span className="font-bold text-black">{deliveryMethod === 'pickup' ? 'Lično preuzimanje (Sarajevo)' : 'Brza pošta X Express'}</span>
            </div>
            <div className="flex justify-between pt-1 font-['Poppins'] font-black text-sm">
              <span>Iznos za plaćanje:</span>
              <span className="text-black">{completedOrder.total.toFixed(2)} KM</span>
            </div>
          </div>

          <div className="p-3 bg-neutral-100 border border-neutral-300 text-[11px] text-neutral-700 space-y-1 text-left">
            <p className="font-bold flex items-center gap-1.5 text-black">
              <Truck className="w-4 h-4 text-black shrink-0" />
              <span>Šta se dešava dalje?</span>
            </p>
            <p>
              Naš tim priprema vaše artikle. Pozvat ćemo vas na navedeni broj telefona radi kratke potvrde adrese prije slanja kuriru.
            </p>
          </div>

          <Link
            href="/"
            className="w-full py-3 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-wider transition-colors border-2 border-black block text-center"
          >
            Nazad na početnu stranicu
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#FAF9F5] px-4 font-['Inter']">
        <div className="max-w-md w-full bg-white border-2 border-black p-8 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 bg-[#FAF9F5] text-neutral-400 rounded-full flex items-center justify-center mx-auto border border-neutral-300">
            <ShoppingBag className="w-8 h-8 text-black" />
          </div>
          <h2 className="font-['Poppins'] text-lg font-black uppercase text-black">
            Vaša korpa je prazna
          </h2>
          <p className="text-xs text-neutral-600">
            Nemate artikala spremnih za narudžbu.
          </p>
          <Link
            href="/shop"
            className="inline-block px-6 py-2.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Pregledaj artikle →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF9F5] text-neutral-900 min-h-screen py-8 sm:py-14 font-['Inter']">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
          <button
            onClick={onBack ? onBack : () => window.history.back()}
            className="flex items-center gap-1.5 text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-600 hover:text-black transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Nazad u trgovinu</span>
          </button>

          <span className="text-[11px] font-['Poppins'] font-black uppercase tracking-[0.2em] bg-[#0A0A0A] text-[#F7E97F] px-2.5 py-1">
            SIGURAN CHECKOUT
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-start">
          
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white border-2 border-[#0A0A0A] p-6 sm:p-8 shadow-xl space-y-6">
              
              {generalError && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{generalError}</span>
                </div>
              )}

              {/* 1. Način dostave */}
              <div className="space-y-3">
                <span className="font-['Poppins'] text-xs font-black uppercase tracking-wider text-black block">
                  1. Način dostave i preuzimanja
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('delivery')}
                    className={`p-4 border-2 text-left flex items-start gap-3 transition-all cursor-pointer ${
                      deliveryMethod === 'delivery' 
                        ? 'border-black bg-[#FAF9F5] shadow-xs' 
                        : 'border-neutral-200 bg-white hover:border-neutral-400'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${deliveryMethod === 'delivery' ? 'border-black bg-black' : 'border-neutral-400'}`}>
                      {deliveryMethod === 'delivery' && <div className="w-1.5 h-1.5 rounded-full bg-[#F7E97F]" />}
                    </div>
                    <div>
                      <span className="font-['Poppins'] font-bold text-xs uppercase block text-black">
                        Brza pošta (BiH)
                      </span>
                      <span className="text-[11px] text-neutral-500 block mt-0.5">
                        Dostava na vašu adresu (12.00 KM)
                      </span>
                      <span className="font-['Poppins'] font-black text-xs text-black block mt-1">
                        {shippingFee === 0 ? 'Besplatna dostava' : `${shippingFee.toFixed(2)} KM`}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('pickup')}
                    className={`p-4 border-2 text-left flex items-start gap-3 transition-all cursor-pointer ${
                      deliveryMethod === 'pickup' 
                        ? 'border-black bg-[#FAF9F5] shadow-xs' 
                        : 'border-neutral-200 bg-white hover:border-neutral-400'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${deliveryMethod === 'pickup' ? 'border-black bg-black' : 'border-neutral-400'}`}>
                      {deliveryMethod === 'pickup' && <div className="w-1.5 h-1.5 rounded-full bg-[#F7E97F]" />}
                    </div>
                    <div>
                      <span className="font-['Poppins'] font-bold text-xs uppercase block text-black">
                        Lično preuzimanje
                      </span>
                      <span className="text-[11px] text-neutral-500 block mt-0.5">
                        Sarajevo • 0.00 KM
                      </span>
                      <span className="font-['Poppins'] font-black text-xs text-emerald-700 block mt-1">
                        0.00 KM (Besplatno)
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Podaci o kupcu */}
              <form onSubmit={handleSubmitOrder} id="checkout-form" className="space-y-4 text-xs pt-4 border-t border-neutral-100">
                <span className="font-['Poppins'] text-xs font-black uppercase tracking-wider text-black block mb-2">
                  2. Podaci o kupcu
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">
                      Ime *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="npr. Ahmed"
                      className={`w-full bg-[#FAF9F5] border-2 p-2.5 focus:border-black focus:outline-none ${errors.firstName ? 'border-red-500' : 'border-neutral-300'}`}
                    />
                    {errors.firstName && <p className="text-[10px] text-red-600 mt-0.5 font-bold">{errors.firstName}</p>}
                  </div>

                  <div>
                    <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">
                      Prezime *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="npr. Pupalović"
                      className={`w-full bg-[#FAF9F5] border-2 p-2.5 focus:border-black focus:outline-none ${errors.lastName ? 'border-red-500' : 'border-neutral-300'}`}
                    />
                    {errors.lastName && <p className="text-[10px] text-red-600 mt-0.5 font-bold">{errors.lastName}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">
                    Broj telefona (Mobitel) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="npr. +38761909700"
                    className={`w-full bg-[#FAF9F5] border-2 p-2.5 focus:border-black focus:outline-none font-bold ${errors.phone ? 'border-red-500' : 'border-neutral-300'}`}
                  />
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">
                    Nazvat ćemo vas radi potvrde.
                  </span>
                  {errors.phone && <p className="text-[10px] text-red-600 mt-0.5 font-bold">{errors.phone}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">
                    E-mail adresa <span className="text-neutral-400 font-normal">(Opciono)</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="npr. adresa@gmail.com"
                    className={`w-full bg-[#FAF9F5] border-2 p-2.5 focus:border-black focus:outline-none ${errors.email ? 'border-red-500' : 'border-neutral-300'}`}
                  />
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">
                    Za slanje potvrde narudžbe.
                  </span>
                  {errors.email && (
                    <p className="text-[10px] text-red-600 mt-0.5 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.email}</span>
                    </p>
                  )}
                </div>

                {deliveryMethod === 'delivery' ? (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">
                          Grad / Mjesto u BiH *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          placeholder="npr. Sarajevo"
                          className={`w-full bg-[#FAF9F5] border-2 p-2.5 focus:border-black focus:outline-none ${errors.city ? 'border-red-500' : 'border-neutral-300'}`}
                        />
                        {errors.city && <p className="text-[10px] text-red-600 mt-0.5 font-bold">{errors.city}</p>}
                      </div>

                      <div>
                        <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">
                          Poštanski broj
                        </label>
                        <input
                          type="text"
                          maxLength={5}
                          value={formData.postalCode}
                          onChange={(e) => handlePostalChange(e.target.value)}
                          placeholder="71000"
                          className={`w-full bg-[#FAF9F5] border-2 p-2.5 focus:border-black focus:outline-none font-mono ${errors.postalCode ? 'border-red-500' : 'border-neutral-300'}`}
                        />
                        {errors.postalCode && (
                          <p className="text-[10px] text-red-600 mt-0.5 font-bold">
                            {errors.postalCode}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">
                        Adresa stanovanja (Ulica i kućni broj) *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="npr. Zeleni put 192"
                        className={`w-full bg-[#FAF9F5] border-2 p-2.5 focus:border-black focus:outline-none ${errors.address ? 'border-red-500' : 'border-neutral-300'}`}
                      />
                      {errors.address && <p className="text-[10px] text-red-600 mt-0.5 font-bold">{errors.address}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="pt-2">
                    <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">
                      Željeni dan i vrijeme preuzimanja *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.pickupTime}
                      onChange={(e) => setFormData({ ...formData, pickupTime: e.target.value })}
                      placeholder="npr. Sutra u 12:00h"
                      className="w-full bg-[#FAF9F5] border-2 border-neutral-300 p-2.5 focus:border-black focus:outline-none font-bold"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">
                    Napomena za narudžbu <span className="text-neutral-400 font-normal">(Opciono)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Dodatne napomene..."
                    className="w-full bg-[#FAF9F5] border-2 border-neutral-300 p-2.5 focus:border-black focus:outline-none"
                  />
                </div>

                <div className="pt-4 border-t border-neutral-100">
                  <span className="font-['Poppins'] text-xs font-black uppercase tracking-wider text-black block mb-2">
                    3. Način plaćanja
                  </span>
                  
                  <div className="p-4 bg-[#FAF9F5] border-2 border-black flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-black flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#F7E97F]" />
                      </div>
                      <div>
                        <span className="font-['Poppins'] font-bold text-xs uppercase block text-black">
                          {deliveryMethod === 'pickup' ? 'Gotovinsko plaćanje pri preuzimanju' : 'Plaćanje pouzećem (gotovinom kuriru)'}
                        </span>
                        <span className="text-[11px] text-neutral-500">
                          {deliveryMethod === 'pickup' ? 'Plaćate gotovinom prilikom ličnog preuzimanja.' : 'Plaćate gotovinom kuriru tek kada preuzmete i otvorite paket.'}
                        </span>
                      </div>
                    </div>
                    <Truck className="w-5 h-5 text-black" />
                  </div>
                </div>

              </form>
            </div>
          </div>

          {/* DESNA STRANA */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white border-2 border-neutral-300 p-6 space-y-5 shadow-sm">
              <h2 className="font-['Poppins'] font-black text-sm uppercase text-black border-b border-neutral-100 pb-3">
                Pregled narudžbe ({items.length})
              </h2>

              <div className="divide-y divide-neutral-100 max-h-72 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={`${item.id}-${item.size}`} className="py-3 flex gap-3 text-xs">
                    <img
                      src={item.image || '/hero-streetwear.webp'}
                      alt={item.name}
                      className="w-12 h-14 object-cover bg-neutral-100 border border-neutral-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-['Poppins'] font-bold text-black truncate">{item.name}</h4>
                      <p className="text-neutral-500 text-[11px]">Veličina: <strong>{item.size}</strong></p>
                      <p className="text-neutral-400 text-[10px]">{item.quantity} × {item.price.toFixed(2)} KM</p>
                    </div>
                    <span className="font-['Poppins'] font-bold text-black">
                      {(item.price * item.quantity).toFixed(2)} KM
                    </span>
                  </div>
                ))}
              </div>

              {/* Kupon kod */}
              <form onSubmit={handleApplyPromo} className="pt-2 border-t border-neutral-200">
                <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">
                  Imate li promo kod za popust?
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                    placeholder="npr. FIRST100"
                    className="flex-1 bg-[#FAF9F5] border-2 border-neutral-300 px-3 py-1.5 text-xs font-mono font-bold uppercase focus:border-black focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] text-xs font-['Poppins'] font-bold uppercase transition-colors cursor-pointer"
                  >
                    Primijeni
                  </button>
                </div>

                {promoSuccess && (
                  <p className="text-[11px] text-emerald-700 font-bold mt-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{promoSuccess}</span>
                  </p>
                )}
                {promoError && (
                  <p className="text-[11px] text-red-600 font-bold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{promoError}</span>
                  </p>
                )}
              </form>

              {/* Cijene */}
              <div className="space-y-2 pt-3 border-t border-neutral-200 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Iznos artikala:</span>
                  <span className="font-['Poppins'] font-bold text-black">{subtotal.toFixed(2)} KM</span>
                </div>

                {appliedPromo && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Popust ({appliedPromo.discountPercent}%):</span>
                    <span>-{discountAmount.toFixed(2)} KM</span>
                  </div>
                )}

                <div className="flex justify-between text-neutral-600">
                  <span>Dostava:</span>
                  <span className="font-['Poppins'] font-bold text-black">
                    {deliveryMethod === 'pickup' ? (
                      <span className="text-emerald-700 font-black">LIČNO (0.00 KM)</span>
                    ) : actualShippingFee === 0 ? (
                      <span className="text-emerald-700 font-black">BESPLATNO</span>
                    ) : (
                      `${actualShippingFee.toFixed(2)} KM`
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-base font-black text-black pt-3 border-t-2 border-neutral-200 font-['Poppins']">
                  <span>UKUPNO:</span>
                  <span className="text-lg text-black">{finalTotal.toFixed(2)} KM</span>
                </div>
              </div>

              {/* Potvrda narudžbe */}
              <button
                type="submit"
                form="checkout-form"
                disabled={isSubmitting}
                className="w-full py-4 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border-2 border-[#0A0A0A] shadow-xl cursor-pointer disabled:opacity-50 active:scale-98"
              >
                <Lock className="w-4 h-4" />
                <span>{isSubmitting ? 'OBRADA NARUDŽBE...' : 'POTVRDI NARUDŽBU'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="space-y-1.5 text-[11px] text-neutral-500 pt-2 border-t border-neutral-100">
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Dozvoljeno otvaranje paketa prije plaćanja kuriru.</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Mogućnost zamjene veličine unutar 14 dana.</span>
                </p>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};