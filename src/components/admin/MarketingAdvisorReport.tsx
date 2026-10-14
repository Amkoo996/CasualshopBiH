"use client";

import React, { useMemo } from 'react';
import { 
  Lightbulb, 
  TrendingUp, 
  Instagram, 
  MessageCircle, 
  Flame, 
  Target, 
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react';
import { Order, Product } from '../../types';

interface MarketingAdvisorProps {
  orders: Order[];
  products: Product[];
}

export const MarketingAdvisorReport: React.FC<MarketingAdvisorProps> = ({ orders, products }) => {
  // Izračun sedmičnih metrika
  const audit = useMemo(() => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 86400000;

    const weeklyOrders = orders.filter((o) => new Date(o.createdAt).getTime() >= sevenDaysAgo);
    const weeklyRevenue = weeklyOrders.reduce((sum, o) => sum + (o.status !== 'Otkazana' ? o.total : 0), 0);
    const weeklyPending = weeklyOrders.filter((o) => o.status === 'Nova').length;

    // Najtraženije veličine
    const sizeMap: Record<string, number> = {};
    weeklyOrders.forEach((o) => {
      o.items.forEach((it) => {
        const sz = it.size || 'M';
        sizeMap[sz] = (sizeMap[sz] || 0) + it.quantity;
      });
    });
    const topSize = Object.entries(sizeMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'L';

    // Generisanje preporuka
    const tips = [];

    if (weeklyOrders.length < 5) {
      tips.push({
        title: "Pokreni Instagram Story Flash Akciju (24h)",
        desc: "Sedmični promet je ispod očekivanog praga. Objavite story sa unikatnim kodom (npr. DROP15) koji traje tačno 24 sata. Ograničeno vrijeme stvara FOMO efekat kod mlađe publike.",
        badge: "Hitno za promet",
        color: "border-amber-400 bg-amber-50/50"
      });
    }

    tips.push({
      title: `Veličina "${topSize}" je najtraženija ove sedmice`,
      desc: `Podaci pokazuju da se veličina ${topSize} prodaje najbrže. Istaknite je u Instagram oglasima i provjerite stanje u inventaru kako ne bi došlo do rasprodaje ključnih brojeva.`,
      badge: "Optimizacija zaliha",
      color: "border-blue-400 bg-blue-50/50"
    });

    tips.push({
      title: "Direct WhatsApp / Viber potvrda narudžbi",
      desc: "Slanjem brze poruke kupcu čim stigne narudžba ('Pozdrav, šaljemo vaš paket danas?') stopa odbijanja paketa kod kurira brze pošte pada za više od 70%.",
      badge: "Zaštita profita",
      color: "border-emerald-400 bg-emerald-50/50"
    });

    return { weeklyOrders: weeklyOrders.length, weeklyRevenue, weeklyPending, topSize, tips };
  }, [orders, products]);

  return (
    <div className="bg-white border-2 border-neutral-300 p-6 space-y-6 shadow-xs font-['Inter']">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-200 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#0A0A0A] text-[#F7E97F] rounded">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-['Poppins'] text-sm font-black uppercase text-neutral-900 tracking-wider">
              Sedmični Marketing Advisor & Growth Audit
            </h3>
            <p className="text-xs text-neutral-500">
              Automatizovane smjernice i savjeti na osnovu sedmičnog učinka prodaje.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-['Poppins'] font-bold">
          <span className="px-2.5 py-1 bg-[#F4F2EC] border border-neutral-300 text-neutral-800">
            Sedmica: {audit.weeklyOrders} narudžbi
          </span>
          <span className="px-2.5 py-1 bg-[#F7E97F] text-black border border-black">
            {audit.weeklyRevenue.toFixed(2)} KM
          </span>
        </div>
      </div>

      {/* Kartice sa preporukama */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {audit.tips.map((tip, idx) => (
          <div key={idx} className={`p-4 border-2 rounded-lg space-y-2.5 ${tip.color}`}>
            <div className="flex justify-between items-start gap-2">
              <span className="text-[10px] font-['Poppins'] font-black uppercase px-2 py-0.5 bg-black text-white rounded">
                {tip.badge}
              </span>
              <ArrowUpRight className="w-4 h-4 text-neutral-500 shrink-0" />
            </div>
            <h4 className="font-['Poppins'] font-bold text-xs text-neutral-900 leading-snug">
              {tip.title}
            </h4>
            <p className="text-[11px] text-neutral-600 leading-relaxed font-['Inter']">
              {tip.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};