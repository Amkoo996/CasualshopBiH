import React from 'react';
import { Truck, ShieldCheck, Clock, CreditCard, AlertCircle } from 'lucide-react';

export const ShippingPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16 space-y-10 font-['Inter']">
      <div className="text-center space-y-2">
        <h1 className="font-['Poppins'] text-3xl sm:text-4xl font-black uppercase tracking-tight text-neutral-900">
          Dostava i Plaćanje
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600 max-w-lg mx-auto">
          Sve informacije o načinima isporuke, cijenama brze pošte i opcijama plaćanja za narudžbe unutar BiH.
        </p>
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
