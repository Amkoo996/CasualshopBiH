import React, { useEffect, useState } from 'react';
import { Eye, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { AnalyticsStats, DEFAULT_STORE_SETTINGS } from '../../types';
import { getAnalyticsStats } from '../../lib/tracking';

interface TrafficAndCartStatsTableProps {
  orders?: any[];
}

export const TrafficAndCartStatsTable: React.FC<TrafficAndCartStatsTableProps> = () => {
  const [stats, setStats] = useState<AnalyticsStats>({
    uniqueVisitorsCount: 0,
    totalVisitsCount: 0,
    addToCartCount: 0,
    uniqueAddToCartUsersCount: 0,
    addToCartRate: 0,
    dailyTrends: [],
    recentEvents: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        const data = await getAnalyticsStats();
        const visits = data.uniqueVisitorsCount || 1;
        const cartUsers = data.uniqueAddToCartUsersCount || 0;
        const calculatedRate = Number(((cartUsers / visits) * 100).toFixed(1));

        setStats({
          ...data,
          addToCartRate: calculatedRate,
          recentEvents: [],
        });
      } catch (err) {
        console.error('Greška pri učitavanju tabele statistike:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="bg-white p-6 border-2 border-neutral-200 text-xs text-neutral-500 font-['Inter']">
        Učitavanje statistike posjeta i korpe...
      </div>
    );
  }

  return (
    <div className="bg-white p-6 border-2 border-neutral-200 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-neutral-200 pb-4">
        <div>
          <span className="text-[10px] font-['Poppins'] font-black uppercase tracking-[0.2em] bg-[#0A0A0A] text-[#F7E97F] px-2 py-0.5 border border-[#F7E97F]">
            ANALITIKA POSJETA
          </span>
          <h3 className="font-['Poppins'] text-lg font-black uppercase tracking-tight text-neutral-900 mt-1">
            Posjete Stranici & Dodavanje u Korpu
          </h3>
        </div>
        <span className="text-xs text-neutral-500 font-['Inter']">
          Stvarni podaci posjetilaca koji su prihvatili analitiku
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#F4F2EC] p-4 border border-neutral-300 space-y-1">
          <span className="text-[10px] font-['Poppins'] font-bold uppercase text-neutral-500 block">
            Jedinstveni posjetioci
          </span>
          <div className="font-['Poppins'] text-2xl font-black text-black">
            {stats.uniqueVisitorsCount}
          </div>
          <span className="text-[11px] text-neutral-600 font-['Inter']">
            {stats.totalVisitsCount} ukupnih posjeta
          </span>
        </div>

        <div className="bg-[#F4F2EC] p-4 border border-neutral-300 space-y-1">
          <span className="text-[10px] font-['Poppins'] font-bold uppercase text-neutral-500 block">
            Dodavanja u korpu
          </span>
          <div className="font-['Poppins'] text-2xl font-black text-black">
            {stats.addToCartCount}
          </div>
          <span className="text-[11px] text-neutral-600 font-['Inter']">
            {stats.uniqueAddToCartUsersCount} jedinstvenih korisnika
          </span>
        </div>

        <div className="bg-[#F4F2EC] p-4 border border-neutral-300 space-y-1">
          <span className="text-[10px] font-['Poppins'] font-bold uppercase text-neutral-500 block">
            Stopa ubacivanja u korpu
          </span>
          <div className="font-['Poppins'] text-2xl font-black text-black">
            {stats.addToCartRate}%
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold font-['Inter']">
            Korisnici sa artiklom u korpi
          </span>
        </div>

        <div className="bg-[#F4F2EC] p-4 border border-neutral-300 space-y-1">
          <span className="text-[10px] font-['Poppins'] font-bold uppercase text-neutral-500 block">
            Period mjerenja
          </span>
          <div className="font-['Poppins'] text-lg font-black text-black pt-1">
            Zadnjih 14 dana
          </div>
          <span className="text-[11px] text-neutral-600 font-['Inter']">
            Dnevni trend u nastavku
          </span>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <h4 className="font-['Poppins'] text-xs font-bold uppercase tracking-wider text-black">
          Dnevni pregled posjeta (Zadnjih 14 dana)
        </h4>

        <div className="overflow-x-auto border border-neutral-200">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#0A0A0A] text-white font-['Poppins'] font-bold uppercase text-[11px]">
              <tr>
                <th className="p-2.5">Datum</th>
                <th className="p-2.5 text-center">Jedinstveni posjetioci</th>
                <th className="p-2.5 text-center">Ukupno posjeta</th>
                <th className="p-2.5 text-center">Dodavanja u korpu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 font-['Inter']">
              {stats.dailyTrends.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-neutral-500">
                    Nema zabilježenih posjeta u zadnjih 14 dana.
                  </td>
                </tr>
              ) : (
                stats.dailyTrends.map((d, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50">
                    <td className="p-2.5 font-bold font-mono text-neutral-900">{d.fullDate}</td>
                    <td className="p-2.5 text-center font-bold">{d.uniqueVisitors}</td>
                    <td className="p-2.5 text-center text-neutral-600">{d.visits}</td>
                    <td className="p-2.5 text-center font-bold text-emerald-700">{d.addToCart}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
