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
  MapPin, 
  Clock, 
  Send,
  Package,
  RotateCcw,
  HelpCircle,
  Instagram
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { getOrderByNumberAndPhone } from '../lib/db';
import { isValidPhone, isValidEmail } from '../lib/validation';
import { Order } from '../types';

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

    if (!contactForm.name.trim() || !contactForm.message.trim()) {
      setContactError('Molimo unesite vaše ime i poruku.');
      return;
    }

    if (contactForm.email && !isValidEmail(contactForm.email)) {
      setContactError('Molimo unesite ispravnu e-mail adresu.');
      return;
    }

    if (contactForm.phone && !isValidPhone(contactForm.phone)) {
      setContactError('Molimo unesite ispravan broj telefona (npr. 061 123 456).');
      return;
    }

    setContactSending(true);

    try {
      const telegramText =
        `📩 NOVI UPIT SA KONTAKT FORME\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `👤 Ime: ${contactForm.name}\n` +
        `📞 Telefon: ${contactForm.phone || 'Nije uneseno'}\n` +
        `✉️ E-mail: ${contactForm.email || 'Nije uneseno'}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💬 Poruka:\n${contactForm.message}`;

      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: telegramText, type: 'contact' }),
      });

      setContactSuccess(true);
      setContactForm({ name: '', email: '', phone: '', message: '' });
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
        setTrackingError('Nismo pronašli narudžbu sa navedenim podacima. Provjerite broj narudžbe i telefon.');
      }
    } catch {
      setTrackingError('Trenutno nije moguće provjeriti status. Pokušajte ponovo za nekoliko trenutaka.');
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="bg-[#FAF9F5] text-neutral-900 min-h-screen py-10 sm:py-16 font-['Inter']">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

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
                Brza pošta širom Bosne i Hercegovine sa mogućnošću pregleda paketa prije plaćanja.
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
                    Unesite broj narudžbe i vaš broj telefona kako biste provjerili status paketa.
                  </p>
                </div>
              </div>

              <form onSubmit={handleTrackOrder} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">
                    Broj narudžbe *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="npr. CS-1014-4R03"
                    value={trackingOrderNumber}
                    onChange={(e) => setTrackingOrderNumber(e.target.value)}
                    className="w-full bg-[#FAF9F5] border-2 border-neutral-300 p-2.5 text-xs font-mono font-bold focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">
                    Broj telefona *
                  </label>
                  <input
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
                      <p><strong>Iznos narudžbe:</strong> {trackedOrder.total.toFixed(2)} KM (Pouzećem)</p>
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
                  Sve narudžbe zaprimljene radnim danom do 14:00h otpremaju se isti dan putem brze pošte <strong>X Express</strong>.
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
                  Dozvoljeno je otvoriti paket u prisustvu kurira i uvjeriti se u ispravnost i veličinu artikla prije davanja novca.
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
                  Ukoliko vam veličina ne odgovara, vršimo brzu zamjenu. Dovoljno je da nam se javite putem Instagrama ili kontakt forme.
                </p>
              </div>
            </div>

            {/* Uslovi povrata */}
            <div className="bg-white p-6 sm:p-8 border-2 border-neutral-200 space-y-4 text-xs text-neutral-700 leading-relaxed">
              <h3 className="font-['Poppins'] font-black text-base uppercase text-black">
                Pravila zamjene i povrata artikala
              </h3>
              <p>
                Kupac ima pravo na zamjenu artikla ili povrat novca unutar <strong>14 dana</strong> od dana prijema pošiljke, pod uslovom da artikal nije nošen, opran ili oštećen, te da posjeduje originalne etikete.
              </p>
              <p>
                Troškove povrata kod zamjene veličine snosi kupac, osim u slučaju kada je greškom poslat pogrešan model ili artikal sa fabričkim oštećenjem — u tom slučaju sve troškove snosi Casual Shop BiH.
              </p>
            </div>
          </div>
        )}

        {/* 2. STRANICA: KONTAKT */}
        {page === 'contact' && (
          <div className="space-y-10 animate-fadeIn">
            <div className="text-center space-y-2">
              <span className="text-[11px] font-['Poppins'] font-black uppercase tracking-[0.25em] bg-[#0A0A0A] text-[#F7E97F] px-2.5 py-1">
                PODRŠKA ZA KUPCE
              </span>
              <h1 className="font-['Poppins'] text-2xl sm:text-4xl font-black uppercase tracking-tight text-black">
                KONTAKTIRAJTE NAS
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 max-w-xl mx-auto">
                Tu smo za sva pitanja u vezi narudžbi, dostupnosti veličina i saradnje.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Kontakt podaci */}
              <div className="space-y-4">
                <div className="bg-white p-5 border-2 border-neutral-200 space-y-3">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-black" />
                    <div>
                      <p className="text-[10px] uppercase font-['Poppins'] font-bold text-neutral-400">Telefon / Viber / WhatsApp</p>
                      <p className="text-xs font-bold text-black">{(settings as any)?.contactPhone || '+387 61 000 000'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-black" />
                    <div>
                      <p className="text-[10px] uppercase font-['Poppins'] font-bold text-neutral-400">E-mail adresa</p>
                      <p className="text-xs font-bold text-black">{(settings as any)?.contactEmail || 'info@casualshop.ba'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Instagram className="w-4 h-4 text-black" />
                    <div>
                      <p className="text-[10px] uppercase font-['Poppins'] font-bold text-neutral-400">Instagram DM</p>
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

                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-black" />
                    <div>
                      <p className="text-[10px] uppercase font-['Poppins'] font-bold text-neutral-400">Radno vrijeme podrške</p>
                      <p className="text-xs font-bold text-black">Pon – Sub: 09:00 – 20:00h</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#F7E97F] border-2 border-[#0A0A0A] text-black text-xs space-y-1">
                  <p className="font-['Poppins'] font-black uppercase">Najbrži odgovor:</p>
                  <p className="text-[11px] leading-relaxed">
                    Za brza pitanja u vezi mjera i preuzimanja paketa, pišite nam direktno u <strong>Instagram DM</strong>.
                  </p>
                </div>
              </div>

              {/* Kontakt formular */}
              <div className="md:col-span-2 bg-white border-2 border-[#0A0A0A] p-6 sm:p-8 shadow-xl">
                {contactSuccess ? (
                  <div className="text-center py-12 space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                    <h3 className="font-['Poppins'] font-black uppercase text-base text-black">
                      Vaša poruka je uspješno poslana!
                    </h3>
                    <p className="text-xs text-neutral-600 max-w-sm mx-auto">
                      Hvala vam na javljanju. Naš tim će vam odgovoriti u najkraćem mogućem roku.
                    </p>
                    <button
                      onClick={() => setContactSuccess(false)}
                      className="px-5 py-2 bg-[#0A0A0A] text-white text-xs font-['Poppins'] font-bold uppercase tracking-wider hover:bg-[#F7E97F] hover:text-[#0A0A0A] transition-colors mt-2"
                    >
                      Pošalji novu poruku
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4 text-xs">
                    <h3 className="font-['Poppins'] font-black text-sm uppercase text-black mb-2">
                      Pošaljite nam poruku
                    </h3>

                    {contactError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs">
                        {contactError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">
                          Vaše ime i prezime *
                        </label>
                        <input
                          type="text"
                          required
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          placeholder="npr. Amar Hadžić"
                          className="w-full bg-[#FAF9F5] border-2 border-neutral-300 p-2.5 focus:border-black focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">
                          Broj telefona
                        </label>
                        <input
                          type="tel"
                          value={contactForm.phone}
                          onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                          placeholder="npr. 061 123 456"
                          className="w-full bg-[#FAF9F5] border-2 border-neutral-300 p-2.5 focus:border-black focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">
                        E-mail adresa
                      </label>
                      <input
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        placeholder="npr. amar@gmail.com"
                        className="w-full bg-[#FAF9F5] border-2 border-neutral-300 p-2.5 focus:border-black focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">
                        Vaša poruka *
                      </label>
                      <textarea
                        rows={5}
                        required
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        placeholder="Navedite artikal, veličinu ili pitanje koje vas zanima..."
                        className="w-full bg-[#FAF9F5] border-2 border-neutral-300 p-2.5 focus:border-black focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={contactSending}
                      className="w-full py-3 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-wider border-2 border-[#0A0A0A] transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{contactSending ? 'Slanje poruke...' : 'Pošalji upit'}</span>
                    </button>
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
                <strong>Casual Shop BiH</strong> nastao je iz ljubavi prema autentičnoj urbanoj i casual supkulturi. Naš cilj je ponuditi streetwear komade vrhunskog kroja i materijala koji savršeno spajaju udobnost, izdržljivost i upečatljiv vizuelni identitet.
              </p>

              <h2 className="font-['Poppins'] font-black text-base uppercase text-black pt-2">
                Beskompromisan kvalitet materijala
              </h2>
              <p>
                Svi naši artikli izrađeni su od 100% češljanog pamuka visoke gramature (240 GSM za majice, 350+ GSM za dukserice). Posebnu pažnju posvećujemo tehnologiji štampe i vezu kako bi boje i motivi ostali postojani i nakon velikog broja pranja.
              </p>

              <h2 className="font-['Poppins'] font-black text-base uppercase text-black pt-2">
                Kupovina bez ikakvog rizika
              </h2>
              <p>
                Kao domaći brend, svjesni smo važnosti povjerenja. Zato poslujemo isključivo po modelu <strong>plaćanja pouzećem</strong> sa ugovorenom brzom poštom koja omogućava otvaranje i pregled paketa prije preuzimanja.
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
                Korištenjem web stranice <strong>Casual Shop BiH</strong> prihvatate važeće uslove korištenja. Zadržavamo pravo izmjene asortimana, cijena i uslova poslovanja u bilo kojem trenutku bez prethodne najave.
              </p>

              <h2 className="font-['Poppins'] font-black text-sm uppercase text-black">2. Narudžbe i sklapanje ugovora</h2>
              <p>
                Narudžba se smatra prihvaćenom u trenutku kada kupac popuni i potvrdi narudžbeni obrazac na webshopu. Sve cijene su izražene u konvertibilnim markama (KM) i uključuju pripadajući porez.
              </p>

              <h2 className="font-['Poppins'] font-black text-sm uppercase text-black">3. Plaćanje i dostava</h2>
              <p>
                Plaćanje se vrši isključivo gotovinski kuriru prilikom preuzimanja pošiljke (plaćanje pouzećem). Kupac je dužan osigurati tačnost navedenih kontakt podataka i adrese za dostavu.
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
              <h2 className="font-['Poppins'] font-black text-sm uppercase text-black">1. Sigurnost vaših podataka</h2>
              <p>
                Casual Shop BiH poštuje privatnost svojih korisnika. Podaci koje unesete prilikom naručivanja (ime, adresa, broj telefona i e-mail) koriste se isključivo u svrhu realizacije isporuke i obavještavanja o statusu narudžbe.
              </p>

              <h2 className="font-['Poppins'] font-black text-sm uppercase text-black">2. Dijeljenje sa trećim stranama</h2>
              <p>
                Vaši podaci se dijele isključivo sa ugovorenom kurirskom službom (X Express) radi dostave pošiljke na vašu adresu. Podatke nikada ne prodajemo niti ustupamo trećim licima za marketinške svrhe bez vaše saglasnosti.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};