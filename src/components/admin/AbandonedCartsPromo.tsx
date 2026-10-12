import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Copy,
  Check,
  Download,
  Phone,
  Clock,
  Sparkles,
  X,
  Loader2,
  Ticket,
  CheckCircle2,
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { AbandonedCartSession } from '../../types';
import { getAbandonedCarts } from '../../lib/tracking';
import { createPromoCode } from '../../lib/promo';
import { useCart } from '../../context/CartContext';
import { db } from '../../lib/firebase';

export const AbandonedCartsPromo: React.FC = () => {
  const { settings } = useCart();
  const sellerEmail = settings?.email || 'info@casualshop.ba';

  const [carts, setCarts] = useState<AbandonedCartSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<AbandonedCartSession | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [emailMode, setEmailMode] = useState<'3days_no_code' | '5days_with_code'>('3days_no_code');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState('10%');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);

  const loadCarts = async () => {
    setLoading(true);
    try {
      const real = await getAbandonedCarts();
      setCarts(real || []);
    } catch {
      setCarts([]);
    } fontally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCarts();
  }, []);

  const parseDate = (dateVal: any): Date => {
    if (!dateVal) return new Date();
    if (typeof dateVal === 'object' && typeof dateVal.toDate === 'function') {
      return dateVal.toDate();
    }
    const parsed = new Date(dateVal);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  const handleOpenPromoModal = async (session: AbandonedCartSession) => {
    setSelectedSession(session);
    setEmailSentSuccess(false);

    const dateObj = parseDate(session.lastUpdated);
    const daysDiff = Math.floor((Date.now() - dateObj.getTime()) / (1000 * 3600 * 24));
    
    if (daysDiff >= 5) {
      setEmailMode('5days_with_code');
    } else {
      setEmailMode('3days_no_code');
    }

    try {
      const generated = await createPromoCode(
        session.email || 'gost@casualshop.ba',
        'abandoned_cart',
        48
      );
      setPromoCode(generated.code);
    } catch {
      setPromoCode('WELCOME10-OFF');
    }
  };

  const generateEmailBody = (session: AbandonedCartSession) => {
    const name = session.customerName || 'prijatelju';
    const itemsList = session.items
      .map((i) => `• ${i.name} (Veličina: ${i.size}) - ${i.quantity}x`)
      .join('\n');

    if (emailMode === '3days_no_code') {
      return `Pozdrav ${name},

Primijetili smo da ti se svidjela odjeća u Casual Shop BiH, ali nisi dovršio/la narudžbu:

${itemsList}

Tvoja kombinacija te i dalje čeka!

Plaćanje je sigurno pouzećem prilikom preuzimanja od kurira, a dostava stiže u roku 48–72h širom BiH.

Klikni na link i dovrši narudžbu dok su zalihe u tvojoj veličini još dostupne:
https://casualshopbih.pages.dev

Ako imaš pitanja oko veličine ili dostave, samo odgovori na ovu poruku ili nam se javi na Instagram @casualshop.bih.

Srdačan pozdrav,
Casual Shop BiH Tim`;
    }

    return `Pozdrav ${name},

Primijetili smo da ti se svidjela odjeća u Casual Shop BiH, ali nisi dovršio/la narudžbu:

${itemsList}

Kako bi tvoja kombinacija bila spremna, pripremili smo ekskluzivni promo kod za ${promoDiscount} popusta na tvoju korpu:

🎁 JEDINSTVENI PROMO KOD: ${promoCode} (Važi narednih 48 sati)

Plaćanje je sigurno pouzećem prilikom preuzimanja od kurira, a dostava stiže u roku 48–72h širom BiH.

Klikni na link i dovrši narudžbu dok su zalihe u tvojoj veličini još dostupne:
https://casualshopbih.pages.dev

Srdačan pozdrav,
Casual Shop BiH Tim`;
  };

  const generateEmailSubject = () => {
    if (emailMode === '3days_no_code') {
      return `Casual Shop BiH • Zaboravio/la si nešto u korpi?`;
    }
    return `Casual Shop BiH • Zaboravio/la si nešto u korpi? Poklanjamo ti ${promoDiscount} popusta!`;
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendDirectEmail = async () => {
    if (!selectedSession?.email) {
      alert('Kupac nema unesen e-mail.');
      return;
    }

    setSendingEmail(true);
    try {
      const fullEmailContent = generateEmailBody(selectedSession);
      const subjectText = generateEmailSubject();
      const itemsSummary = selectedSession.items
        .map((i) => `• ${i.name} (Veličina: ${i.size}) - ${i.quantity}x`)
        .join('\n');

      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: 'service_h4rxrv2',
          template_id: 'template_b7r6ees',
          user_id: 'mPKyquhWRcGkRq4gS',
          template_params: {
            from_name: 'Casual Shop BiH',
            from_email: sellerEmail,
            to_name: selectedSession.customerName || 'Kupac',
            to_email: selectedSession.email,
            customer_name: selectedSession.customerName || 'Kupac',
            customer_email: selectedSession.email,
            customer_phone: selectedSession.phone || '/',
            subject: subjectText,
            email_subject: subjectText,
            message: fullEmailContent,
            email_body: fullEmailContent,
            items_summary: itemsSummary,
            total_amount: `${selectedSession.subtotal.toFixed(2)} KM`,
            promo_code: emailMode === '5days_with_code' ? promoCode : 'Nema',
            discount_percent: emailMode === '5days_with_code' ? promoDiscount : '0%',
            reply_to: sellerEmail,
          },
        }),
      });

      if (response.ok) {
        setEmailSentSuccess(true);

        if (selectedSession.id) {
          try {
            const sessionRef = doc(db, 'cart_sessions', selectedSession.id);
            await updateDoc(sessionRef, {
              emailSent: true,
              emailSentAt: new Date().toISOString(),
            });
          } catch (e) {
            console.warn('Upozorenje pri ažuriranju statusa u bazi:', e);
          }
        }

        setCarts((prev) =>
          prev.map((c) =>
            c.id === selectedSession.id || c.email === selectedSession.email
              ? { ...c, emailSent: true, emailSentAt: new Date().toISOString() }
              : c
          )
        );
      } else {
        const errText = await response.text();
        console.error('EmailJS Error:', errText);
        alert(`Slanje e-maila nije uspjelo: ${errText}`);
      }
    } catch (err) {
      console.error('Greška pri slanju e-maila:', err);
      alert('Mrežna greška pri slanju.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleExportLeadsCSV = () => {
    const headers = 'Ime,Email,Telefon,Vrijednost KM,Artikli u korpi,Datum,Email Poslan\n';
    const rows = carts
      .map((c) => {
        const itemNames = c.items.map((i) => `${i.name} (${i.size})`).join('; ');
        const formattedDate = parseDate(c.lastUpdated).toLocaleString('bs-BA');
        return `"${c.customerName || ''}","${c.email || ''}","${c.phone || ''}","${c.subtotal.toFixed(2)}","${itemNames}","${formattedDate}","${c.emailSent ? 'Da' : 'Ne'}"`;
      })
      .join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(headers + rows);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `casualshop_napustene_korpe_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border-2 border-neutral-200 p-5 sm:p-7 space-y-6 shadow-sm font-['Inter']">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-['Poppins'] font-black uppercase tracking-[0.2em] bg-[#0A0A0A] text-[#F7E97F] px-2 py-0.5 border border-[#F7E97F]">
              SMART MARKETING
            </span>
            <span className="text-xs text-neutral-500 font-medium">Automatizacija Podsjetnika</span>
          </div>
          <h3 className="font-['Poppins'] text-lg sm:text-xl font-black uppercase tracking-tight text-neutral-900 mt-1 flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#0A0A0A]" />
            <span>Napuštene korpe & E-mail Podsjetnici</span>
          </h3>
          <p className="text-xs text-neutral-500 font-['Inter']">
            Slanje podsjetnika u 2 koraka: Obični podsjetnik nakon 3 dni ili podsjetnik sa promo kodom od 10% nakon 5 dni.
          </p>
        </div>

        <button
          onClick={handleExportLeadsCSV}
          className="px-3.5 py-2 bg-white border-2 border-neutral-300 text-xs font-['Poppins'] font-bold uppercase tracking-wider flex items-center gap-2 text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Izvezi kontakte (CSV)</span>
        </button>
      </div>

      <div className="bg-[#F4F2EC] border border-neutral-300 p-4 flex items-start gap-3 text-xs text-neutral-700 font-['Inter']">
        <Sparkles className="w-5 h-5 text-[#0A0A0A] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-neutral-900">
            Logika i opcije slanja e-mail podsjetnika:
          </p>
          <p>
            • <strong>Opcija 1 (Nakon 3 dana):</strong> Šalje se podsjetnik bez promo koda na zaboravljene artikle.<br />
            • <strong>Opcija 2 (Nakon 5 dni):</strong> Šalje se podsjetnik sa ekskluzivnim promo kodom od 10% koji važi 48 sati.<br />
            • <strong>Status slanja:</strong> Nakon slanja emaila, korpa se označava kao **POSLANO** kako ne biste ponavljali slanje.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto border border-neutral-200">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#0A0A0A] text-white font-['Poppins'] font-bold uppercase text-[11px]">
            <tr>
              <th className="p-3">Kupac / Kontakt</th>
              <th className="p-3">Artikli u korpi</th>
              <th className="p-3">Vrijednost</th>
              <th className="p-3">Starost korpe</th>
              <th className="p-3">Status Emaila</th>
              <th className="p-3 text-right">Akcija</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 font-['Inter']">
            {carts.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-neutral-500 font-['Inter']">
                  {loading ? 'Učitavanje napuštenih korpi...' : 'Trenutno nema napuštenih korpi u bazi.'}
                </td>
              </tr>
            ) : (
              carts.map((c) => {
                const dateObj = parseDate(c.lastUpdated);
                const daysDiff = Math.floor((Date.now() - dateObj.getTime()) / (1000 * 3600 * 24));
                const is3Days = daysDiff >= 3 && daysDiff < 5;
                const is5DaysPlus = daysDiff >= 5;

                return (
                  <tr key={c.id || c.email} className="hover:bg-neutral-50">
                    <td className="p-3">
                      <div className="font-bold text-neutral-900 font-['Poppins']">
                        {c.customerName || 'Nepoznat kupac'}
                      </div>
                      {c.email && (
                        <div className="text-neutral-600 flex items-center gap-1.5 mt-0.5 text-[11px]">
                          <Mail className="w-3 h-3 text-neutral-400" />
                          <a href={`mailto:${c.email}`} className="hover:underline">
                            {c.email}
                          </a>
                        </div>
                      )}
                      {c.phone && (
                        <div className="text-neutral-500 flex items-center gap-1.5 text-[11px]">
                          <Phone className="w-3 h-3 text-neutral-400" />
                          <span>{c.phone}</span>
                        </div>
                      )}
                    </td>

                    <td className="p-3">
                      <div className="space-y-1">
                        {c.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-[11px]">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-6 h-7 object-cover bg-neutral-100 border border-neutral-200 shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/images/sarajevo_geo_tee.jpg';
                              }}
                            />
                            <span className="font-medium text-neutral-800 line-clamp-1">
                              {item.name} ({item.size})
                            </span>
                            <span className="text-neutral-400 font-mono">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="p-3 font-['Poppins'] font-black text-black whitespace-nowrap">
                      {c.subtotal.toFixed(2)} KM
                    </td>

                    <td className="p-3 text-neutral-500 whitespace-nowrap text-[11px]">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-neutral-400" />
                        <span>{dateObj.toLocaleDateString('bs-BA')}</span>
                      </div>
                      {is3Days && (
                        <span className="text-[10px] font-['Poppins'] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 mt-1 inline-block">
                          Podsjetnik (3 dana)
                        </span>
                      )}
                      {is5DaysPlus && (
                        <span className="text-[10px] font-['Poppins'] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-1 inline-block">
                          Slanje promo koda (5+ dana)
                        </span>
                      )}
                    </td>

                    <td className="p-3">
                      {c.emailSent ? (
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-['Poppins'] font-bold uppercase rounded border border-emerald-300 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Email Poslan</span>
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-amber-100 text-amber-800 text-[10px] font-['Poppins'] font-bold uppercase rounded border border-amber-300">
                          Nije Poslano
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleOpenPromoModal(c)}
                        disabled={c.emailSent || !c.email}
                        className="px-3.5 py-2 bg-[#0A0A0A] hover:bg-[#F7E97F] hover:text-[#0A0A0A] text-white text-[11px] font-['Poppins'] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 border border-[#0A0A0A] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{c.emailSent ? 'Već Poslano' : 'Pošalji Email'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn font-['Inter']">
          <div className="bg-white max-w-2xl w-full border-2 border-[#F7E97F] shadow-2xl p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b-2 border-neutral-200">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#0A0A0A]" />
                <h3 className="font-['Poppins'] text-sm sm:text-base font-black uppercase tracking-wider text-black">
                  Slanje e-mail podsjetnika kupcu
                </h3>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-1 text-neutral-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {emailSentSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-['Poppins'] font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>E-mail obavijest je uspješno poslana na adresu {selectedSession.email}!</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider block font-['Poppins']">
                Odaberite opciju slanja:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEmailMode('3days_no_code')}
                  className={`p-3 text-left border-2 transition-all cursor-pointer ${
                    emailMode === '3days_no_code'
                      ? 'border-black bg-[#F4F2EC]'
                      : 'border-neutral-200 bg-white hover:border-neutral-400'
                  }`}
                >
                  <div className="flex items-center gap-2 font-['Poppins'] font-bold text-xs text-black">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>1. Nakon 3 dana (BEZ koda)</span>
                  </div>
                  <p className="text-[11px] text-neutral-600 mt-1">
                    Standardni podsjetnik na zaboravljene artikle.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setEmailMode('5days_with_code')}
                  className={`p-3 text-left border-2 transition-all cursor-pointer ${
                    emailMode === '5days_with_code'
                      ? 'border-black bg-[#F4F2EC]'
                      : 'border-neutral-200 bg-white hover:border-neutral-400'
                  }`}
                >
                  <div className="flex items-center gap-2 font-['Poppins'] font-bold text-xs text-black">
                    <Ticket className="w-4 h-4 text-amber-600" />
                    <span>2. Nakon 5 dni (SA kodom 10%)</span>
                  </div>
                  <p className="text-[11px] text-neutral-600 mt-1">
                    Uključuje generisani promo kod koji važi 48 sati.
                  </p>
                </button>
              </div>
            </div>

            <div className="bg-[#F4F2EC] p-3 text-xs flex flex-wrap justify-between gap-3">
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-bold">Kupac</span>
                <strong className="text-black font-['Poppins']">{selectedSession.customerName || 'Nepoznato'}</strong>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-bold">Email</span>
                <strong className="text-black font-mono">{selectedSession.email || 'Nema e-maila'}</strong>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-bold">Vrijednost korpe</span>
                <strong className="text-black font-['Poppins']">{selectedSession.subtotal.toFixed(2)} KM</strong>
              </div>
            </div>

            {emailMode === '5days_with_code' && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Generisani Promo Kod (48h):</label>
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    className="w-full p-2 border-2 border-neutral-300 font-mono font-bold text-sm bg-neutral-50 focus:border-black focus:outline-none text-[#0A0A0A]"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Popust:</label>
                  <input
                    type="text"
                    value={promoDiscount}
                    readOnly
                    className="w-full p-2 border-2 border-neutral-300 font-bold text-sm bg-neutral-100 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                Naslov e-maila (Subject):
              </label>
              <div className="p-2.5 bg-neutral-100 border border-neutral-300 text-xs font-bold text-neutral-900 font-['Poppins']">
                {generateEmailSubject()}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                Tijelo e-mail poruke:
              </label>
              <textarea
                readOnly
                rows={8}
                value={generateEmailBody(selectedSession)}
                className="w-full p-3 bg-neutral-50 border-2 border-neutral-300 text-xs text-neutral-800 leading-relaxed font-mono resize-none focus:outline-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2">
              <button
                onClick={() => handleCopyText(generateEmailBody(selectedSession))}
                className="px-4 py-2.5 bg-white border-2 border-neutral-300 hover:bg-neutral-100 text-xs font-['Poppins'] font-bold uppercase tracking-wider flex items-center justify-center gap-2 text-neutral-800 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Kopirano!' : 'Kopiraj tekst'}</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedSession.email && (
                  <button
                    onClick={handleSendDirectEmail}
                    disabled={sendingEmail || selectedSession.emailSent}
                    className="px-4 py-2.5 bg-[#0A0A0A] hover:bg-[#F7E97F] hover:text-[#0A0A0A] text-white text-xs font-['Poppins'] font-bold uppercase tracking-wider flex items-center gap-2 border-2 border-[#0A0A0A] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {sendingEmail ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    <span>{sendingEmail ? 'Slanje...' : selectedSession.emailSent ? 'Već Poslano' : 'Pošalji e-mail'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
