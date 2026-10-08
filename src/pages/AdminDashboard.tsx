import React, { useState, useEffect } from 'react';
import { Mail, Copy, Check, Send, AlertCircle, RefreshCw, MessageSquare } from 'lucide-react';
import { getAbandonedCarts, AbandonedCart } from '../../lib/tracking';
import { createPromoCode } from '../../lib/promo';

export const AbandonedCartsPromo: React.FC = () => {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCart, setSelectedCart] = useState<AbandonedCart | null>(null);
  
  // Promo kod i email state
  const [promoCode, setPromoCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(10);
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ success: boolean; message: string } | null>(null);

  const fetchCarts = async () => {
    setLoading(true);
    try {
      const data = await getAbandonedCarts();
      setCarts(data);
      if (data.length > 0 && !selectedCart) {
        setSelectedCart(data[0]);
      }
    } catch (err) {
      console.error('Greška pri dohvatanju napuštenih korpi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCarts();
  }, []);

  // Generisanje promo koda za izabranu korpu
  useEffect(() => {
    if (selectedCart && selectedCart.email) {
      generateCodeForCart(selectedCart.email);
    }
  }, [selectedCart]);

  const generateCodeForCart = async (email: string) => {
    try {
      const promo = await createPromoCode(email, 'abandoned_cart', 48); // Trajanje 48 sati
      setPromoCode(promo.code);
    } catch (err) {
      console.warn('Greška pri kreiranju promo koda:', err);
      // Fallback kod ako baza vrati grešku
      setPromoCode(`WELCOME10-${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-8 border-2 border-neutral-200 text-center space-y-3 font-['Inter']">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-neutral-600" />
        <p className="text-xs text-neutral-600">Učitavanje napuštenih korpi...</p>
      </div>
    );
  }

  if (carts.length === 0) {
    return (
      <div className="bg-white p-8 border-2 border-neutral-200 text-center space-y-2 font-['Inter']">
        <Mail className="w-8 h-8 text-neutral-400 mx-auto" />
        <h3 className="font-['Poppins'] font-bold text-sm text-black uppercase">Nema aktivnih napuštenih korpi</h3>
        <p className="text-xs text-neutral-500">
          Trenutno nema posjetilaca koji su ostavili email ili broj telefona bez završene narudžbe.
        </p>
      </div>
    );
  }

  const currentCart = selectedCart || carts[0];
  const itemsText = currentCart.items
    .map((i) => `• ${i.name} (Veličina: ${i.size})`)
    .join('\n');

  const emailBodyText = `Pozdrav ${currentCart.customerName || 'Kupac'},\n\nPrimijetili smo da ti se svidjela odjeća u Casual Shop BiH, ali nisi dovršio narudžbu:\n\n${itemsText}\n\nKako bi tvoja kombinacija bila spremna, pripremili smo ekskluzivni promo kod za ${discountPercent}% popusta na tvoju korpu:\n\n🎁 JEDINSTVENI PROMO KOD: ${promoCode} (Važi narednih 48 sati)\n\nPlaćanje je sigurno pouzećem prilikom preuzimanja od kurira, a dostava stiže u roku 48–72h širom BiH.\n\nKlikni na link i dovrši narudžbu dok su zalihe u tvojoj veličini još dostupne:\nhttps://casualshopbih.pages.dev\n\nAko imaš pitanja oko veličine ili dostave, samo odgovori na ovu poruku ili nam se javi na Instagram @casualshop.bih.\n\nCasual Shop BiH`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(emailBodyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // SLANJE DIREKTNOG EMAILA PREKO EMAILJS-A
  const handleSendDirectEmail = async () => {
    if (!currentCart.email) {
      setEmailStatus({ success: false, message: 'Korisnik nema unesenu e-mail adresu.' });
      return;
    }

    setSendingEmail(true);
    setEmailStatus(null);

    try {
      await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: 'service_h4rxrv2',
          template_id: 'template_d2zqwni', // NOVI TEMPLATE ID ZA NAPUŠTENE KORPE
          user_id: 'mPKyquhWRcGkRq4gS',
          template_params: {
            customer_name: currentCart.customerName || 'Kupac',
            customer_email: currentCart.email,
            promo_code: promoCode,
            discount_percent: `${discountPercent}%`,
            items_summary: itemsText,
            reply_to: 'redemption19@gmail.com',
          },
        }),
      });

      setEmailStatus({ success: true, message: `E-mail s popustom uspješno poslan na ${currentCart.email}!` });
    } catch (err: any) {
      console.error('Greška pri slanju EmailJS-a:', err);
      setEmailStatus({ success: false, message: 'Greška pri slanju e-maila. Provjerite EmailJS postavke.' });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-['Poppins'] text-base font-black uppercase tracking-wider text-black">
          Napuštene korpe & Ponude za povratak kupaca ({carts.length})
        </h2>
        <p className="text-xs text-neutral-600 font-['Inter']">
          Aktivne korpe kupaca koji su započeli unosite podatke ali nisu potvrdili narudžbu.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lijeva lista korpi */}
        <div className="lg:col-span-5 bg-white border-2 border-neutral-200 divide-y divide-neutral-200 max-h-[500px] overflow-y-auto">
          {carts.map((cart, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSelectedCart(cart);
                setEmailStatus(null);
              }}
              className={`w-full text-left p-4 hover:bg-neutral-50 transition-colors cursor-pointer flex flex-col gap-1 ${
                selectedCart?.email === cart.email ? 'bg-[#F4F2EC] border-l-4 border-black' : ''
              }`}
            >
              <div className="flex justify-between items-center text-xs font-['Poppins'] font-bold">
                <span className="text-black">{cart.customerName || 'Neregistrovani posjetilac'}</span>
                <span className="text-neutral-900">{cart.subtotal.toFixed(2)} KM</span>
              </div>
              <div className="text-[11px] text-neutral-500 font-['Inter']">
                ✉️ {cart.email || 'Nema emaila'} {cart.phone ? `• 📞 ${cart.phone}` : ''}
              </div>
              <div className="text-[10px] text-neutral-400 font-mono mt-1">
                Artikli: {cart.items.map((i) => `${i.name} (${i.size})`).join(', ')}
              </div>
            </button>
          ))}
        </div>

        {/* Desni panel za pripremu i slanje maila */}
        <div className="lg:col-span-7 bg-white p-6 border-2 border-neutral-300 space-y-6 shadow-sm font-['Inter']">
          <div className="border-b border-neutral-200 pb-3 flex justify-between items-center">
            <div>
              <h3 className="font-['Poppins'] text-xs font-black uppercase tracking-wider text-black">
                Priprema poruke za: {currentCart.customerName || 'Kupca'}
              </h3>
              <p className="text-[11px] text-neutral-500">{currentCart.email || 'Nema emaila'}</p>
            </div>
            <span className="text-xs font-['Poppins'] font-black text-black bg-[#F7E97F] px-2 py-1 border border-black">
              VRIJEDNOST KORPE: {currentCart.subtotal.toFixed(2)} KM
            </span>
          </div>

          {emailStatus && (
            <div className={`p-3 text-xs border font-semibold ${emailStatus.success ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-red-50 text-red-800 border-red-300'}`}>
              {emailStatus.message}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-['Poppins'] font-bold uppercase text-neutral-700 mb-1">
                Generisani 1-time Promo Kod:
              </label>
              <input
                type="text"
                readOnly
                value={promoCode}
                className="w-full bg-[#F4F2EC] border border-neutral-300 p-2 font-mono font-bold text-xs text-black"
              />
            </div>
            <div>
              <label className="block text-[11px] font-['Poppins'] font-bold uppercase text-neutral-700 mb-1">
                Popust:
              </label>
              <input
                type="text"
                readOnly
                value={`${discountPercent}%`}
                className="w-full bg-[#F4F2EC] border border-neutral-300 p-2 font-mono font-bold text-xs text-black"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-['Poppins'] font-bold uppercase text-neutral-700 mb-1">
              TIJELO E-MAIL / WHATSAPP PORUKE:
            </label>
            <textarea
              rows={8}
              readOnly
              value={emailBodyText}
              className="w-full bg-[#F4F2EC] border border-neutral-300 p-3 text-xs font-mono text-neutral-800 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={copyToClipboard}
              className="flex-1 py-3 bg-white border-2 border-black hover:bg-neutral-100 font-['Poppins'] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'KOPIRANO!' : 'KOPIRAJ TEKST'}</span>
            </button>

            <button
              type="button"
              onClick={handleSendDirectEmail}
              disabled={sendingEmail || !currentCart.email}
              className="flex-1 py-3 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-2 border-[#0A0A0A] transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{sendingEmail ? 'SLANJE...' : 'POŠALJI E-MAIL DIREKTNO'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
