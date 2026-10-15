"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Truck, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Mail, 
  Phone, 
  Clock, 
  Send,
  Package,
  RotateCcw,
  Instagram,
  ArrowRight
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { getOrderByNumberAndPhone } from '../lib/db';
import { Order } from '../types';
import { db } from '../lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';

interface StaticPageProps {
  page: 'about' | 'contact' | 'terms' | 'shipping' | 'privacy';
}

export const StaticPages: React.FC<StaticPageProps> = ({ page }) => {
  const { settings } = useCart();

  // Stanja za kontakt formu
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [contactSending, setContactSending] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState('');

  // Stanja za praćenje narudžbe
  const [trackingOrderNumber, setTrackingOrderNumber] = useState('');
  const [trackingPhone, setTrackingPhone] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [trackingError, setTrackingError] = useState('');

  // Slanje kontakt forme
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError('');

    const safeName = contactForm.name.trim();
    const safeEmail = contactForm.email.trim();
    const safePhone = contactForm.phone.trim();
    const safeMessage = contactForm.message.trim();

    if (!safeName || !safeMessage) {
      setContactError('Molimo unesite vaše ime i poruku.');
      return;
    }

    // Sigurna inline validacija e-maila
    if (safeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+\$/.test(safeEmail)) {
      setContactError('Molimo unesite ispravnu e-mail adresu.');
      return;
    }

    // Sigurna inline validacija telefona (najmanje 6 cifara)
    if (safePhone && safePhone.replace(/\D/g, '').length < 6) {
      setContactError('Molimo unesite ispravan broj telefona.');
      return;
    }

    setContactSending(true);

    try {
      // 1. Spašavanje u bazu podataka za svaki slučaj
      const newMsgRef = doc(collection(db, 'contact_messages'));
      await setDoc(newMsgRef, {
        id: newMsgRef.id,
        name: safeName,
        email: safeEmail,
        phone: safePhone,
        message: safeMessage,
        createdAt: new Date().toISOString(),
        read: false
      }).catch(() => {
        console.warn("Nije uspjelo spremanje poruke u Firestore.");
      });

      // 2. Slanje na Telegram
      const telegramText =
        `📩 NOVI KONTAKT UPIT (PODRŠKA)\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `👤 Ime: ${safeName}\n` +
        `📞 Telefon: ${safePhone || 'Nije navedeno'}\n` +
        `✉️ E-mail: ${safeEmail || 'Nije navedeno'}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💬 Poruka:\n${safeMessage}`;

      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: telegramText, type: 'contact' }),
      });

      const data = await res.json().catch(() => ({}));

      if (data.success || res.ok) {
        setContactSuccess(true);
        setContactForm({ name: '', email: '', phone: '', message: '' });
      } else {
        setContactError(data.error || 'Došlo je do greške pri slanju upita. Možete nam pisati i izravno na Instagram.');
      }
    } catch {
      setContactError('Došlo je do greške prilikom slanja. Možete nam se javiti i putem Instagrama.');
    } finally {
      setContactSending(false);
    }
  };

  // Pretraga pošiljke
  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackingError('');
    setTrackedOrder(null);

    if (!trackingOrderNumber.trim() || !trackingPhone.trim()) {
      setTrackingError('Molimo unesite broj narudžbe i broj telefona koji ste naveli pri kupovini.');
      return;
    }

    setTrackingLoading(true);

    try {
      const order = await getOrderByNumberAndPhone(trackingOrderNumber, trackingPhone);
      if (order) {
        setTrackedOrder(order);
      } else {
        setTrackingError('Nismo pronašli narudžbu s navedenim podacima. Provjerite broj narudžbe i telefon.');
      }
    } catch {
      setTrackingError('Trenutno nije moguće provjeriti status. Pokušajte ponovno za nekoliko trenutaka.');
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="bg-[#FAF9F5] text-neutral-900 min-h-screen py-10 sm:py-16 font-['Inter']">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* 1. STRANICA: DOSTAVA I POVRAT + PRAĆENJE POŠILJKE */}
        {page === 'shipping' && (
          <div className="space-y-10 animate-fadeIn">
            <div className="text-center space-y-2">
              <span className="text-[11px] font-['Poppins'] font-black uppercase tracking-[0.25em] bg-[#0A0A0A] text-[#F7E97F] px-2.5 py-1">
                INFORMACIJE ZA KUPCE
              </span>
              <h1 className="font-['Poppins'] text-2xl sm:text-4xl font-black uppercase tracking-tight text-black">
                DOSTAVA, PLAĆANJE I POVRAT
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 max-w-xl mx-auto">
                Brza pošta širom Bosne i Hercegovine uz pregled paketa prije plaćanja pouzećem.
              </p>
            </div>

            {/* Forma za praćenje narudžbe */}
            <div className="bg-white border-2 border-[#0A0A0A] p-6 sm:p-8 shadow-xl space-y-5">
              <div className="flex items-center gap-3 border-b-2 border-neutral-100 pb-4">
                <div className="p-2.5 bg-[#F7E97F] text-[#0A0A0A] rounded">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-['Poppins'] font-black text-sm uppercase tracking-wider text-black">
                    Gdje je moja pošiljka?
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Unesite broj narudžbe i broj telefona s narudžbenice.
                  </p>
                </div>
              </div>

              <form onSubmit={handleTrackOrder} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="track-order-number" className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">
                    Broj narudžbe *
                  </label>
                  <input
                    id="track-order-number"
                    name="orderNumber"
                    type="text"
                    required
                    placeholder="npr. CS-1014-4R03"
                    value={trackingOrderNumber}
                    onChange={(e) => setTrackingOrderNumber(e.target.value)}
                    className="w-full bg-[#FAF9F5] border-2 border-neutral-300 p-2.5 text-xs font-mono font-bold focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="track-phone" className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">
                    Broj telefona *
                  </label>
                  <input
                    id="track-phone"
                    name="phone"
                    type="tel"
                    required
                    placeholder="npr. 061 123 456"
                    value={trackingPhone}
                    onChange={(e) => setTrackingPhone(e.target.value)}
                    className="w-full bg-[#FAF9F5] border-2 border-neutral-300 p-2.5 text-xs font-bold focus:border-black focus:outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={trackingLoading}
                    className="w-full py-2.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-wider border-2 border-[#0A0A0A] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Search className="w-4 h-4" />
                    <span>{trackingLoading ? 'Traženje...' : 'Provjeri status'}</span>
                  </button>
                </div>
              </form>

              {trackingError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{trackingError}</span>
                </div>
              )}

              {trackedOrder && (
                <div className="p-4 bg-[#FAF9F5] border-2 border-[#F7E97F] space-y-3 animate-fadeIn text-xs">
                  <div className="flex justify-between items-center border-b border-neutral-200 pb-2">
                    <span className="font-['Poppins'] font-black uppercase text-black text-sm">
                      Narudžba #{trackedOrder.orderNumber.replace(/^#/, '')}
                    </span>
                    <span className="px-2.5 py-1 bg-[#0A0A0A] text-[#F7E97F] font-['Poppins'] font-bold text-[10px] uppercase">
                      Status: {trackedOrder.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-neutral-700">
                    <div>
                      <p><strong>Kupac:</strong> {trackedOrder.customer.firstName} {trackedOrder.customer.lastName}</p>
                      <p><strong>Grad dostave:</strong> {trackedOrder.customer.city}</p>
                    </div>
                    <div>
                      <p><strong>Iznos za plaćanje:</strong> {trackedOrder.total.toFixed(2)} KM (Pouzećem)</p>
                      {trackedOrder.trackingNumber ? (
                        <p className="text-purple-900 font-bold">
                          X Express kod: <span className="font-mono">{trackedOrder.trackingNumber}</span>
                        </p>
                      ) : (
                        <p className="text-neutral-500 italic">Paket je u pripremi za slanje kurirskoj službi.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Informacije o dostavi */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 border-2 border-neutral-200 space-y-2">
                <div className="w-10 h-10 bg-[#F7E97F] text-black flex items-center justify-center font-bold mb-3">
                  <Truck className="w-5 h-5" />
                </div>
                <h3 className="font-['Poppins'] font-black text-sm uppercase text-black">
                  Rok isporuke 24–48h
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Narudžbe zaprimljene radnim danom do 14:00h šalju se isti dan putem ugovorene brze pošte <strong>X Express</strong>.
                </p>
              </div>

              <div className="bg-white p-6 border-2 border-neutral-200 space-y-2">
                <div className="w-10 h-10 bg-[#F7E97F] text-black flex items-center justify-center font-bold mb-3">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-['Poppins'] font-black text-sm uppercase text-black">
                  Pregled prije plaćanja
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Dozvoljeno je otvoriti paket pred kurirom i provjeriti artikal prije davanja novca.
                </p>
              </div>

              <div className="bg-white p-6 border-2 border-neutral-200 space-y-2">
                <div className="w-10 h-10 bg-[#F7E97F] text-black flex items-center justify-center font-bold mb-3">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <h3 className="font-['Poppins'] font-black text-sm uppercase text-black">
                  Zamjena veličine
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Ako veličina ne odgovara, vršimo brzu zamjenu unutar 14 dana od preuzimanja paketa.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2. STRANICA: KONTAKT */}
        {page === 'contact' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center space-y-2">
              <span className="text-[11px] font-['Poppins'] font-black uppercase tracking-[0.25em] bg-[#0A0A0A] text-[#F7E97F] px-3 py-1 border border-black shadow-sm">
                KORISNIČKA PODRŠKA
              </span>
              <h1 className="font-['Poppins'] text-3xl sm:text-5xl font-black uppercase tracking-tight text-black pt-2">
                KONTAKTIRAJTE NAS
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 max-w-lg mx-auto">
                Tu smo za sva pitanja u vezi dostupnosti modela, veličina i narudžbi.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-4">
              
              {/* LIJEVA KARTICA: PODACI ZA KONTAKT */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white border-2 border-black p-6 sm:p-7 shadow-lg space-y-5">
                  <div className="border-b border-neutral-100 pb-3">
                    <span className="font-['Poppins'] font-black text-xs uppercase tracking-wider text-black block">
                      Direktni kanali podrške
                    </span>
                    <span className="text-[11px] text-neutral-400">Casual Shop BiH tim vam stoji na raspolaganju.</span>
                  </div>

                  <div className="space-y-4">
                    {/* Telefon */}
                    <div className="flex items-start gap-3.5">
                      <div className="w-9 h-9 bg-[#FAF9F5] border border-neutral-300 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4 text-black" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-['Poppins'] font-bold text-neutral-400">Telefon</p>
                        <p className="text-xs font-bold text-black font-mono">{(settings as any)?.contactPhone || '+387 61 000 000'}</p>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="flex items-start gap-3.5">
                      <div className="w-9 h-9 bg-[#FAF9F5] border border-neutral-300 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4 text-black" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-['Poppins'] font-bold text-neutral-400">E-mail adresa</p>
                        <p className="text-xs font-bold text-black font-mono">{(settings as any)?.contactEmail || 'info@casualshop.ba'}</p>
                      </div>
                    </div>

                    {/* Instagram */}
                    <div className="flex items-start gap-3.5">
                      <div className="w-9 h-9 bg-[#FAF9F5] border border-neutral-300 flex items-center justify-center shrink-0">
                        <Instagram className="w-4 h-4 text-black" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-['Poppins'] font-bold text-neutral-400">Instagram podrška</p>
                        <a 
                          href={(settings as any)?.instagramUrl || 'https://www.instagram.com/casualshop.bih'}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-black hover:text-amber-700 underline"
                        >
                          @casualshop.bih
                        </a>
                      </div>
                    </div>

                    {/* Radno vrijeme */}
                    <div className="flex items-start gap-3.5">
                      <div className="w-9 h-9 bg-[#FAF9F5] border border-neutral-300 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-black" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-['Poppins'] font-bold text-neutral-400">Radno vrijeme</p>
                        <p className="text-xs font-bold text-black">Pon – Sub: 09:00 – 20:00h</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#F7E97F] border-2 border-black text-black space-y-1 shadow-md">
                  <p className="font-['Poppins'] font-black text-xs uppercase flex items-center gap-1.5">
                    <span>⚡ Najbrži odgovor:</span>
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    Za brze upite oko veličina i slanja paketa, pošaljite nam poruku u <strong>Instagram DM</strong>.
                  </p>
                </div>
              </div>

              {/* DESNA KARTICA: FORMULAR */}
              <div className="lg:col-span-7 bg-white border-2 border-black p-6 sm:p-8 shadow-2xl">
                {contactSuccess ? (
                  <div className="text-center py-12 space-y-4 animate-fadeIn">
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-700 flex items-center justify-center rounded-full mx-auto border-2 border-emerald-600">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-['Poppins'] font-black uppercase text-base text-black">
                        Poruka je uspješno poslana!
                      </h3>
                      <p className="text-xs text-neutral-600 max-w-sm mx-auto">
                        Vaš upit je zaprimljen u sistemu podrške. Odgovorit ćemo vam u najkraćem roku.
                      </p>
                    </div>
                    <button
                      onClick={() => setContactSuccess(false)}
                      className="px-6 py-2.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] text-xs font-['Poppins'] font-black uppercase tracking-wider transition-colors border-2 border-black cursor-pointer"
                    >
                      Pošalji novi upit
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4 text-xs">
                    <div className="border-b border-neutral-200 pb-3">
                      <h3 className="font-['Poppins'] font-black text-sm uppercase text-black tracking-wide">
                        Pošaljite nam poruku
                      </h3>
                      <p className="text-[11px] text-neutral-500">Ispunite obrazac i javljamo se povratno.</p>
                    </div>

                    {contactError && (
                      <div className="p-3 bg-red-50 border-2 border-red-300 text-red-700 text-xs flex items-center gap-2 animate-fadeIn">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{contactError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="contact-name" className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1 text-neutral-800">
                          Vaše ime i prezime *
                        </label>
                        <input
                          id="contact-name"
                          name="name"
                          type="text"
                          required
                          autoComplete="name"
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          placeholder="npr. Amar Hadžić"
                          className="w-full bg-[#FAF9F5] border-2 border-neutral-300 p-2.5 text-xs text-black font-medium focus:border-black focus:bg-white focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label htmlFor="contact-phone" className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1 text-neutral-800">
                          Broj telefona
                        </label>
                        <input
                          id="contact-phone"
                          name="phone"
                          type="tel"
                          autoComplete="tel"
                          value={contactForm.phone}
                          onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                          placeholder="npr. 061 497 938"
                          className="w-full bg-[#FAF9F5] border-2 border-neutral-300 p-2.5 text-xs text-black font-medium focus:border-black focus:bg-white focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="contact-email" className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1 text-neutral-800">
                        E-mail adresa
                      </label>
                      <input
                        id="contact-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        placeholder="npr. adresa@gmail.com"
                        className="w-full bg-[#FAF9F5] border-2 border-neutral-300 p-2.5 text-xs text-black font-medium focus:border-black focus:bg-white focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label htmlFor="contact-message" className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1 text-neutral-800">
                        Vaša poruka *
                      </label>
                      <textarea
                        id="contact-message"
                        name="message"
                        rows={5}
                        required
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        placeholder="Navedite model, veličinu ili pitanje koje vas zanima..."
                        className="w-full bg-[#FAF9F5] border-2 border-neutral-300 p-2.5 text-xs text-black font-medium focus:border-black focus:bg-white focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={contactSending}
                        className="w-full py-3.5 bg-[#F7E97F] hover:bg-yellow-300 text-black border-2 border-black font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50 active:scale-98"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{contactSending ? 'Slanje poruke...' : 'Pošalji upit'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                )}
              </div>

            </div>
          </div>
        )}

        {/* 3. STRANICA: O NAMA */}
        {page === 'about' && (
          <div className="space-y-8 animate-fadeIn text-neutral-800 leading-relaxed text-xs sm:text-sm">
            <div className="text-center space-y-2">
              <span className="text-[11px] font-['Poppins'] font-black uppercase tracking-[0.25em] bg-[#0A0A0A] text-[#F7E97F] px-2.5 py-1">
                NAŠA PRIČA
              </span>
              <h1 className="font-['Poppins'] text-2xl sm:text-4xl font-black uppercase tracking-tight text-black">
                O BRENDU CASUAL SHOP BIH
              </h1>
            </div>

            <div className="bg-white p-6 sm:p-10 border-2 border-neutral-200 space-y-5">
              <p className="font-medium text-neutral-900 leading-relaxed">
                <strong>Casual Shop BiH</strong> nastao je iz ljubavi prema autentičnoj urbanoj i casual supkulturi. Naš cilj je ponuditi streetwear komade vrhunskog kroja i materijala koji spajaju udobnost, izdržljivost i upečatljiv identitet.
              </p>
              <h2 className="font-['Poppins'] font-black text-base uppercase text-black pt-2">
                Beskompromisan kvalitet materijala
              </h2>
              <p>
                Svi naši artikli izrađeni su od 100% češljanog pamuka visoke gramature (240 GSM za majice, 350+ GSM za dukserice). Posebnu pažnju posvećujemo postojanosti štampe i veza.
              </p>
              <h2 className="font-['Poppins'] font-black text-base uppercase text-black pt-2">
                Kupovina bez ikakvog rizika
              </h2>
              <p>
                Kao domaći brend, poslujemo isključivo po modelu <strong>plaćanja pouzećem</strong> uz ugovorenu brzu poštu koja omogućava pregled paketa prije preuzimanja.
              </p>
            </div>
          </div>
        )}

        {/* 4. STRANICA: USLOVI KORIŠTENJA */}
        {page === 'terms' && (
          <div className="space-y-8 animate-fadeIn text-neutral-800 leading-relaxed text-xs sm:text-sm">
            <div className="text-center space-y-2">
              <span className="text-[11px] font-['Poppins'] font-black uppercase tracking-[0.25em] bg-[#0A0A0A] text-[#F7E97F] px-2.5 py-1">
                PRAVNI USLOVI
              </span>
              <h1 className="font-['Poppins'] text-2xl sm:text-4xl font-black uppercase tracking-tight text-black">
                USLOVI KORIŠTENJA WEBSHOPA
              </h1>
            </div>

            <div className="bg-white p-6 sm:p-10 border-2 border-neutral-200 space-y-5">
              <h2 className="font-['Poppins'] font-black text-sm uppercase text-black">1. Opšte odredbe</h2>
              <p>
                Korištenjem web stranice <strong>Casual Shop BiH</strong> prihvaćate važeće uslove poslovanja. Zadržavamo pravo izmjene asortimana i cijena u bilo kojem trenutku.
              </p>
              <h2 className="font-['Poppins'] font-black text-sm uppercase text-black">2. Narudžbe i ugovor</h2>
              <p>
                Narudžba se smatra prihvaćenom kada kupac popuni i potvrdi obrazac na webshopu. Sve cijene su izražene u KM i uključuju PDV.
              </p>
              <h2 className="font-['Poppins'] font-black text-sm uppercase text-black">3. Plaćanje i dostava</h2>
              <p>
                Plaćanje se vrši gotovinski kuriru prilikom preuzimanja pošiljke (plaćanje pouzećem). Kupac je dužan osigurati točnost podataka za dostavu.
              </p>
            </div>
          </div>
        )}

        {/* 5. STRANICA: POLITIKA PRIVATNOSTI */}
        {page === 'privacy' && (
          <div className="space-y-8 animate-fadeIn text-neutral-800 leading-relaxed text-xs sm:text-sm">
            <div className="text-center space-y-2">
              <span className="text-[11px] font-['Poppins'] font-black uppercase tracking-[0.25em] bg-[#0A0A0A] text-[#F7E97F] px-2.5 py-1">
                ZAŠTITA PODATAKA
              </span>
              <h1 className="font-['Poppins'] text-2xl sm:text-4xl font-black uppercase tracking-tight text-black">
                POLITIKA PRIVATNOSTI
              </h1>
            </div>

            <div className="bg-white p-6 sm:p-10 border-2 border-neutral-200 space-y-5">
              <h2 className="font-['Poppins'] font-black text-sm uppercase text-black">1. Sigurnost podataka</h2>
              <p>
                Casual Shop BiH poštuje privatnost korisnika. Podaci uneseni prilikom narudžbe koriste se isključivo za realizaciju dostave i obavještavanje o statusu pošiljke.
              </p>
              <h2 className="font-['Poppins'] font-black text-sm uppercase text-black">2. Dijeljenje s kurirskom službom</h2>
              <p>
                Podaci se dijele isključivo s ugovorenom brzom poštom (X Express) radi dostave paketa na adresu. Podaci se nikada ne ustupaju trećim stranama.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};