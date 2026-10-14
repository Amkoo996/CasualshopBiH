"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Settings as SettingsIcon, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Truck, 
  AlertTriangle, 
  Search, 
  Printer, 
  ShieldCheck, 
  ShieldAlert, 
  ExternalLink,
  ChevronRight,
  Filter,
  DollarSign
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { getOrders, getProducts, updateOrderStatus } from '../lib/db';
import { Order, Product } from '../types';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'orders' | 'inventory' | 'settings'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filteri za narudžbe
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingModalOrder, setTrackingModalOrder] = useState<Order | null>(null);
  const [trackingNumberInput, setTrackingNumberInput] = useState('');

  // Učitavanje podataka
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [ordersData, productsData] = await Promise.all([
          getOrders().catch(() => []),
          getProducts().catch(() => [])
        ]);
        setOrders(ordersData || []);
        setProducts(productsData || []);
      } catch (err) {
        console.error('Greška pri učitavanju dashboarda:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // 1. KPI Metrike
  const stats = useMemo(() => {
    const totalRevenue = orders
      .filter(o => o.status === 'delivered' || o.status === 'shipped')
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const pendingOrders = orders.filter(o => o.status === 'pending' || !o.status).length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
    const aov = orders.length > 0 ? (totalRevenue / (deliveredOrders || 1)) : 0;

    return { totalRevenue, pendingOrders, deliveredOrders, aov };
  }, [orders]);

  // 2. Analiza pouzdanosti kupaca po broju telefona
  const customerHistoryMap = useMemo(() => {
    const map = new Map<string, { total: number; delivered: number; returned: number }>();
    orders.forEach(order => {
      const phone = (order.customer?.phone || (order as any).phone || '').replace(/\D/g, '');
      if (!phone) return;
      const current = map.get(phone) || { total: 0, delivered: 0, returned: 0 };
      current.total += 1;
      if (order.status === 'delivered') current.delivered += 1;
      if (order.status === 'cancelled' || order.status === 'returned') current.returned += 1;
      map.set(phone, current);
    });
    return map;
  }, [orders]);

  const getCustomerTrust = (phoneRaw?: string) => {
    const phone = (phoneRaw || '').replace(/\D/g, '');
    const data = customerHistoryMap.get(phone);
    if (!data || data.total <= 1) {
      return { label: 'Novi kupac', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: ShieldCheck };
    }
    if (data.returned > 0) {
      return { label: 'Oprez (Ima povrat)', color: 'bg-red-500/10 text-red-400 border-red-500/30', icon: ShieldAlert };
    }
    if (data.delivered >= 1) {
      return { label: 'Provjeren kupac', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: ShieldCheck };
    }
    return { label: 'Više narudžbi', color: 'bg-yellow-500/10 text-[#F7E97F] border-[#F7E97F]/30', icon: ShieldCheck };
  };

  // 3. Filtriranje narudžbi
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const customer = order.customer || (order as any);
      const name = (customer.name || customer.fullName || '').toLowerCase();
      const phone = (customer.phone || '').toLowerCase();
      const orderNum = (order.orderNumber || order.id || '').toLowerCase();
      const city = (customer.city || '').toLowerCase();

      const matchesSearch = 
        name.includes(searchQuery.toLowerCase()) ||
        phone.includes(searchQuery.toLowerCase()) ||
        orderNum.includes(searchQuery.toLowerCase()) ||
        city.includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  // 4. Promjena statusa narudžbe
  const handleStatusChange = async (orderId: string, newStatus: Order['status'], trackingNum?: string) => {
    try {
      await updateOrderStatus(orderId, newStatus, trackingNum);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, trackingNumber: trackingNum || o.trackingNumber } : o));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus, trackingNumber: trackingNum || prev.trackingNumber } : null);
      }
    } catch (err) {
      console.error('Greška pri promjeni statusa:', err);
    }
  };

  // 5. Štampanje A6 PDF Adresnice za brzu poštu
  const generateShippingSlip = (order: Order) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [105, 148] // Format A6 za termo printere
    });

    const c = order.customer || (order as any);
    const buyerName = c.name || c.fullName || 'Kupac';
    const buyerPhone = c.phone || 'N/A';
    const buyerAddress = c.address || 'N/A';
    const buyerCity = `${c.postalCode || ''} ${c.city || ''}`.trim();
    const buyerNote = c.note || 'Nema napomene';

    // Okvir
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.4);
    doc.rect(4, 4, 97, 140);

    // Zaglavlje
    doc.setFillColor(15, 15, 15);
    doc.rect(4, 4, 97, 16, 'F');
    doc.setTextColor(247, 233, 127);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('CASUAL SHOP BiH', 8, 12);

    doc.setFontSize(8);
    doc.setTextColor(200, 200, 200);
    doc.text(`NARUDŽBA #${order.orderNumber || order.id?.slice(0, 7)}`, 8, 17);

    // Pošiljalac
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(7);
    doc.text('POŠILJALAC:', 8, 25);
    doc.setTextColor(20, 20, 20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Casual Shop BiH (Sarajevo)', 8, 29);
    doc.setFont('helvetica', 'normal');
    doc.text('Tel: +387 61 000 000 | info@casualshop.ba', 8, 33);

    // Linija razdvajanja
    doc.line(8, 36, 97, 36);

    // Primalac
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(7);
    doc.text('PRIMALAC (KUPAC):', 8, 42);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(buyerName.toUpperCase(), 8, 48);

    doc.setFontSize(9);
    doc.text(`Adresa: ${buyerAddress}`, 8, 54);
    doc.text(`Grad: ${buyerCity}`, 8, 59);
    doc.text(`Telefon: ${buyerPhone}`, 8, 64);

    // Napomena
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(`Napomena: ${buyerNote}`, 8, 70);

    // Otkupnina Box
    doc.setFillColor(245, 245, 245);
    doc.rect(8, 75, 89, 18, 'F');
    doc.setDrawColor(0, 0, 0);
    doc.rect(8, 75, 89, 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('OTKUPNINA (PLAĆANJE POUZEĆEM):', 12, 82);
    doc.setFontSize(14);
    doc.text(`${(order.total || 0).toFixed(2)} KM`, 12, 90);

    // Sadržaj paketa
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text('SADRŽAJ POŠILJKE:', 8, 100);

    let y = 106;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    (order.items || []).forEach((item) => {
      doc.text(`• ${item.quantity}x ${item.name} (${item.size || 'Univerzalno'})`, 10, y);
      y += 5;
    });

    // Uputstvo za kurira
    doc.setFillColor(254, 249, 195);
    doc.rect(8, 126, 89, 13, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(133, 77, 14);
    doc.text('DOZVOLJENO OTVARANJE PAKETA PRIJE PREUZIMANJA', 11, 132);
    doc.text('UGOVORENA BRZA POŠTA: X EXPRESS', 11, 136);

    doc.save(`Adresnica_${order.orderNumber || 'narudzba'}.pdf`);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-neutral-100 flex flex-col md:flex-row font-['Inter']">
      
      {/* 1. LIJEVA BOČNA TRAKA (SIDEBAR) */}
      <aside className="w-full md:w-64 bg-[#121212] border-r border-neutral-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo i Brand */}
          <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
            <div>
              <span className="font-['Poppins'] font-black text-lg tracking-wider text-white">CASUAL</span>
              <span className="font-['Poppins'] font-bold text-lg text-[#F7E97F] ml-1">ADMIN</span>
              <p className="text-[10px] text-neutral-400 font-semibold tracking-widest uppercase mt-0.5">Control Center</p>
            </div>
            <Link 
              href="/" 
              target="_blank" 
              className="p-1.5 text-neutral-400 hover:text-[#F7E97F] hover:bg-neutral-800 rounded transition-colors"
              title="Idi na webshop"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>

          {/* Meni */}
          <nav className="p-4 space-y-1.5">
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-['Poppins'] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-[#F7E97F] text-[#0A0A0A] shadow-md shadow-[#F7E97F]/10'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-4 h-4" />
                <span>Narudžbe</span>
              </div>
              {stats.pendingOrders > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeTab === 'orders' ? 'bg-[#0A0A0A] text-[#F7E97F]' : 'bg-[#F7E97F] text-[#0A0A0A]'}`}>
                  {stats.pendingOrders}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-['Poppins'] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-[#F7E97F] text-[#0A0A0A]'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Analitika & KPI</span>
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-['Poppins'] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-[#F7E97F] text-[#0A0A0A]'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Zalihe & Proizvodi</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-['Poppins'] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#F7E97F] text-[#0A0A0A]'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
              <span>Podešavanja & Banner</span>
            </button>
          </nav>
        </div>

        {/* Info na dnu */}
        <div className="p-4 border-t border-neutral-800">
          <div className="flex items-center gap-3 p-2 bg-neutral-900/60 rounded-lg border border-neutral-800">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <div className="text-[11px]">
              <p className="text-white font-medium">Baza aktivna</p>
              <p className="text-neutral-400 text-[10px]">Cloudflare & Firebase</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. GLAVNI RADNI PROSTOR */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top bar sa brzim metrikama */}
        <header className="p-6 border-b border-neutral-800 bg-[#0F0F0F] flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-['Poppins'] font-black text-xl text-white uppercase tracking-wide">
              {activeTab === 'orders' && 'Upravljanje Narudžbama'}
              {activeTab === 'analytics' && 'Pregled Prodaje & Statistika'}
              {activeTab === 'inventory' && 'Pregled Artikala i Veličina'}
              {activeTab === 'settings' && 'Konfiguracija Webshopa'}
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Pregled u realnom vremenu uz automatsko praćenje paketa i kupaca.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 border border-neutral-700 hover:border-[#F7E97F] text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-300 hover:text-[#F7E97F] transition-all rounded"
            >
              ← Nazad u Shop
            </Link>
          </div>
        </header>

        <div className="p-6 space-y-6 flex-1">

          {/* KARTICE STATISTIKE (UVIJEK VIDLJIVE ZA BRZI PREGLED) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#141414] border border-neutral-800 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 font-medium">Isporučeni Prihod</p>
                <p className="text-xl font-['Poppins'] font-black text-[#F7E97F] mt-1">
                  {stats.totalRevenue.toFixed(2)} KM
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#F7E97F]/10 border border-[#F7E97F]/20 flex items-center justify-center text-[#F7E97F]">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-[#141414] border border-neutral-800 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 font-medium">Nove Narudžbe (Čekanje)</p>
                <p className="text-xl font-['Poppins'] font-black text-amber-400 mt-1">
                  {stats.pendingOrders}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-[#141414] border border-neutral-800 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 font-medium">Uspješno Dostavljeno</p>
                <p className="text-xl font-['Poppins'] font-black text-emerald-400 mt-1">
                  {stats.deliveredOrders}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-[#141414] border border-neutral-800 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 font-medium">Prosječna Korpa (AOV)</p>
                <p className="text-xl font-['Poppins'] font-black text-blue-400 mt-1">
                  {stats.aov.toFixed(2)} KM
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-400/10 border border-blue-400/20 flex items-center justify-center text-blue-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* TAB 1: NARUDŽBE */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {/* Filteri & Pretraga */}
              <div className="bg-[#141414] border border-neutral-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pretraži po imenu, gradu, telefonu ili broju narudžbe..."
                    className="w-full bg-[#1A1A1A] border border-neutral-700 text-white pl-9 pr-4 py-2 text-xs rounded-lg focus:border-[#F7E97F] focus:outline-none placeholder-neutral-500"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto">
                  <Filter className="w-4 h-4 text-neutral-400 shrink-0" />
                  {[
                    { id: 'all', label: 'Sve' },
                    { id: 'pending', label: 'Nove' },
                    { id: 'confirmed', label: 'Potvrđene' },
                    { id: 'shipped', label: 'Poslane' },
                    { id: 'delivered', label: 'Isporučene' },
                    { id: 'cancelled', label: 'Vraćene/Otkazane' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-['Poppins'] font-bold uppercase transition-colors shrink-0 cursor-pointer ${
                        statusFilter === tab.id
                          ? 'bg-[#F7E97F] text-[#0A0A0A]'
                          : 'bg-[#1A1A1A] text-neutral-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabela Narudžbi */}
              <div className="bg-[#141414] border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#1C1C1C] border-b border-neutral-800 text-neutral-400 uppercase font-['Poppins'] tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Narudžba & Datum</th>
                        <th className="py-3 px-4">Kupac & Grad</th>
                        <th className="py-3 px-4">Pouzdanost</th>
                        <th className="py-3 px-4">Artikli</th>
                        <th className="py-3 px-4">Iznos</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Akcije</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-neutral-400">
                            Nema pronađenih narudžbi za zadati filter.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map(order => {
                          const c = order.customer || (order as any);
                          const trust = getCustomerTrust(c.phone);
                          const TrustIcon = trust.icon;

                          return (
                            <tr key={order.id} className="hover:bg-neutral-800/40 transition-colors">
                              <td className="py-3.5 px-4 font-mono">
                                <span className="font-bold text-white block">#{order.orderNumber || order.id?.slice(0, 7)}</span>
                                <span className="text-[10px] text-neutral-500">
                                  {order.createdAt ? new Date(order.createdAt).toLocaleDateString('bs-BA') : 'Danas'}
                                </span>
                              </td>

                              <td className="py-3.5 px-4">
                                <span className="font-bold text-white block">{c.name || c.fullName || 'N/A'}</span>
                                <span className="text-neutral-400 text-[11px] block">{c.city || 'BiH'} • {c.phone}</span>
                              </td>

                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${trust.color}`}>
                                  <TrustIcon className="w-3 h-3" />
                                  {trust.label}
                                </span>
                              </td>

                              <td className="py-3.5 px-4">
                                <span className="text-neutral-300">
                                  {order.items?.length || 0} art. ({order.items?.map(i => `${i.quantity}x ${i.size || 'M'}`).join(', ')})
                                </span>
                              </td>

                              <td className="py-3.5 px-4 font-['Poppins'] font-bold text-[#F7E97F]">
                                {(order.total || 0).toFixed(2)} KM
                              </td>

                              <td className="py-3.5 px-4">
                                <select
                                  value={order.status || 'pending'}
                                  onChange={(e) => {
                                    const val = e.target.value as Order['status'];
                                    if (val === 'shipped') {
                                      setTrackingModalOrder(order);
                                      setTrackingNumberInput(order.trackingNumber || '');
                                    } else {
                                      handleStatusChange(order.id, val);
                                    }
                                  }}
                                  className="bg-[#1E1E1E] border border-neutral-700 text-xs text-white rounded px-2 py-1 focus:border-[#F7E97F] focus:outline-none cursor-pointer"
                                >
                                  <option value="pending">Nova (Čeka)</option>
                                  <option value="confirmed">Potvrđena</option>
                                  <option value="shipped">Poslana (Kurir)</option>
                                  <option value="delivered">Dostavljena</option>
                                  <option value="cancelled">Vraćena / Otkazana</option>
                                </select>
                              </td>

                              <td className="py-3.5 px-4 text-right space-x-2">
                                <button
                                  onClick={() => generateShippingSlip(order)}
                                  className="p-1.5 bg-neutral-800 hover:bg-[#F7E97F] hover:text-[#0A0A0A] text-neutral-300 rounded transition-colors cursor-pointer inline-flex items-center"
                                  title="Štampaj A6 Adresnicu"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => setSelectedOrder(order)}
                                  className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded transition-colors cursor-pointer inline-flex items-center"
                                  title="Detaljan pregled"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ZALIHE & PROIZVODI */}
          {activeTab === 'inventory' && (
            <div className="bg-[#141414] border border-neutral-800 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                <h3 className="font-['Poppins'] font-black uppercase text-sm tracking-wide text-white">
                  Stanje artikala po veličinama
                </h3>
                <span className="text-xs text-neutral-400">Ukupno artikala: {products.length}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map(product => {
                  const hasSizes = product.sizes && product.sizes.length > 0;
                  return (
                    <div key={product.id} className="p-4 bg-[#1A1A1A] border border-neutral-800 rounded-lg flex flex-col justify-between space-y-3">
                      <div className="flex gap-3">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.name} className="w-14 h-14 object-cover rounded bg-neutral-900 shrink-0" />
                        ) : (
                          <div className="w-14 h-14 bg-neutral-800 rounded flex items-center justify-center shrink-0">
                            <Package className="w-6 h-6 text-neutral-600" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-white truncate">{product.name}</h4>
                          <p className="text-xs text-[#F7E97F] font-['Poppins'] font-black">{product.price} KM</p>
                          <span className="text-[10px] text-neutral-400 uppercase tracking-widest">{product.category}</span>
                        </div>
                      </div>

                      <div className="border-t border-neutral-800 pt-2">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                          Veličine na stanju:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {hasSizes ? (
                            product.sizes.map((s: any) => {
                              const sizeName = typeof s === 'string' ? s : s.size;
                              const stock = typeof s === 'object' ? s.stock : 'Dostupno';
                              return (
                                <span key={sizeName} className="px-2 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-[11px] font-mono text-neutral-200">
                                  {sizeName}: <strong className="text-[#F7E97F]">{stock}</strong>
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-xs text-neutral-500 italic">Univerzalna veličina</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: ANALITIKA */}
          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#141414] border border-neutral-800 rounded-xl p-5 space-y-3">
                <h3 className="font-['Poppins'] font-bold text-sm uppercase tracking-wider text-white">
                  Pregled po statusima pošiljki
                </h3>
                <div className="space-y-2 pt-2">
                  {[
                    { label: 'Nove narudžbe', count: stats.pendingOrders, color: 'bg-amber-400' },
                    { label: 'Dostavljeni paketi', count: stats.deliveredOrders, color: 'bg-emerald-400' },
                    { label: 'Ukupno kreiranih', count: orders.length, color: 'bg-blue-400' }
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between p-3 bg-neutral-900 rounded-lg">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                        <span className="text-xs text-neutral-300">{item.label}</span>
                      </div>
                      <span className="font-['Poppins'] font-bold text-xs text-white">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#141414] border border-neutral-800 rounded-xl p-5 space-y-3">
                <h3 className="font-['Poppins'] font-bold text-sm uppercase tracking-wider text-white">
                  X Express Otprema
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Za svaku poslanu narudžbu unesite broj pošiljke. Kupac automatski dobiva uvid u status paketa na stranici <strong>/dostava-i-povrat</strong>.
                </p>
                <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center gap-3 mt-4">
                  <Truck className="w-6 h-6 text-[#F7E97F] shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-white">Direktno printanje adresnica</p>
                    <p className="text-neutral-400 text-[11px]">Formatirano za termo naljepnice (105x148mm).</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PODEŠAVANJA */}
          {activeTab === 'settings' && (
            <div className="bg-[#141414] border border-neutral-800 rounded-xl p-6 max-w-xl space-y-4">
              <h3 className="font-['Poppins'] font-bold text-sm uppercase tracking-wider text-white">
                Glavne postavke webshopa
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-neutral-400 block mb-1">Gornja obavijest (Top bar text):</label>
                  <input
                    type="text"
                    defaultValue="Plaćanje pouzećem • Brza pošta 12 KM • Moguće otvaranje paketa prije preuzimanja"
                    className="w-full bg-[#1A1A1A] border border-neutral-700 text-white px-3 py-2 rounded focus:border-[#F7E97F] focus:outline-none"
                    disabled
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block">Mijenja se direktno u Firestore bazi (`settings`).</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* MODAL ZA UNOS TRACKING BROJA */}
      {trackingModalOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border-2 border-[#F7E97F] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-['Poppins'] font-black uppercase text-sm tracking-wide text-white">
              Unos broja pošiljke (X Express)
            </h3>
            <p className="text-xs text-neutral-400">
              Unesite tracking broj za narudžbu #{trackingModalOrder.orderNumber || trackingModalOrder.id?.slice(0, 7)} kako bi kupac mogao pratiti paket.
            </p>
            <input
              type="text"
              value={trackingNumberInput}
              onChange={(e) => setTrackingNumberInput(e.target.value)}
              placeholder="Npr. 1029384756..."
              className="w-full bg-[#1F1F1F] border border-neutral-700 text-white px-3 py-2 text-xs rounded focus:border-[#F7E97F] focus:outline-none"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setTrackingModalOrder(null)}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
              >
                Odustani
              </button>
              <button
                onClick={() => {
                  handleStatusChange(trackingModalOrder.id, 'shipped', trackingNumberInput.trim());
                  setTrackingModalOrder(null);
                }}
                className="px-4 py-1.5 bg-[#F7E97F] text-[#0A0A0A] font-['Poppins'] font-bold text-xs uppercase rounded hover:bg-[#ebd965]"
              >
                Spremi & Označi kao poslan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ZA DETALJAN PREGLED NARUDŽBE */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-neutral-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-['Poppins'] font-black uppercase text-sm tracking-wide text-white">
                Detalji narudžbe #{selectedOrder.orderNumber || selectedOrder.id?.slice(0, 7)}
              </h3>
              <button onClick={() => setSelectedOrder(null)} className="text-neutral-400 hover:text-white text-xs">
                ✕ Zatvori
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral-300">
              <div className="p-3 bg-neutral-900 rounded-lg space-y-1">
                <p><strong>Ime kupca:</strong> {(selectedOrder.customer || (selectedOrder as any)).name}</p>
                <p><strong>Telefon:</strong> {(selectedOrder.customer || (selectedOrder as any)).phone}</p>
                <p><strong>Adresa:</strong> {(selectedOrder.customer || (selectedOrder as any)).address}, {(selectedOrder.customer || (selectedOrder as any)).city}</p>
                <p><strong>Napomena:</strong> {(selectedOrder.customer || (selectedOrder as any)).note || 'Nema napomene'}</p>
              </div>

              <div>
                <strong className="block text-white mb-2">Naručeni artikli:</strong>
                <div className="space-y-1.5">
                  {(selectedOrder.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between p-2 bg-neutral-900/50 rounded border border-neutral-800">
                      <span>{item.quantity}x {item.name} ({item.size})</span>
                      <span className="font-bold text-[#F7E97F]">{item.price} KM</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-neutral-800 pt-3 flex justify-between items-center text-sm">
                <span className="font-bold text-white">UKUPAN IZNOS:</span>
                <span className="font-['Poppins'] font-black text-[#F7E97F] text-base">
                  {(selectedOrder.total || 0).toFixed(2)} KM
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-neutral-800">
              <button
                onClick={() => generateShippingSlip(selectedOrder)}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-[#F7E97F] hover:text-[#0A0A0A] text-xs font-bold rounded flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Štampaj Adresnicu
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-1.5 bg-neutral-800 text-white text-xs rounded hover:bg-neutral-700"
              >
                Zatvori
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};