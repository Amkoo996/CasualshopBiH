import React, { useState, useEffect } from 'react';
import {
  Users,
  ShoppingBag,
  CreditCard,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  HelpCircle,
  Activity,
  Database,
  Clock,
  Eye,
} from 'lucide-react';
import { AnalyticsStats, StoreFunnelMetrics } from '../../types';
import { getAnalyticsStats, getFunnelMetrics } from '../../lib/tracking';

interface FunnelAnalyticsProps {
  ordersCount: number;
}

export const FunnelAnalytics: React.FC<FunnelAnalyticsProps> = ({ ordersCount }) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsStats | null>(null);
  const [funnelMetrics, setFunnelMetrics] = useState<StoreFunnelMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'30' | '14' | '7'>('14');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stats, funnel] = await Promise.all([
        getAnalyticsStats().catch(() => null),
        getFunnelMetrics().catch(() => null),
      ]);

      if (stats) setAnalyticsData(stats);
      if (funnel) {
        setFunnelMetrics({
          ...funnel,
          completedPurchases: Math.max(ordersCount || 0, funnel.completedPurchases || 0),
        });
      }
    } catch (e) {
      console.warn('Error loading analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [ordersCount]);

  // Sigurne vrijednosti bez opasnosti od pucanja
  const uniqueVisitors = analyticsData?.uniqueVisitorsCount ?? 0;
  const totalVisits = analyticsData?.totalVisitsCount ?? 0;
  const addToCartEvents = analyticsData?.addToCartCount ?? 0;
  const uniqueAddToCartUsers = analyticsData?.uniqueAddToCartUsersCount ?? 0;
  const addToCartRate = analyticsData?.addToCartRate ?? 0;
  const completedOrders = Math.max(ordersCount || 0, funnelMetrics?.completedPurchases ?? 0);

  // Stopa konverzije
  const visitorConversionRate = uniqueVisitors > 0
    ? ((completedOrders / uniqueVisitors) * 100).toFixed(1)
    : '0.0';

  // Filtrirani dnevni trendovi
  const rawDailyTrends = analyticsData?.dailyTrends || [];
  const filteredDailyTrends = rawDailyTrends.slice(-Number(timeFilter));

  // Izračun max vrijednosti za bars/grafikon
  const maxTrendVisitors = Math.max(...filteredDailyTrends.map((d) => d.uniqueVisitors || 0), 1);

  return (
    <div className="space-y-6 font-['Inter'] animate-fadeIn">
      {/* 1. Header sa dugmetom za osvežavanje */}
      <div className="bg-white border-2 border-neutral-200 p-5 sm:p-7 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-['Poppins'] font-black uppercase tracking-[0.2em] bg-[#0A0A0A] text-[#F7E97F] px-2 py-0.5 border border-[#F7E97F]">
                FIRESTORE: ANALYTICS_EVENTS
              </span>
              <span className="text-xs text-neutral-500 flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-neutral-400" />
                <span>Zasebna kolekcija za praćenje akcija</span>
              </span>
            </div>
            <h3 className="font-['Poppins'] text-lg sm:text-2xl font-black uppercase tracking-tight text-neutral-900 mt-1 flex items-center gap-2">
              <Activity className="w-6 h-6 text-[#0A0A0A]" />
              <span>Praćenje jedinstvenih posjetilaca & Dodavanje u korpu</span>
            </h3>
            <p className="text-xs text-neutral-500">
              Analitika ponašanja kupaca u Casual Shop BiH u realnom vremenu uz evidenciju u bazi.
            </p>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2.5 bg-[#0A0A0A] hover:bg-[#F7E97F] hover:text-[#0A0A0A] text-white border-2 border-[#0A0A0A] text-xs font-['Poppins'] font-black uppercase tracking-wider flex items-center gap-2 transition-all self-start lg:self-auto shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Učitavam...' : 'Osvježi analitiku'}</span>
          </button>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-['Inter']">
          {/* Card 1: Unique Visitors */}
          <div className="bg-[#0A0A0A] text-white p-4.5 border-2 border-[#F7E97F] space-y-1 relative overflow-hidden">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[10px] font-['Poppins'] font-bold uppercase tracking-wider text-[#F7E97F]">
                JEDINSTVENI POSJETIOCI
              </span>
              <Users className="w-4 h-4 text-[#F7E97F]" />
            </div>
            <div className="font-['Poppins'] text-2xl sm:text-3xl font-black text-white">
              {uniqueVisitors}
            </div>
            <span className="text-[11px] text-neutral-300 block">
              Ukupno posjeta: <strong>{totalVisits}</strong>
            </span>
          </div>

          {/* Card 2: Add to Cart Events */}
          <div className="bg-white border-2 border-neutral-300 p-4.5 space-y-1 shadow-xs">
            <div className="flex items-center justify-between text-neutral-600">
              <span className="text-[10px] font-['Poppins'] font-bold uppercase tracking-wider text-black">
                AKCIJE 'DODAJ U KORPU'
              </span>
              <ShoppingBag className="w-4 h-4 text-[#0A0A0A]" />
            </div>
            <div className="font-['Poppins'] text-2xl sm:text-3xl font-black text-neutral-900">
              {addToCartEvents}
            </div>
            <span className="text-[11px] text-neutral-600 block">
              Od <strong>{uniqueAddToCartUsers}</strong> različitih kupaca
            </span>
          </div>

          {/* Card 3: Add to Cart Rate */}
          <div className="bg-[#F4F2EC] border-2 border-neutral-300 p-4.5 space-y-1 shadow-xs">
            <div className="flex items-center justify-between text-neutral-600">
              <span className="text-[10px] font-['Poppins'] font-bold uppercase tracking-wider text-neutral-700">
                STOPA DODAVANJA U KORPU
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="font-['Poppins'] text-2xl sm:text-3xl font-black text-emerald-800">
              {addToCartRate}%
            </div>
            <span className="text-[11px] text-neutral-600 block">
              Posjetilaca je odabralo artikal
            </span>
          </div>

          {/* Card 4: Orders Conversion */}
          <div className="bg-[#F4F2EC] border-2 border-neutral-300 p-4.5 space-y-1 shadow-xs">
            <div className="flex items-center justify-between text-neutral-600">
              <span className="text-[10px] font-['Poppins'] font-bold uppercase tracking-wider text-neutral-700">
                REALIZOVANE NARUDŽBE
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="font-['Poppins'] text-2xl sm:text-3xl font-black text-black">
              {completedOrders}
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold block">
              Konverzija: {visitorConversionRate}% posjetilaca
            </span>
          </div>
        </div>

        {/* 2. Sigurni visualni prikaz dnevnog trenda posjeta */}
        <div className="space-y-3 pt-4 border-t border-neutral-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-['Poppins'] text-xs font-black uppercase tracking-wider text-black">
                Trend posjeta i dodavanja u korpu po danima
              </h4>
              <p className="text-[11px] text-neutral-500">
                Pregled aktivnih dana na web shopu.
              </p>
            </div>

            {/* Time filter */}
            <div className="flex border border-neutral-300 bg-[#F4F2EC] p-0.5 font-['Poppins'] text-xs font-bold self-start sm:self-auto">
              <button
                onClick={() => setTimeFilter('7')}
                className={`px-3 py-1 transition-colors ${
                  timeFilter === '7' ? 'bg-[#0A0A0A] text-white' : 'text-neutral-700 hover:text-black'
                }`}
              >
                7 DANA
              </button>
              <button
                onClick={() => setTimeFilter('14')}
                className={`px-3 py-1 transition-colors ${
                  timeFilter === '14' ? 'bg-[#0A0A0A] text-white' : 'text-neutral-700 hover:text-black'
                }`}
              >
                14 DANA
              </button>
              <button
                onClick={() => setTimeFilter('30')}
                className={`px-3 py-1 transition-colors ${
                  timeFilter === '30' ? 'bg-[#0A0A0A] text-white' : 'text-neutral-700 hover:text-black'
                }`}
              >
                30 DANA
              </button>
            </div>
          </div>

          {filteredDailyTrends.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-500 font-['Inter'] bg-[#F4F2EC] border border-neutral-300">
              Nema još zabilježenih dnevnih događaja u bazi za odabrani period.
            </div>
          ) : (
            <div className="bg-[#F4F2EC] p-4 border border-neutral-300 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {filteredDailyTrends.map((d, i) => {
                  const visitorHeight = Math.round(((d.uniqueVisitors || 0) / maxTrendVisitors) * 100);

                  return (
                    <div key={i} className="bg-white p-3 border border-neutral-300 space-y-2 flex flex-col justify-between">
                      <div className="text-center border-b pb-1">
                        <span className="font-['Poppins'] font-bold text-xs text-black block">
                          {d.date || 'Dan'}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {d.fullDate}
                        </span>
                      </div>

                      <div className="space-y-1.5 py-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-600">Posjetioci:</span>
                          <strong className="text-black">{d.uniqueVisitors || 0}</strong>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-amber-700 font-semibold">Korpa:</span>
                          <strong className="text-amber-700 font-black">{d.addToCart || 0}</strong>
                        </div>
                      </div>

                      <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#0A0A0A] h-full transition-all duration-300"
                          style={{ width: `${Math.max(5, visitorHeight)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Live Event Stream */}
      <div className="bg-white border-2 border-neutral-200 p-5 sm:p-7 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0A0A0A]" />
            <h4 className="font-['Poppins'] text-xs font-black uppercase tracking-wider text-black">
              Zadnje zabilježene akcije posjetilaca (Live Event Feed)
            </h4>
          </div>
          <span className="text-[10px] font-['Poppins'] font-bold text-neutral-400 uppercase">
            Firestore: /analytics_events
          </span>
        </div>

        {analyticsData && analyticsData.recentEvents && analyticsData.recentEvents.length > 0 ? (
          <div className="border border-neutral-200 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0A0A0A] text-white font-['Poppins'] uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-2.5">Tip akcije</th>
                  <th className="p-2.5">Vrijeme</th>
                  <th className="p-2.5">Posjetilac (ID)</th>
                  <th className="p-2.5">Detalji / Artikal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {analyticsData.recentEvents.slice(0, 10).map((evt, idx) => {
                  let timeFormatted = 'Prije trenutka';
                  try {
                    if (evt.timestamp) {
                      timeFormatted = new Date(evt.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      });
                    }
                  } catch {
                    timeFormatted = '-';
                  }

                  const isCart = evt.eventType === 'add_to_cart';
                  const isPurchase = evt.eventType === 'purchase';

                  return (
                    <tr
                      key={evt.id || idx}
                      className={isCart ? 'bg-amber-50/60' : isPurchase ? 'bg-emerald-50/60' : 'hover:bg-neutral-50'}
                    >
                      <td className="p-2.5 font-['Poppins'] font-bold text-[11px]">
                        <span
                          className={`px-2 py-0.5 inline-block ${
                            isCart
                              ? 'bg-[#0A0A0A] text-[#F7E97F] border border-[#F7E97F]'
                              : isPurchase
                              ? 'bg-emerald-800 text-white'
                              : evt.eventType === 'view_item'
                              ? 'bg-neutral-200 text-neutral-800'
                              : 'bg-[#F4F2EC] text-neutral-700'
                          }`}
                        >
                          {evt.eventType === 'visit'
                            ? 'POSJETA STRANICI'
                            : evt.eventType === 'add_to_cart'
                            ? 'DODANO U KORPU'
                            : evt.eventType === 'view_item'
                            ? 'PREGLED ARTIKLA'
                            : evt.eventType === 'begin_checkout'
                            ? 'POKRENUT CHECKOUT'
                            : 'KUPLJENO'}
                        </span>
                      </td>
                      <td className="p-2.5 text-neutral-500 font-mono text-[11px]">
                        {timeFormatted}
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-neutral-600">
                        {evt.visitorId ? `${evt.visitorId.substring(0, 12)}...` : 'Anoniman'}
                      </td>
                      <td className="p-2.5 text-neutral-800 font-semibold">
                        {evt.metadata?.productName
                          ? `${evt.metadata.productName} ${evt.metadata.size ? `(\${evt.metadata.size})` : ''} - ${evt.metadata.price ?? ''} KM`
                          : evt.metadata?.path || 'Početna stranica'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-[#F4F2EC] p-4 text-xs text-neutral-600 font-['Inter']">
            Evidentiranje akcija je aktivno. Čim posjetioci otvore shop ili dodaju majicu u korpu, ovdje će se u realnom vremenu prikazati njihove radnje.
          </div>
        )}
      </div>

      {/* 4. Actionable Strategy Box */}
      <div className="bg-[#F4F2EC] border-2 border-neutral-300 p-5 flex gap-3.5 items-start text-xs text-neutral-800">
        <HelpCircle className="w-5 h-5 text-[#0A0A0A] shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          <span className="font-['Poppins'] font-bold text-black uppercase tracking-wider block">
            Kako pretvoriti dodavanje u korpu u prodaju?
          </span>
          <p className="text-neutral-700 leading-relaxed">
            1. <strong>Retargeting napuštenih korpi</strong>: U kartici <em>"Napuštene korpe & E-mail"</em> možete vidjeti kupce koji su ostavili korpu. Jednim klikom im pošaljite promo kod od 10% popusta.<br />
            2. <strong>Analiza najtraženijih artikala</strong>: Ako se artikal često dodaje u korpu a rjeđe kupuje, provjerite zalihe ili ponudite besplatnu dostavu preko 100 KM.
          </p>
        </div>
      </div>
    </div>
  );
};
