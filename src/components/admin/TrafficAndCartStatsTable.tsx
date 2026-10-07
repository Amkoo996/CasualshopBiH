import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  ShoppingBag,
  TrendingUp,
  Download,
  RefreshCw,
  Calendar,
  Layers,
  ArrowUpRight,
  Database,
} from 'lucide-react';
import { Order, AnalyticsStats } from '../../types';
import { getAnalyticsStats } from '../../lib/tracking';

interface TrafficAndCartStatsTableProps {
  orders: Order[];
}

interface TableRowData {
  date: string;
  fullDate: string;
  visits: number;
  uniqueVisitors: number;
  addToCart: number;
  cartRate: number;
  ordersCount: number;
  revenue: number;
}

export const TrafficAndCartStatsTable: React.FC<TrafficAndCartStatsTableProps> = ({ orders }) => {
  const [analytics, setAnalytics] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [dayRange, setDayRange] = useState<'7' | '14' | '30'>('30');

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await getAnalyticsStats();
      setAnalytics(data);
    } catch (e) {
      console.warn('Greška pri učitavanju analitike:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Map orders by date (YYYY-MM-DD)
  const ordersByDay = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    orders.forEach((ord) => {
      if (ord.status !== 'Otkazana') {
        const d = new Date(ord.createdAt);
        const key = d.toISOString().split('T')[0];
        if (!map[key]) map[key] = { count: 0, revenue: 0 };
        map[key].count += 1;
        map[key].revenue += ord.total;
      }
    });
    return map;
  }, [orders]);

  // Combine analytics daily trends with orders
  const rows: TableRowData[] = useMemo(() => {
    if (!analytics || !analytics.dailyTrends) return [];

    const raw = analytics.dailyTrends.map((d) => {
      const orderData = ordersByDay[d.fullDate] || { count: 0, revenue: 0 };
      const rate = d.uniqueVisitors > 0
        ? Number(((d.addToCart / d.uniqueVisitors) * 100).toFixed(1))
        : 0;

      return {
        date: d.date,
        fullDate: d.fullDate,
        visits: d.visits,
        uniqueVisitors: d.uniqueVisitors,
        addToCart: d.addToCart,
        cartRate: rate,
        ordersCount: orderData.count,
        revenue: orderData.revenue,
      };
    });

    // Sort descending by date (most recent first)
    const reversed = [...raw].reverse();
    const count = Number(dayRange);
    return reversed.slice(0, count);
  }, [analytics, ordersByDay, dayRange]);

  // Totals for the selected range
  const totals = useMemo(() => {
    const totalVisits = rows.reduce((s, r) => s + r.visits, 0);
    const totalUnique = rows.reduce((s, r) => s + r.uniqueVisitors, 0);
    const totalCart = rows.reduce((s, r) => s + r.addToCart, 0);
    const totalOrders = rows.reduce((s, r) => s + r.ordersCount, 0);
    const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
    const avgRate = totalUnique > 0 ? Number(((totalCart / totalUnique) * 100).toFixed(1)) : 0;

    return {
      totalVisits,
      totalUnique,
      totalCart,
      totalOrders,
      totalRevenue,
      avgRate,
    };
  }, [rows]);

  // CSV export
  const handleExportCSV = () => {
    if (rows.length === 0) return;
    const headers = ['Datum', 'ISO Datum', 'Ukupno posjeta', 'Jedinstveni posjetioci', 'Dodano u korpu', 'Stopa korpe (%)', 'Broj narudzbi', 'Prihod (KM)'];
    const csvLines = [headers.join(',')];

    rows.forEach((r) => {
      csvLines.push(
        [
          r.date,
          r.fullDate,
          r.visits,
          r.uniqueVisitors,
          r.addToCart,
          r.cartRate,
          r.ordersCount,
          r.revenue.toFixed(2),
        ].join(',')
      );
    });

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `casual_shop_statistika_${dayRange}dana.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border-2 border-neutral-200 p-5 sm:p-7 shadow-sm space-y-5">
      {/* Table Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-['Poppins'] font-black uppercase tracking-[0.2em] bg-[#0A0A0A] text-[#F7E97F] px-2 py-0.5 border border-[#F7E97F]">
              EVIDENCIJA DOGAĐAJA
            </span>
            <span className="text-xs text-neutral-500 font-['Inter'] flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-neutral-400" />
              <span>Kolekcija 'analytics_events' & 'orders'</span>
            </span>
          </div>
          <h3 className="font-['Poppins'] text-lg sm:text-xl font-black uppercase tracking-tight text-neutral-900 mt-1 flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#0A0A0A]" />
            <span>Tabela statistike posjeta i 'dodaj u korpu' događaja</span>
          </h3>
          <p className="text-xs text-neutral-500 font-['Inter']">
            Pregled aktivnosti kupaca po danima u posljednjih {dayRange} dana.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Day range filter */}
          <div className="flex border border-neutral-300 bg-[#F4F2EC] p-0.5 font-['Poppins'] text-xs font-bold">
            <button
              onClick={() => setDayRange('7')}
              className={`px-3 py-1.5 transition-colors ${
                dayRange === '7' ? 'bg-[#0A0A0A] text-white shadow-xs' : 'text-neutral-700 hover:text-black'
              }`}
            >
              7 DANA
            </button>
            <button
              onClick={() => setDayRange('14')}
              className={`px-3 py-1.5 transition-colors ${
                dayRange === '14' ? 'bg-[#0A0A0A] text-white shadow-xs' : 'text-neutral-700 hover:text-black'
              }`}
            >
              14 DANA
            </button>
            <button
              onClick={() => setDayRange('30')}
              className={`px-3 py-1.5 transition-colors ${
                dayRange === '30' ? 'bg-[#0A0A0A] text-white shadow-xs' : 'text-neutral-700 hover:text-black'
              }`}
            >
              30 DANA
            </button>
          </div>

          <button
            onClick={fetchStats}
            disabled={loading}
            className="p-2 bg-[#F4F2EC] hover:bg-neutral-200 border border-neutral-300 text-neutral-800 transition-colors"
            title="Osvježi podatke"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-[#0A0A0A] hover:bg-[#F7E97F] hover:text-[#0A0A0A] text-white border border-[#0A0A0A] font-['Poppins'] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-['Inter']">
        <div className="bg-[#F4F2EC] border border-neutral-300 p-3">
          <span className="text-[10px] font-['Poppins'] font-bold text-neutral-500 uppercase tracking-wider block">
            UKUPNO POSJETA
          </span>
          <span className="font-['Poppins'] text-xl font-black text-black">
            {totals.totalVisits}
          </span>
          <span className="text-[10px] text-neutral-500 block">
            Učitavanja stranice
          </span>
        </div>

        <div className="bg-[#F4F2EC] border border-neutral-300 p-3">
          <span className="text-[10px] font-['Poppins'] font-bold text-neutral-500 uppercase tracking-wider block">
            JEDINSTVENI KORISNICI
          </span>
          <span className="font-['Poppins'] text-xl font-black text-black">
            {totals.totalUnique}
          </span>
          <span className="text-[10px] text-neutral-500 block">
            Različitih posjetilaca
          </span>
        </div>

        <div className="bg-[#0A0A0A] text-white p-3 border-2 border-[#F7E97F]">
          <span className="text-[10px] font-['Poppins'] font-bold text-[#F7E97F] uppercase tracking-wider block">
            DODANO U KORPU
          </span>
          <span className="font-['Poppins'] text-xl font-black text-white">
            {totals.totalCart}
          </span>
          <span className="text-[10px] text-neutral-300 block">
            Prosječna stopa: <strong>{totals.avgRate}%</strong>
          </span>
        </div>

        <div className="bg-[#F4F2EC] border border-neutral-300 p-3">
          <span className="text-[10px] font-['Poppins'] font-bold text-neutral-500 uppercase tracking-wider block">
            NARUDŽBE (PRODAJA)
          </span>
          <span className="font-['Poppins'] text-xl font-black text-emerald-800">
            {totals.totalOrders} ({totals.totalRevenue.toFixed(0)} KM)
          </span>
          <span className="text-[10px] text-neutral-500 block">
            Iz kolekcije 'orders'
          </span>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="border-2 border-neutral-200 overflow-x-auto shadow-xs">
        <table className="w-full text-xs text-left font-['Inter']">
          <thead className="bg-[#0A0A0A] text-white font-['Poppins'] uppercase text-[10px] tracking-wider">
            <tr>
              <th className="p-3">Datum</th>
              <th className="p-3">Posjete</th>
              <th className="p-3">Jedinstveni posjetioci</th>
              <th className="p-3 text-amber-300">Dodano u korpu</th>
              <th className="p-3">Stopa u korpu</th>
              <th className="p-3 text-right">Narudžbe / Prihod</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {rows.map((row, idx) => {
              const isToday = idx === 0;
              return (
                <tr
                  key={row.fullDate}
                  className={`hover:bg-neutral-50 transition-colors ${
                    isToday ? 'bg-[#F7E97F]/15 font-semibold' : ''
                  }`}
                >
                  <td className="p-3 font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-black font-['Poppins']">{row.date}</span>
                      <span className="text-[10px] text-neutral-400">({row.fullDate})</span>
                      {isToday && (
                        <span className="bg-[#0A0A0A] text-[#F7E97F] text-[9px] font-['Poppins'] font-bold px-1.5 py-0.2">
                          DANAS
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-neutral-700">
                    <span className="font-bold">{row.visits}</span>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 font-bold text-neutral-900 bg-[#F4F2EC] px-2 py-0.5 border border-neutral-300">
                      <Users className="w-3 h-3 text-[#0A0A0A]" />
                      <span>{row.uniqueVisitors}</span>
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 font-black text-black bg-[#F7E97F] px-2 py-0.5 border border-[#0A0A0A]">
                      <ShoppingBag className="w-3 h-3 text-[#0A0A0A]" />
                      <span>{row.addToCart}</span>
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-['Poppins'] font-bold text-neutral-900">
                        {row.cartRate}%
                      </span>
                      <div className="w-14 bg-neutral-200 h-1.5 hidden sm:block">
                        <div
                          className="bg-[#0A0A0A] h-full"
                          style={{ width: `${Math.min(100, row.cartRate * 2.5)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    {row.ordersCount > 0 ? (
                      <div>
                        <span className="font-['Poppins'] font-black text-emerald-800 text-xs">
                          {row.revenue.toFixed(2)} KM
                        </span>
                        <span className="text-[10px] text-neutral-500 block">
                          {row.ordersCount} {row.ordersCount === 1 ? 'narudžba' : 'narudžbe'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-neutral-400 text-[11px]">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-[#F4F2EC] font-['Poppins'] font-bold text-xs border-t-2 border-[#0A0A0A]">
            <tr>
              <td className="p-3 uppercase">UKUPNO ({rows.length} dana):</td>
              <td className="p-3">{totals.totalVisits}</td>
              <td className="p-3">{totals.totalUnique}</td>
              <td className="p-3 text-black font-black">{totals.totalCart}</td>
              <td className="p-3">{totals.avgRate}%</td>
              <td className="p-3 text-right text-emerald-800 font-black">
                {totals.totalRevenue.toFixed(2)} KM ({totals.totalOrders} nar.)
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
