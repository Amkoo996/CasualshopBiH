"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Truck, ShieldCheck, CheckCircle2, AlertCircle, Search, Mail, Clock, Send, Package, RotateCcw, Instagram, ArrowRight, MapPin
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { getOrderStatus } from '../lib/db';
import { db } from '../lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';

interface StaticPageProps {
  page: 'about' | 'contact' | 'terms' | 'shipping' | 'privacy';
}

const isEmailValid = (text: string) => text.includes('@') && text.includes('.');
const isPhoneValid = (text: string) => text.replace(/\D/g, '').length >= 6;

export const StaticPages: React.FC<StaticPageProps> = ({ page }) => {
  const { settings } = useCart();

  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [contactSending, setContactSending] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState('');

  const [trackingOrderNumber, setTrackingOrderNumber] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState<{ orderNumber: string; status: string; createdAt: string } | null>(null);
  const [trackingError, setTrackingError] = useState('');

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError('');

    const safeName = contactForm.name.trim();
    const safeEmail = contactForm.email.trim();
    const safePhone = contactForm.phone.trim();
    const safeMessage = contactForm.message.trim();

    if (!safeName || !safeMessage) { setContactError('Molimo unesite vaše ime i poruku.'); return; }
    if (!safeEmail) { setContactError('E-mail adresa je obavezna.'); return; } 
    else if (!isEmailValid(safeEmail)) { setContactError('Molimo unesite ispravnu e-mail adresu.'); return; }
    if (safePhone && !isPhoneValid(safePhone)) { setContactError('Molimo unesite ispravan broj telefona.'); return; }

    setContactSending(true);

    try {
      const newMsgRef = doc(collection(db, 'contact_messages'));
      await setDoc(newMsgRef, {
        id: newMsgRef.id, name: safeName, email: safeEmail, phone: safePhone, message: safeMessage, createdAt: new Date().toISOString(), read: false
      }).catch(() => {});

      const telegramText = `📩 NOVI KONTAKT UPIT\n━━━━━━━━━━━━━━━━━━\n👤 Ime: ${safeName}\n📞 Tel: ${safePhone || 'Nije navedeno'}\n✉️ Email: ${safeEmail}\n━━━━━━━━━━━━━━━━━━\n💬 Poruka:\n${safeMessage}`;

      await fetch('/api/notify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: telegramText, type: 'contact' }),
      });

      setContactSuccess(true);
      setContactForm({ name: '', email: '', phone: '', message: '' });
    } catch {
      setContactError('Došlo je do greške prilikom slanja. Javite se na Instagram.');
    } finally {
      setContactSending(false);
    }
  };

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackingError('');
    setTrackedOrder(null);

    if (!trackingOrderNumber.trim()) { setTrackingError('Molimo unesite broj narudžbe.'); return; }
    setTrackingLoading(true);

    try {
      const order = await getOrderStatus(trackingOrderNumber);
      if (order) setTrackedOrder({ orderNumber: trackingOrderNumber, status: order.status, createdAt: order.createdAt });
      else setTrackingError('Nismo pronašli narudžbu s navedenim brojem.');
    } catch { setTrackingError('Trenutno nije moguće provjeriti status.'); } 
    finally { setTrackingLoading(false); }
  };

  return (
    <div className="bg-[#FAF9F5] text-neutral-900 min-h-screen py-10 sm:py-16 font-['Inter']">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* 1. DOSTAVA I POVRAT + PRAĆENJE */}
        {page === 'shipping' && (
          <div className="space-y-10 animate-fadeIn">
            <div className="text-center space-y-2">
              <span className="text-[11px] font-['Poppins'] font-black uppercase tracking-[0.25em] bg-[#0A0A0A] text-[#F7E97F] px-2.5 py-1">INFORMACIJE ZA KUPCE</span>
              <h1 className="font-['Poppins'] text-2xl sm:text-4xl font-black uppercase tracking-tight text-black">DOSTAVA, PLAĆANJE I POVRAT</h1>
              <p className="text-xs sm:text-sm text-neutral-600 max-w-xl mx-auto">Brza pošta širom Bosne i Hercegovine uz pregled paketa prije plaćanja pouzećem.</p>
            </div>

            <div className="bg-white border-2 border-[#0A0A0A] p-6 sm:p-8 shadow-xl space-y-5">
              <div className="flex items-center gap-3 border-b-2 border-neutral-100 pb-4">
                <div className="p-2.5 bg-[#F7E97F] text-[#0A0A0A] rounded"><Package className="w-5 h-5" /></div>
                <div>
                  <h2 className="font-['Poppins'] font-black text-sm uppercase tracking-wider text-black">Gdje je moja pošiljka?</h2>
                  <p className="text-xs text-neutral-500">Unesite broj narudžbe za provjeru statusa.</p>
                </div>
              </div>

              <form onSubmit={handleTrackOrder} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">Broj narudžbe *</label>
                  <input type="text" required placeholder="npr. CS-1014-4R03" value={trackingOrderNumber} onChange={(e) => setTrackingOrderNumber(e.target.value)} className="w-full bg-[#FAF9F5] border-2 border-neutral-300 p-2.5 text-xs font-mono font-bold focus:border-black focus:outline-none" />
                </div>
                <div className="flex items-end sm:w-1/3">
                  <button type="submit" disabled={trackingLoading} className="w-full py-2.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-wider border-2 border-[#0A0A0A] transition-colors cursor-pointer flex items-center justify-center gap-1.5">
                    <Search className="w-4 h-4" /><span>{trackingLoading ? 'Traženje...' : 'Provjeri status'}</span>
                  </button>
                </div>
              </form>

              {trackingError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span>{trackingError}</span></div>}
              
              {/* SAKRIVENI LIČNI PODACI ZBOG SIGURNOSTI */}
              {trackedOrder && (
                <div className="p-4 bg-[#FAF9F5] border-2 border-[#F7E97F] space-y-3 animate-fadeIn text-xs">
                  <div className="flex justify-between items-center border-b border-neutral-200 pb-2">
                    <span className="font-['Poppins'] font-black uppercase text-black text-sm">Narudžba #{trackedOrder.orderNumber.replace(/^#/, '')}</span>
                    <span className="px-2.5 py-1 bg-[#0A0A0A] text-[#F7E97F] font-['Poppins'] font-bold text-[10px] uppercase">Status: {trackedOrder.status}</span>
                  </div>
                  <div className="space-y-1 text-neutral-700">
                    <p><strong>Datum narudžbe:</strong> {new Date(trackedOrder.createdAt).toLocaleDateString('bs-BA')}</p>
                    <p className="text-neutral-500 italic mt-1">Radi zaštite ličnih podataka, detalji o kupcu i artiklima nisu javno prikazani.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 border-2 border-neutral-200 space-y-2">
                <div className="w-10 h-10 bg-[#F7E97F] text-black flex items-center justify-center font-bold mb-3"><Truck className="w-5 h-5" /></div>
                <h3 className="font-['Poppins'] font-black text-sm uppercase text-black">Rok isporuke 48–72h</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">Narudžbe zaprimljene radnim danom do 12:00h šalju se isti dan putem ugovorene brze pošte <strong>X Express</strong>.</p>
              </div>
              <div className="bg-white p-6 border-2 border-neutral-200 space-y-2">
                <div className="w-10 h-10 bg-[#F7E97F] text-black flex items-center justify-center font-bold mb-3"><ShieldCheck className="w-5 h-5" /></div>
                <h3 className="font-['Poppins'] font-black text-sm uppercase text-black">Pregled prije plaćanja</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">Dozvoljeno je otvoriti paket pred kurirom i provjeriti artikal prije davanja novca.</p>
              </div>
              <div className="bg-white p-6 border-2 border-neutral-200 space-y-2">
                <div className="w-10 h-10 bg-[#F7E97F] text-black flex items-center justify-center font-bold mb-3"><RotateCcw className="w-5 h-5" /></div>
                <h3 className="font-['Poppins'] font-black text-sm uppercase text-black">Zamjena veličine</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">Ako veličina ne odgovara, vršimo brzu zamjenu unutar 3 dana od preuzimanja paketa.</p>
              </div>
            </div>
          </div>
        )}

        {/* 2. KONTAKT */}
        {page === 'contact' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center space-y-2">
              <span className="text-[11px] font-['Poppins'] font-black uppercase tracking-[0.25em] bg-[#0A0A0A] text-[#F7E97F] px-3 py-1 border border-black shadow-sm">KORISNIČKA PODRŠKA</span>
              <h1 className="font-['Poppins'] text-3xl sm:text-5xl font-black uppercase tracking-tight text-black pt-2">KONTAKTIRAJTE NAS</h1>
              <p className="text-xs sm:text-sm text-neutral-600 max-w-lg mx-auto">Tu smo za sva pitanja u vezi dostupnosti modela, veličina i narudžbi.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-4">
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white border-2 border-black p-6 sm:p-7 shadow-lg space-y-5">
                  <div className="border-b border-neutral-100 pb-3">
                    <span className="font-['Poppins'] font-black text-xs uppercase tracking-wider text-black block">Direktni kanali podrške</span>
                    <span className="text-[11px] text-neutral-400">Casual Shop BiH tim vam stoji na raspolaganju.</span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-9 h-9 bg-[#FAF9F5] border border-neutral-300 flex items-center justify-center shrink-0"><Mail className="w-4 h-4 text-black" /></div>
                      <div>
                        <p className="text-[10px] uppercase font-['Poppins'] font-bold text-neutral-400">E-mail adresa</p>
                        <p className="text-xs font-bold text-black font-mono">{(settings as any)?.contactEmail || 'info@casualshop.ba'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3.5">
                      <div className="w-9 h-9 bg-[#FAF9F5] border border-neutral-300 flex items-center justify-center shrink-0"><Instagram className="w-4 h-4 text-black" /></div>
                      <div>
                        <p className="text-[10px] uppercase font-['Poppins'] font-bold text-neutral-400">Instagram podrška</p>
                        <a href={(settings as any)?.instagramUrl || 'https://www.instagram.com/casualshop.bih'} target="_blank" rel="noreferrer" className="text-xs font-bold text-black hover:text-amber-700 underline">@casualshop.bih</a>
                      </div>
                    </div>
                    <div className="flex items-start gap-3.5">
                      <div className="w-9 h-9 bg-[#FAF9F5] border border-neutral-300 flex items-center justify-center shrink-0"><Clock className="w-4 h-4 text-black" /></div>
                      <div>
                        <p className="text-[10px] uppercase font-['Poppins'] font-bold text-neutral-400">Radno vrijeme</p>
                        <p className="text-xs font-bold text-black">Pon – Sub: 09:00 – 20:00h</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-[#F7E97F] border-2 border-black text-black space-y-1 shadow-md">
                  <p className="font-['Poppins'] font-black text-xs uppercase flex items-center gap-1.5"><span>⚡ Najbrži odgovor:</span></p>
                  <p className="text-[11px] leading-relaxed">Za brze upite oko veličina i slanja paketa, pošaljite nam poruku u <strong>Instagram DM</strong>.</p>
                </div>
              </div>

              <div className="lg:col-span-7 bg-white border-2 border-black p-6 sm:p-8 shadow-2xl">
                {contactSuccess ? (
                  <div className="text-center py-12 space-y-4 animate-fadeIn">
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-700 flex items-center justify-center rounded-full mx-auto border-2 border-emerald-600"><CheckCircle2 className="w-8 h-8" /></div>
                    <div className="space-y-1">
                      <h3 className="font-['Poppins'] font-black uppercase text-base text-black">Poruka je uspješno poslana!</h3>
                      <p className="text-xs text-neutral-600 max-w-sm mx-auto">Vaš upit je zaprimljen u sistemu podrške. Odgovorit ćemo vam u najkraćem roku.</p>
                    </div>
                    <button onClick={() => setContactSuccess(false)} className="px-6 py-2.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] text-xs font-['Poppins'] font-black uppercase tracking-wider transition-colors border-2 border-black cursor-pointer">Pošalji novi upit</button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4 text-xs">
                    <div className="border-b border-neutral-200 pb-3">
                      <h3 className="font-['Poppins'] font-black text-sm uppercase text-black tracking-wide">Pošaljite nam poruku</h3>
                      <p className="text-[11px] text-neutral-500">Ispunite obrazac i javljamo se povratno.</p>
                    </div>

                    {contactError && <div className="p-3 bg-red-50 border-2 border-red-300 text-red-700 text-xs flex items-center gap-2 animate-fadeIn"><AlertCircle className="w-4 h-4 shrink-0" /><span>{contactError}</span></div>}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="st-contactName" className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1 text-neutral-800">Vaše ime i prezime *</label>
                        <input id="st-contactName" name="contactName" autoComplete="name" type="text" required value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} className="w-full bg-[#FAF9F5] border-2 border-neutral-300 p-2.5 text-xs text-black font-medium focus:border-black focus:bg-white focus:outline-none transition-colors" />
                      </div>
                      <div>
                        <label htmlFor="st-contactPhone" className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1 text-neutral-800">Broj telefona</label>
                        <input id="st-contactPhone" name="contactPhone" autoComplete="tel" type="tel" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} className="w-full bg-[#FAF9F5] border-2 border-neutral-300 p-2.5 text-xs text-black font-medium focus:border-black focus:bg-white focus:outline-none transition-colors" />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="st-contactEmail" className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1 text-neutral-800">E-mail adresa *</label>
                      <input id="st-contactEmail" name="contactEmail" autoComplete="email" type="email" required value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} className="w-full bg-[#FAF9F5] border-2 border-neutral-300 p-2.5 text-xs text-black font-medium focus:border-black focus:bg-white focus:outline-none transition-colors" />
                    </div>

                    <div>
                      <label htmlFor="st-contactMessage" className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1 text-neutral-800">Vaša poruka *</label>
                      <textarea id="st-contactMessage" name="contactMessage" rows={5} required value={contactForm.message} onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })} placeholder="Navedite model, veličinu ili pitanje koje vas zanima..." className="w-full bg-[#FAF9F5] border-2 border-neutral-300 p-2.5 text-xs text-black font-medium focus:border-black focus:bg-white focus:outline-none transition-colors" />
                    </div>

                    <div className="pt-2">
                      <button type="submit" disabled={contactSending} className="w-full py-3.5 bg-[#F7E97F] hover:bg-yellow-300 text-black border-2 border-black font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50 active:scale-98">
                        <Send className="w-3.5 h-3.5" /><span>{contactSending ? 'Slanje poruke...' : 'Pošalji upit'}</span><ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. O NAMA */}
        {page === 'about' && (
          <div className="space-y-8 animate-fadeIn text-neutral-800 leading-relaxed text-xs sm:text-sm">
            <div className="text-center space-y-2">
              <span className="text-[11px] font-['Poppins'] font-black uppercase tracking-[0.25em] bg-[#0A0A0A] text-[#F7E97F] px-3 py-1 border border-black shadow-sm">O NAMA</span>
              <h1 className="font-['Poppins'] text-3xl sm:text-5xl font-black uppercase tracking-tight text-black pt-2">NAŠA PRIČA</h1>
            </div>

            <div className="bg-white p-6 sm:p-10 border-2 border-neutral-200 shadow-sm space-y-6">
              <p className="font-medium text-neutral-900 leading-relaxed text-sm sm:text-base">
                <strong>Casual Shop BiH</strong> je nastao iz strasti prema autentičnoj urbanoj i casual supkulturi. Željeli smo stvoriti mjesto gdje ljubitelji ulične mode mogu pronaći odjeću koja ne samo da izgleda moćno, već i traje.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-neutral-100">
                <div className="space-y-2">
                  <div className="w-10 h-10 bg-[#F7E97F] text-black flex items-center justify-center rounded-full"><RotateCcw className="w-5 h-5" /></div>
                  <h2 className="font-['Poppins'] font-black text-sm uppercase text-black">Beskompromisan kvalitet</h2>
                  <p className="text-xs text-neutral-600">Svi naši artikli izrađeni su od 100% češljanog pamuka visoke gramature (240 GSM za majice, 350+ GSM za dukserice). Štampa je rađena najsavremenijim metodama koje garantuju dugotrajnost, čak i nakon brojnih pranja.</p>
                </div>
                <div className="space-y-2">
                  <div className="w-10 h-10 bg-[#F7E97F] text-black flex items-center justify-center rounded-full"><ShieldCheck className="w-5 h-5" /></div>
                  <h2 className="font-['Poppins'] font-black text-sm uppercase text-black">100% sigurna kupovina</h2>
                  <p className="text-xs text-neutral-600">Kao domaći brend, poslujemo isključivo po modelu plaćanja pouzećem. Paketi se isporučuju preko brze pošte, a imate pravo otvoriti paket pred kurirom i provjeriti artikal prije preuzimanja.</p>
                </div>
              </div>
              
              <div className="bg-[#FAF9F5] p-5 border border-neutral-200 mt-6">
                <h3 className="font-['Poppins'] font-black text-xs uppercase text-black mb-2 flex items-center gap-2"><MapPin className="w-4 h-4 text-red-600" /> Naša misija</h3>
                <p className="text-xs text-neutral-600">Postati prva asocijacija za vrhunski streetwear na Balkanu, pružajući odjeću koja predstavlja stav, udobnost i prepoznatljiv identitet svakog pojedinca na ulici.</p>
              </div>
            </div>
          </div>
        )}

        {/* 4. USLOVI KORIŠTENJA */}
        {page === 'terms' && (
          <div className="space-y-8 animate-fadeIn text-neutral-800 leading-relaxed text-xs sm:text-sm">
            <div className="text-center space-y-2">
              <span className="text-[11px] font-['Poppins'] font-black uppercase tracking-[0.25em] bg-[#0A0A0A] text-[#F7E97F] px-2.5 py-1">PRAVNI USLOVI</span>
              <h1 className="font-['Poppins'] text-2xl sm:text-4xl font-black uppercase tracking-tight text-black">USLOVI KORIŠTENJA WEBSHOPA</h1>
            </div>

            <div className="bg-white p-6 sm:p-10 border-2 border-neutral-200 shadow-sm space-y-6">
              <div className="space-y-2">
                <h2 className="font-['Poppins'] font-black text-sm uppercase text-black">1. Opšte odredbe i prihvatanje uslova</h2>
                <p className="text-xs text-neutral-600">Korištenjem web stranice Casual Shop BiH, kao i naručivanjem proizvoda, korisnik potvrđuje da je pročitao i u potpunosti prihvatio ove Uslove korištenja. Zadržavamo pravo izmjene uslova poslovanja u bilo kojem trenutku bez prethodne najave.</p>
              </div>
              
              <div className="space-y-2 pt-4 border-t border-neutral-100">
                <h2 className="font-['Poppins'] font-black text-sm uppercase text-black">2. Cijene i narudžba</h2>
                <p className="text-xs text-neutral-600">Sve cijene navedene na webshopu izražene su u konvertibilnim markama (KM). Cijena dostave nije uključena u cijenu proizvoda, osim ako to nije posebno naznačeno ili ako se ostvari pravo na besplatnu dostavu preko određenog iznosa narudžbe. Ugovor o kupovini smatra se sklopljenim u trenutku kada kupac kompletira formu za Checkout.</p>
              </div>
              
              <div className="space-y-2 pt-4 border-t border-neutral-100">
                <h2 className="font-['Poppins'] font-black text-sm uppercase text-black">3. Plaćanje i dostava</h2>
                <p className="text-xs text-neutral-600">Plaćanje se vrši isključivo gotovinski kuriru prilikom preuzimanja paketa na adresi (plaćanje pouzećem). Usluga dostave se vrši preko partnerske brze pošte. Rok isporuke iznosi 48-72h. Casual Shop BiH ne odgovara za kašnjenja nastala od strane kurirske službe.</p>
              </div>

              <div className="space-y-2 pt-4 border-t border-neutral-100">
                <h2 className="font-['Poppins'] font-black text-sm uppercase text-black">4. Zamjene i povrat</h2>
                <p className="text-xs text-neutral-600">Kupac ima pravo zatražiti zamjenu veličine u roku od 3 dana od trenutka preuzimanja paketa, pod uslovom da artikal nije nošen, opran ili oštećen, te da ima originalne etikete. Troškove poštarine za zamjenu snosi kupac.</p>
              </div>
            </div>
          </div>
        )}

        {/* 5. POLITIKA PRIVATNOSTI */}
        {page === 'privacy' && (
          <div className="space-y-8 animate-fadeIn text-neutral-800 leading-relaxed text-xs sm:text-sm">
            <div className="text-center space-y-2">
              <span className="text-[11px] font-['Poppins'] font-black uppercase tracking-[0.25em] bg-[#0A0A0A] text-[#F7E97F] px-2.5 py-1">ZAŠTITA PODATAKA</span>
              <h1 className="font-['Poppins'] text-2xl sm:text-4xl font-black uppercase tracking-tight text-black">POLITIKA PRIVATNOSTI</h1>
            </div>

            <div className="bg-white p-6 sm:p-10 border-2 border-neutral-200 shadow-sm space-y-6">
              <p className="font-medium text-neutral-900 text-sm mb-4">Vaša privatnost nam je prioritet. Ova politika objašnjava kako Casual Shop BiH prikuplja, koristi i štiti vaše lične podatke.</p>
              
              <div className="space-y-2 pt-4 border-t border-neutral-100">
                <h2 className="font-['Poppins'] font-black text-sm uppercase text-black">1. Prikupljanje ličnih podataka</h2>
                <p className="text-xs text-neutral-600">Kada naručujete proizvode na našoj stranici, tražimo podatke neophodne za isporuku: ime, prezime, adresu, grad, i kontakt telefon. Vaša e-mail adresa se koristi za potvrdu narudžbe i slanje broja za praćenje pošiljke.</p>
              </div>
              
              <div className="space-y-2 pt-4 border-t border-neutral-100">
                <h2 className="font-['Poppins'] font-black text-sm uppercase text-black">2. Svrha korištenja podataka</h2>
                <p className="text-xs text-neutral-600">Vaši podaci koriste se isključivo za: obradu i slanje narudžbe, komunikaciju vezanu za status narudžbe te podršku kupcima. Ukoliko ste se prijavili na naš Newsletter, vašu adresu koristimo za slanje obavještenja o popustima i novim kolekcijama.</p>
              </div>

              <div className="space-y-2 pt-4 border-t border-neutral-100">
                <h2 className="font-['Poppins'] font-black text-sm uppercase text-black">3. Zaštita i dijeljenje sa trećim licima</h2>
                <p className="text-xs text-neutral-600">Svi podaci koje unesete su sigurno pohranjeni. Podatke (Ime, Prezime, Adresu, Telefon) dijelimo isključivo sa našom partnerskom kurirskom službom (X Express Brza Pošta) u svrhu isporuke paketa. Nikada nećemo prodati ili ustupiti vaše podatke trećim stranama u marketinške svrhe.</p>
              </div>

              <div className="space-y-2 pt-4 border-t border-neutral-100">
                <h2 className="font-['Poppins'] font-black text-sm uppercase text-black">4. Korištenje kolačića (Cookies)</h2>
                <p className="text-xs text-neutral-600">Naša web stranica koristi osnovne kolačiće za funkcioniranje sistema korpe (spremanje artikala u korpi) i analitiku posjećenosti. Korištenjem stranice pristajete na upotrebu tehnički neophodnih kolačića.</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
