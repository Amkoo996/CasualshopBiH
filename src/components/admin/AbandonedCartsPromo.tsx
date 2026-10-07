import React, { useState, useEffect } from 'react';
import {
  Mail,
  ShoppingBag,
  Send,
  Copy,
  Check,
  Download,
  Phone,
  Clock,
  Sparkles,
  ExternalLink,
  MessageCircle,
  X,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { AbandonedCartSession } from '../../types';
import { getAbandonedCarts } from '../../lib/tracking';

export const AbandonedCartsPromo: React.FC = () => {
  const [carts, setCarts] = useState<AbandonedCartSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<AbandonedCartSession | null>(null);
  const [copied, setCopied] = useState(false);
  const [promoCode, setPromoCode] = useState('CASUAL10');
  const [promoDiscount, setPromoDiscount] = useState('10%');

  // Initial sample data if no recorded sessions yet
  const sampleSessions: AbandonedCartSession[] = [
    {
      id: 'demo-cart-01',
      customerName: 'Tarik Hadžić',
      email: 'tarik.hadzic@gmail.com',
      phone: '+387 61 455 210',
      subtotal: 75.0,
      lastUpdated: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      items: [
        {
          id: 'cs-tee-sarajevo-geo-01',
          name: 'Majica "SARAJEVO geographic" Box Logo',
          price: 35.0,
          image: '/images/sarajevo_geo_tee.jpg',
          size: 'L',
          quantity: 1,
          maxStock: 6,
        },
        {
          id: 'cs-tee-away-days-02',
          name: 'Majica "BEST DAYS ? AWAY DAYS" Ultras Van',
          price: 40.0,
          image: '/images/away_days_tee.jpg',
          size: 'L',
          quantity: 1,
          maxStock: 5,
        },
      ],
    },
    {
      id: 'demo-cart-02',
      customerName: 'Amar Begić',
      email: 'amar.begic98@hotmail.com',
      phone: '+387 62 119 844',
      subtotal: 40.0,
      lastUpdated: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
      items: [
        {
          id: 'cs-tee-standing-not-running-05',
          name: 'Majica "MADE FOR STANDING NOT RUNNING" Sneakers',
          price: 40.0,
          image: '/images/standing_tee.jpg',
          size: 'M',
          quantity: 1,
          maxStock: 9,
        },
      ],
    },
    {
      id: 'demo-cart-03',
      customerName: 'Kenan S.',
      email: 'kenan.s@bih.net.ba',
      subtotal: 80.0,
      lastUpdated: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
      items: [
        {
          id: 'cs-hoodie-boxy-classic-07',
          name: 'CS Boxy Hoodie "Casual Svaki Dan" Heavyweight',
          price: 80.0,
          image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1000&q=80',
          size: 'XL',
          quantity: 1,
          maxStock: 2,
        },
      ],
    },
  ];

  const loadCarts = async () => {
    setLoading(true);
    try {
      const real = await getAbandonedCarts();
      if (real.length > 0) {
        setCarts(real);
      } else {
        setCarts(sampleSessions);
      }
    } catch {
      setCarts(sampleSessions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCarts();
  }, []);

  // Generate customized promotional text for selected customer
  const generateEmailBody = (session: AbandonedCartSession) => {
    const name = session.customerName || 'prijatelju';
    const itemsList = session.items.map((i) => `• ${i.name} (Veličina: ${i.size})`).join('\n');

    return `Pozdrav ${name},

Primijetili smo da ti se svidjela odjeća u Casual Shop BiH, ali nisi dovršio narudžbu:

${itemsList}

Kako bi tvoja kombinacija bila spremna za ulicu i tribinu, pripremili smo ekskluzivni promo kod za ${promoDiscount} popusta na tvoju korpu:

🎁 PROMO KOD: ${promoCode}

Plaćanje je sigurno pouzećem prilikom preuzimanja od kurira, a dostava stiže u roku 2-4 radna dana širom BiH.

Klikni ovdje i dovrši narudžbu dok su zalihe u tvojoj veličini još dostupne:
https://casualshop.bih

Ako imaš bilo kakvih pitanja oko veličine ili dostave, samo odgovori na ovu poruku ili nam se javi na Instagram @casualshop.bih.

Casual. Svaki dan.
Ekipa Casual Shop BiH`;
  };

  const generateEmailSubject = () => {
    return `Casual Shop BiH • Zaboravio/la si nešto u korpi? Poklanjamo ti ${promoDiscount} popusta!`;
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportLeadsCSV = () => {
    const headers = 'Ime,Email,Telefon,Vrijednost KM,Artikli u korpi,Datum\n';
    const rows = carts
      .map((c) => {
        const itemNames = c.items.map((i) => `${i.name} (${i.size})`).join('; ');
        return `"${c.customerName || ''}","${c.email || ''}","${c.phone || ''}","${c.subtotal.toFixed(2)}","${itemNames}","${new Date(c.lastUpdated).toLocaleString('bs-BA')}"`;
      })
      .join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(headers + rows);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `casualshop_napustene_korpe_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border-2 border-neutral-200 p-5 sm:p-7 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-['Poppins'] font-black uppercase tracking-[0.2em] bg-[#0A0A0A] text-[#F7E97F] px-2 py-0.5 border border-[#F7E97F]">
              LEAD RETARGETING
            </span>
            <span className="text-xs text-neutral-500 font-medium">E-mail Promocije</span>
          </div>
          <h3 className="font-['Poppins'] text-lg sm:text-xl font-black uppercase tracking-tight text-neutral-900 mt-1 flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#0A0A0A]" />
            <span>Napuštene korpe & E-mail ponude s popustom</span>
          </h3>
          <p className="text-xs text-neutral-500 font-['Inter']">
            Spisak posjetilaca koji su dodali artikle u korpu i unijeli kontakt. Pošaljite im promo e-mail ili WhatsApp ponudu kako bi završili narudžbu.
          </p>
        </div>

        <button
          onClick={handleExportLeadsCSV}
          className="px-3.5 py-2 bg-white border-2 border-neutral-300 text-xs font-['Poppins'] font-bold uppercase tracking-wider flex items-center gap-2 text-neutral-800 hover:bg-neutral-100 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Izvezi kontakte (CSV)</span>
        </button>
      </div>

      {/* Info notification */}
      <div className="bg-[#F4F2EC] border border-neutral-300 p-4 flex items-start gap-3 text-xs text-neutral-700 font-['Inter']">
        <Sparkles className="w-5 h-5 text-[#0A0A0A] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-neutral-900">
            Zašto je ovo ključno za prodaju Casual Shopa?
          </p>
          <p>
            Više od 60% kupaca na streetwear web shopovima doda majicu u korpu i izađe bez završetka. Ponuda koda od 10% ili besplatne dostave u roku od nekoliko sati vraća i do <strong>25–35% izgubljenih narudžbi</strong>!
          </p>
        </div>
      </div>

      {/* Leads Table */}
      <div className="overflow-x-auto border border-neutral-200">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#0A0A0A] text-white font-['Poppins'] font-bold uppercase text-[11px]">
            <tr>
              <th className="p-3">Kupac / Kontakt</th>
              <th className="p-3">Artikli u korpi</th>
              <th className="p-3">Vrijednost</th>
              <th className="p-3">Vrijeme</th>
              <th className="p-3 text-right">Akcija</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 font-['Inter']">
            {carts.map((c) => (
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
                    <span>{new Date(c.lastUpdated).toLocaleDateString('bs-BA')}</span>
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono">
                    {new Date(c.lastUpdated).toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </td>

                <td className="p-3 text-right">
                  <button
                    onClick={() => setSelectedSession(c)}
                    className="px-3 py-1.5 bg-[#0A0A0A] hover:bg-[#F7E97F] hover:text-[#0A0A0A] text-white text-[11px] font-['Poppins'] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 border border-[#0A0A0A] transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    <span>Pošalji Ponudu</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Promo Email Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white max-w-2xl w-full border-2 border-[#F7E97F] shadow-2xl p-6 space-y-5 animate-scaleUp max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-neutral-200">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#0A0A0A]" />
                <h3 className="font-['Poppins'] text-sm sm:text-base font-black uppercase tracking-wider text-black">
                  Priprema promotivne poruke za kupca
                </h3>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-1 text-neutral-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Details Summary */}
            <div className="bg-[#F4F2EC] p-3 text-xs flex flex-wrap justify-between gap-3 font-['Inter']">
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-bold">Kupac</span>
                <strong className="text-black font-['Poppins']">{selectedSession.customerName || 'Nepoznato'}</strong>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-bold">Email</span>
                <strong className="text-black font-mono">{selectedSession.email || 'Nema e-maila'}</strong>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-bold">Telefon</span>
                <strong className="text-black font-mono">{selectedSession.phone || 'Nema telefona'}</strong>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-bold">Vrijednost korpe</span>
                <strong className="text-black font-['Poppins']">{selectedSession.subtotal.toFixed(2)} KM</strong>
              </div>
            </div>

            {/* Promo Code Configurator */}
            <div className="grid grid-cols-2 gap-3 text-xs font-['Inter']">
              <div>
                <label className="font-bold text-neutral-700 block mb-1">Promo Kod:</label>
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  className="w-full p-2 border-2 border-neutral-300 font-mono font-bold text-sm bg-neutral-50 focus:border-black focus:outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-neutral-700 block mb-1">Popust u poruci:</label>
                <input
                  type="text"
                  value={promoDiscount}
                  onChange={(e) => setPromoDiscount(e.target.value)}
                  className="w-full p-2 border-2 border-neutral-300 font-bold text-sm bg-neutral-50 focus:border-black focus:outline-none"
                />
              </div>
            </div>

            {/* Subject preview */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                Naslov e-maila (Subject):
              </label>
              <div className="p-2.5 bg-neutral-100 border border-neutral-300 text-xs font-bold text-neutral-900 font-['Poppins']">
                {generateEmailSubject()}
              </div>
            </div>

            {/* Body textarea preview */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                Tijelo e-mail / WhatsApp poruke:
              </label>
              <textarea
                readOnly
                rows={9}
                value={generateEmailBody(selectedSession)}
                className="w-full p-3 bg-neutral-50 border-2 border-neutral-300 text-xs font-['Inter'] text-neutral-800 leading-relaxed font-mono resize-none focus:outline-none"
              />
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2">
              <button
                onClick={() => handleCopyText(generateEmailBody(selectedSession))}
                className="px-4 py-2.5 bg-white border-2 border-neutral-300 hover:bg-neutral-100 text-xs font-['Poppins'] font-bold uppercase tracking-wider flex items-center justify-center gap-2 text-neutral-800 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Kopirano u međuspremnik!' : 'Kopiraj cijeli tekst'}</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedSession.phone && (
                  <a
                    href={`https://wa.me/${selectedSession.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(generateEmailBody(selectedSession))}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-['Poppins'] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                )}

                {selectedSession.email && (
                  <a
                    href={`mailto:${selectedSession.email}?subject=${encodeURIComponent(generateEmailSubject())}&body=${encodeURIComponent(generateEmailBody(selectedSession))}`}
                    className="px-4 py-2.5 bg-[#0A0A0A] hover:bg-[#F7E97F] hover:text-[#0A0A0A] text-white text-xs font-['Poppins'] font-bold uppercase tracking-wider flex items-center gap-2 border-2 border-[#0A0A0A] transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Otvori u Email klijentu</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
