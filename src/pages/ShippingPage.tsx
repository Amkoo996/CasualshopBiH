import React, { useState } from 'react';
import { Truck, ShieldCheck, Clock, CreditCard, Search, AlertCircle, PackageCheck } from 'lucide-react';
import { getOrderByNumberAndPhone } from '../lib/db';
import { Order } from '../types';

export const ShippingPage: React.FC = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !phone.trim()) return;

    setLoading(true);
    setError('');
    setFoundOrder(null);

    try {
      const order = await getOrderByNumberAndPhone(orderNumber.trim(), phone.trim());
      if (order) {
        setFoundOrder(order);
      } else {
        setError('Narudžba nije pronađena. Provjerite broj narudžbe i telefon.');
      }
    } catch {
      setError('Došlo je do greške pri pretrazi. Pokušajte ponovo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16 space-y-10 font-['Inter']">
      <div className="text-center space-y-2">
        <h1 className="font-['Poppins'] text-3xl sm:text-4xl font-black uppercase tracking-tight text-neutral-900">
          Dostava i Plaćanje
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600 max-w-lg mx-auto">
          Sve informacije o načinima isporuke, cijenama brze pošte i provjeri statusa vaše narudžbe.
        </p>
      </div>

      {/* MODUL ZA PRAĆENJE NARUDŽBE */}
      <div className="bg-white border-2 border-[#0A0A0A] p-6 shadow-md max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-2 border-b-2 border-neutral-200 pb-2">
          <PackageCheck className="w-5 h-5 text-[#0A0A0A]" />
          <h2 className="font-['Poppins'] text-sm font-black uppercase tracking-wider text-black">
            Provjera statusa narudžbe
          </h2>
        </div>

        <form onSubmit={handleTrack} className="space-y-3">
          <div>
            <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">Broj narudžbe *</label>
            <input
              type="text"
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
              placeholder="npr. CS-1012-AB12"
              className="w-full border-2 border-neutral-300 p-2.5 text-xs font-mono font-bold focus:border-black focus:outline-none uppercase bg-[#F4F2EC]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">Broj telefona *</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="npr. 061123456"
              className="w-full border-2 border-neutral-300 p-2.5 text-xs focus:border-black focus:outline-none bg-[#F4F2EC]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border-2 border-[#0A0A0A] cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>{loading ? 'PRETRAŽIVANJE...' : 'PRONAĐI NARUDŽBU'}</span>
          </button>
        </form>

        {error && (
          <div className="p-3 bg-red-50 border border-red-300 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {foundOrder && (
          <div className="p-4 bg-[#F4F2EC] border-2 border-[#F7E97F] space-y-3 text-xs animate-fadeIn">
            <div className="flex justify-between items-center border-b border-neutral-300 pb-2">
              <span className="font-['Poppins'] font-bold text-black">Status narudžbe:</span>
              <span className={`px-2.5 py-1 font-['Poppins'] font-black uppercase text-[10px] tracking-wider ${
                foundOrder.status === 'Nova' ? 'bg-amber-400 text-black' :
                foundOrder.status === 'Potvrđena' ? 'bg-blue-600 text-white' :
                foundOrder.status === 'Poslana' ? 'bg-purple-600 text-white' :
                foundOrder.status === 'Dostavljena' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
              }`}>
                {foundOrder.status}
              </span>
            </div>

            <div className="space-y-1.5 text-neutral-800">
              <p><strong>Broj narudžbe:</strong> <span className="font-mono">{foundOrder.orderNumber}</span></p>
              <p><strong>Primalac:</strong> {foundOrder.customer.firstName} {foundOrder.customer.lastName}</p>
              <p><strong>Adresa dostave:</strong> {foundOrder.customer.address}, {foundOrder.customer.city}</p>
              <p><strong>Ukupno za plaćanje:</strong> <strong className="text-black font-['Poppins']">{foundOrder.total.toFixed(2)} KM</strong></p>
            </div>
          </div>
        )}
      </div>

      {/* BANER SA LOGOTIPIMA KURIRSKIH SLUŽBI I PLAĆANJA */}
      <div className="bg-white border-2 border-[#F7E97F] p-6 shadow-sm space-y-6">
        <div className="text-center space-y-2 border-b border-neutral-200 pb-4">
          <span className="text-[10px] font-['Poppins'] font-black uppercase tracking-[0.2em] text-neutral-500">
            Naši Logistički i Platni Partneri
          </span>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 pt-2 opacity-90">
            {/* Logotipi kurira */}
            <span className="font-['Poppins'] font-black text-sm text-black tracking-tighter border-2 border-black px-2 py-0.5">
              BH POŠTA <span className="text-red-600">EXPRESS</span>
            </span>
            <span className="font-['Poppins'] font-black text-sm text-red-600 tracking-wider">
              X-EXPRESS
            </span>
            {/* Logotipi kartica / gateway-a */}
            <span className="font-['Poppins'] font-bold text-xs text-blue-900 border border-blue-900 px-1.5 py-0.5">
              MONRI
            </span>
            <span className="font-['Poppins'] font-bold text-xs text-[#0A0A0A] border border-black px-1.5 py-0.5">
              WSpay
            </span>
            <span className="font-['Poppins'] font-black text-xs text-red-600 italic">
              UniCredit
            </span>
            <span className="font-['Poppins'] font-black text-xs text-blue-700 italic">
              VISA
            </span>
            <span className="font-['Poppins'] font-black text-xs text-amber-600">
              mastercard
            </span>
          </div>
        </div>

        {/* CIJENE DOSTAVE */}
        <div className="space-y-3">
          <h2 className="font-['Poppins'] text-sm font-black uppercase tracking-wider text-black flex items-center gap-2">
            <Truck className="w-4 h-4 text-black" />
            <span>Cijena dostave</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#0A0A0A] text-white font-['Poppins'] font-bold uppercase">
                  <th className="p-3 border border-neutral-800">Vrsta uslova</th>
                  <th className="p-3 border border-neutral-800 text-right">Cijena</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                <tr className="bg-white">
                  <td className="p-3 border border-neutral-200">Dostava brze pošte širom BiH</td>
                  <td className="p-3 border border-neutral-200 text-right font-bold font-['Poppins']">12,00 KM</td>
                </tr>
                <tr className="bg-emerald-50 text-emerald-900 font-semibold">
                  <td className="p-3 border border-neutral-200">Narudžbe preko 200,00 KM</td>
                  <td className="p-3 border border-neutral-200 text-right font-black font-['Poppins']">BESPLATNO</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-neutral-600 leading-relaxed bg-[#F4F2EC] p-3 border border-neutral-300">
            Cijena dostave je ista bez obzira na broj artikala u narudžbi. Tačan iznos vidiš na blagajni čim upišeš poštanski broj, prije nego potvrdiš narudžbu.
          </p>
        </div>
      </div>

      {/* DETAILS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 border-2 border-neutral-200 space-y-3">
          <h2 className="font-['Poppins'] text-sm font-black uppercase tracking-wider text-black flex items-center gap-2 border-b pb-2 border-neutral-200">
            <CreditCard className="w-4 h-4 text-black" />
            <span>Plaćanje</span>
          </h2>
          <p className="text-xs text-neutral-700 leading-relaxed">
            <strong>Plaćaš pouzećem:</strong> Gotovinom kuriru kad preuzmeš paket. Ništa ne plaćaš unaprijed.
          </p>
          <div className="p-2.5 bg-amber-50 border border-amber-300 text-[11px] text-amber-900 font-medium flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Moguća provjera i otvaranje paketa prije preuzimanja od kurira.</span>
          </div>
        </div>

        <div className="bg-white p-6 border-2 border-neutral-200 space-y-3">
          <h2 className="font-['Poppins'] text-sm font-black uppercase tracking-wider text-black flex items-center gap-2 border-b pb-2 border-neutral-200">
            <Clock className="w-4 h-4 text-black" />
            <span>Rok i način isporuke</span>
          </h2>
          <p className="text-xs text-neutral-700 leading-relaxed">
            Svaki artikal štampamo po narudžbi, a zatim ga predajemo kurirskoj službi.
          </p>
        </div>
      </div>

      {/* KURIRSKE SLUŽBE */}
      <div className="space-y-6">
        <h2 className="font-['Poppins'] text-base font-black uppercase tracking-wider text-black border-b-2 border-neutral-300 pb-2">
          Kurirske službe sa kojima sarađujemo
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 border-2 border-neutral-300 space-y-3">
            <div className="flex items-center justify-between border-b pb-2 border-neutral-200">
              <h3 className="font-['Poppins'] font-black text-xs uppercase tracking-wider text-black">
                BH Pošta Express
              </h3>
              <span className="text-[10px] font-bold bg-[#0A0A0A] text-[#F7E97F] px-2 py-0.5 font-['Poppins']">
                GLAVNI PARTNER
              </span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Svu domaću dostavu realizujemo putem BH Pošta Express službe, pouzdanog partnera za brzu i sigurnu dostavu unutar BiH.
            </p>
            <ul className="text-xs text-neutral-800 space-y-1.5 list-disc pl-4 font-['Inter']">
              <li><strong>Vrsta dostave:</strong> Standardna i ekspresna</li>
              <li><strong>Vrijeme isporuke:</strong> 1 do 3 radna dana</li>
              <li><strong>Praćenje pošiljke:</strong> Dostupno za sve narudžbe</li>
              <li><strong>Isporuka:</strong> Tokom standardnih radnih sati (pon – pet)</li>
            </ul>
          </div>

          <div className="bg-white p-6 border-2 border-neutral-300 space-y-3">
            <div className="flex items-center justify-between border-b pb-2 border-neutral-200">
              <h3 className="font-['Poppins'] font-black text-xs uppercase tracking-wider text-black">
                X-EXPRESS
              </h3>
              <span className="text-[10px] font-bold bg-neutral-200 text-black px-2 py-0.5 font-['Poppins']">
                BRZA DOSTAVA
              </span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Za dodatnu brzinu dostave nudimo i opciju putem X-EXPRESS kurirske službe.
            </p>
            <ul className="text-xs text-neutral-800 space-y-1.5 list-disc pl-4 font-['Inter']">
              <li><strong>Vrsta dostave:</strong> Standardna i ekspresna</li>
              <li><strong>Vrijeme isporuke:</strong> 1 do 3 radna dana</li>
              <li><strong>Praćenje pošiljke:</strong> Dostupno za sve narudžbe</li>
              <li><strong>Isporuka:</strong> Tokom standardnih radnih sati (pon – pet)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
