"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  ShoppingBag, 
  Package, 
  Settings as SettingsIcon, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Search, 
  Printer, 
  ShieldCheck, 
  ShieldAlert, 
  ExternalLink,
  ChevronRight,
  Filter,
  DollarSign,
  Plus,
  Download,
  Upload,
  ShoppingCart,
  Users,
  Eye,
  Trash2,
  Edit,
  Save,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { getOrders, getProducts, updateOrderStatus } from '../lib/db';
import { Order, Product } from '../types';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

// 1. Sanitizer za jsPDF - rješava nestanak slova Č, Ć, Đ, Š, Ž na termo slipovima
const cleanPdfText = (str: string = ''): string => {
  return str
    .replace(/[čČ]/g, (m) => (m === 'č' ? 'c' : 'C'))
    .replace(/[ćĆ]/g, (m) => (m === 'ć' ? 'c' : 'C'))
    .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'dj' : 'Dj'))
    .replace(/[šŠ]/g, (m) => (m === 'š' ? 's' : 'S'))
    .replace(/[žŽ]/g, (m) => (m === 'ž' ? 'z' : 'Z'));
};

// 2. Pametno izvlačenje imena i podataka o kupcu (rješava problem gdje je pisalo N/A)
const extractCustomer = (order: any) => {
  const c = order.customer || order.customerInfo || order.shippingAddress || {};
  const name =
    c.fullName ||
    c.name ||
    c.ime ||
    order.customerName ||
    order.fullName ||
    order.name ||
    (c.phone ? `Kupac (${c.phone})` : 'Kupac');

  const phone = c.phone || order.phone || 'N/A';
  const city = c.city || order.city || 'BiH';
  const address = c.address || order.address || 'N/A';
  const postalCode = c.postalCode || order.postalCode || '';
  const note = c.note || order.note || 'Nema napomene';

  return { name, phone, city, address, postalCode, note };
};

// Normalizacija statusa narudžbe
const normalizeStatus = (statusRaw?: any): string => {
  const s = String(statusRaw || '').toLowerCase();
  if (['delivered', 'dostavljeno', 'isporuceno', 'isporučeno', 'zavrseno'].includes(s)) return 'delivered';
  if (['shipped', 'poslano', 'poslato', 'u_dostavi'].includes(s)) return 'shipped';
  if (['confirmed', 'potvrdjeno', 'potvrđeno', 'u_obradi'].includes(s)) return 'confirmed';
  if (['cancelled', 'otkazano', 'stornirano', 'returned', 'vraceno', 'vraćeno'].includes(s)) return 'cancelled';
  return 'pending';
};

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'abandoned' | 'analytics' | 'newsletter' | 'settings'>('orders');
  
  // Glavni podaci
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [subscribers, setSubscribers] = useState<{ email: string; date?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filteri i pretraga
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingModalOrder, setTrackingModalOrder] = useState<Order | null>(null);
  const [trackingNumberInput, setTrackingNumberInput] = useState('');

  // Modali za proizvode
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  // CMS Postavke
  const [cmsSettings, setCmsSettings] = useState({
    topBarText: 'Plaćanje pouzećem • Brza pošta 12 KM • Moguće otvaranje paketa prije preuzimanja',
    freeShippingThreshold: 100,
    dropTimerActive: true,
    dropTimerDate: '2026-11-01T00:00',
    contactPhone: '+387 61 000 000',
    contactEmail: 'info@casualshop.ba',
    instagramUrl: 'https://www.instagram.com/casualshop.bih'
  });

  // Učitavanje svih podataka iz Firestore-a
  useEffect(() => {
    async function loadAllData() {
      setLoading(true);
      try {
        const [ordersData, productsData] = await Promise.all([
          getOrders().catch(() => []),
          getProducts().catch(() => [])
        ]);
        setOrders(ordersData || []);
        setProducts(productsData || []);

        // Učitavanje newsletter pretplatnika ako kolekcija postoji
        try {
          const subsSnap = await getDocs(collection(db, 'newsletter'));
          const subsList: any[] = [];
          subsSnap.forEach((d) => subsList.push({ email: d.id, ...d.data() }));
          setSubscribers(subsList);
        } catch {
          setSubscribers([]);
        }

        // Učitavanje postavki sajta
        try {
          const setSnap = await getDocs(collection(db, 'settings'));
          if (!setSnap.empty) {
            setCmsSettings((prev) => ({ ...prev, ...(setSnap.docs[0].data() as any) }));
          }
        } catch {}
      } catch (err) {
        console.error('Greška pri učitavanju dashboarda:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAllData();
  }, []);

  // KPI Analitika
  const stats = useMemo(() => {
    const totalRevenue = orders
      .filter((o) => ['delivered', 'shipped'].includes(normalizeStatus(o.status)))
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const pendingOrders = orders.filter((o) => normalizeStatus(o.status) === 'pending').length;
    const deliveredOrders = orders.filter((o) => normalizeStatus(o.status) === 'delivered').length;
    const aov = orders.length > 0 ? totalRevenue / (deliveredOrders || 1) : 0;

    // Procijenjeni broj ulaza i stopa konverzije
    const estimatedVisits = Math.max(orders.length * 34, 1850);
    const conversionRate = ((orders.length / estimatedVisits) * 100).toFixed(2);

    return { totalRevenue, pendingOrders, deliveredOrders, aov, estimatedVisits, conversionRate };
  }, [orders]);

  // Pouzdanost kupaca
  const customerHistoryMap = useMemo(() => {
    const map = new Map<string, { total: number; delivered: number; returned: number }>();
    orders.forEach((order) => {
      const { phone } = extractCustomer(order);
      const cleanPhone = phone.replace(/\D/g, '');
      if (!cleanPhone) return;
      const cur = map.get(cleanPhone) || { total: 0, delivered: 0, returned: 0 };
      cur.total += 1;
      const norm = normalizeStatus(order.status);
      if (norm === 'delivered') cur.delivered += 1;
      if (norm === 'cancelled') cur.returned += 1;
      map.set(cleanPhone, cur);
    });
    return map;
  }, [orders]);

  const getCustomerTrust = (phoneRaw: string) => {
    const cleanPhone = phoneRaw.replace(/\D/g, '');
    const data = customerHistoryMap.get(cleanPhone);
    if (!data || data.total <= 1) {
      return { label: 'Novi kupac', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: ShieldCheck };
    }
    if (data.returned > 0) {
      return { label: 'Oprez (Ima povrat)', color: 'bg-red-50 text-red-700 border-red-200', icon: ShieldAlert };
    }
    if (data.delivered >= 1) {
      return { label: 'Provjeren kupac', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: ShieldCheck };
    }
    return { label: 'Više narudžbi', color: 'bg-amber-50 text-amber-800 border-amber-200', icon: ShieldCheck };
  };

  // Filtrirane narudžbe
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const { name, phone, city } = extractCustomer(order);
      const orderNum = (order.orderNumber || order.id || '').toLowerCase();

      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        orderNum.includes(searchQuery.toLowerCase()) ||
        city.toLowerCase().includes(searchQuery.toLowerCase());

      const norm = normalizeStatus(order.status);
      const matchesStatus = statusFilter === 'all' || norm === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  // Ažuriranje statusa
  const handleStatusChange = async (orderId: string, newStatus: any, trackingNum?: string) => {
    try {
      await updateOrderStatus(
        orderId,
        newStatus,
        trackingNum ? { trackingNumber: trackingNum, courierName: 'X Express' } : undefined
      );
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: newStatus, trackingNumber: trackingNum || o.trackingNumber }
            : o
        )
      );
    } catch (err) {
      console.error('Greška pri promjeni statusa:', err);
    }
  };

  // Izvoz narudžbi u CSV / Excel
  const exportOrdersCSV = () => {
    const headers = ['Broj Narudzbe', 'Datum', 'Kupac', 'Telefon', 'Grad', 'Adresa', 'Iznos (KM)', 'Status'];
    const rows = orders.map((o) => {
      const c = extractCustomer(o);
      return [
        `#${o.orderNumber || o.id?.slice(0, 7)}`,
        o.createdAt ? new Date(o.createdAt).toLocaleDateString('bs-BA') : '',
        `"${cleanPdfText(c.name)}"`,
        `"${c.phone}"`,
        `"${cleanPdfText(c.city)}"`,
        `"${cleanPdfText(c.address)}"`,
        (o.total || 0).toFixed(2),
        normalizeStatus(o.status),
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CasualShop_Narudzbe_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Štampanje A6 PDF Adresnice s ispravljenim slovima
  const generateShippingSlip = (order: Order) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [105, 148],
    });

    const c = extractCustomer(order);
    const buyerName = cleanPdfText(c.name.toUpperCase());
    const buyerPhone = cleanPdfText(c.phone);
    const buyerAddress = cleanPdfText(c.address);
    const buyerCity = cleanPdfText(`${c.postalCode} ${c.city}`.trim());
    const buyerNote = cleanPdfText(c.note);

    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.4);
    doc.rect(4, 4, 97, 140);

    // Zaglavlje
    doc.setFillColor(15, 23, 42);
    doc.rect(4, 4, 97, 16, 'F');
    doc.setTextColor(247, 233, 127);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('CASUAL SHOP BiH', 8, 12);

    doc.setFontSize(8);
    doc.setTextColor(226, 232, 240);
    doc.text(`NARUDZBA #${order.orderNumber || order.id?.slice(0, 7)}`, 8, 17);

    // Pošiljalac
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.text('POSILJALAC:', 8, 25);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Casual Shop BiH (Sarajevo)', 8, 29);
    doc.setFont('helvetica', 'normal');
    doc.text('Tel: +387 61 000 000 | info@casualshop.ba', 8, 33);

    doc.line(8, 36, 97, 36);

    // Primalac
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.text('PRIMALAC (KUPAC):', 8, 42);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(buyerName, 8, 48);

    doc.setFontSize(9);
    doc.text(`Adresa: ${buyerAddress}`, 8, 54);
    doc.text(`Grad: ${buyerCity}`, 8, 59);
    doc.text(`Telefon: ${buyerPhone}`, 8, 64);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Napomena: ${buyerNote}`, 8, 70);

    // Otkupnina Box
    doc.setFillColor(248, 250, 252);
    doc.rect(8, 75, 89, 18, 'F');
    doc.setDrawColor(15, 23, 42);
    doc.rect(8, 75, 89, 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('OTKUPNINA (PLACANJE POUZECEM):', 12, 82);
    doc.setFontSize(14);
    doc.text(`${(order.total || 0).toFixed(2)} KM`, 12, 90);

    // Artikli
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('SADRZAJ POSILJKE:', 8, 100);

    let y = 106;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    (order.items || []).forEach((item) => {
      doc.text(`• ${item.quantity}x ${cleanPdfText(item.name)} (${cleanPdfText(item.size || 'Univerzalno')})`, 10, y);
      y += 5;
    });

    // Uputstvo za kurira
    doc.setFillColor(254, 240, 138);
    doc.rect(8, 126, 89, 13, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(113, 63, 18);
    doc.text('DOZVOLJENO OTVARANJE PAKETA PRIJE PREUZIMANJA', 11, 132);
    doc.text('UGOVORENA BRZA POSTA: X EXPRESS', 11, 136);

    doc.save(`Adresnica_${order.orderNumber || 'narudzba'}.pdf`);
  };

  // Dodavanje ili uređivanje artikla
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || !editingProduct?.price) return;

    try {
      const prodId = editingProduct.id || `cs-${Date.now()}`;
      const productData = {
        ...editingProduct,
        id: prodId,
        price: Number(editingProduct.price),
        sizes: editingProduct.sizes || { S: 5, M: 5, L: 5, XL: 5 },
        images: editingProduct.images || ['/hero-streetwear.webp'],
        category: editingProduct.category || 'Majice',
      };

      await setDoc(doc(db, 'products', prodId), productData, { merge: true });
      setProducts((prev) => {
        const idx = prev.findIndex((p) => p.id === prodId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = productData as Product;
          return updated;
        }
        return [productData as Product, ...prev];
      });

      setProductModalOpen(false);
      setEditingProduct(null);
    } catch (err) {
      console.error('Greška pri spremanju artikla:', err);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Jeste li sigurni da želite obrisati ovaj artikl?')) return;
    try {
      await deleteDoc(doc(db, 'products', productId));
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (err) {
      console.error('Greška pri brisanju:', err);
    }
  };

  // Izvoz i Uvoz JSON baze artikala
  const exportProductsJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(products, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `CasualShop_Proizvodi_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchorElem.click();
  };

  const handleImportProductsJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          for (const item of imported) {
            if (item.id) {
              await setDoc(doc(db, 'products', item.id), item, { merge: true });
            }
          }
          setProducts(imported);
          alert(`Uspješno uvezeno ${imported.length} artikala!`);
        }
      } catch (err) {
        alert('Neispravna JSON datoteka.');
      }
    };
    reader.readAsText(file);
  };

  // Spremanje CMS postavki
  const handleSaveCmsSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'general'), cmsSettings, { merge: true });
      alert('Postavke webshopa su uspješno ažurirane!');
    } catch (err) {
      console.error('Greška pri spremanju postavki:', err);
      alert('Greška pri spremanju postavki.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col md:flex-row font-['Inter']">
      
      {/* 1. SVIJETLA BOČNA NAVIGACIJA */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 shadow-sm">
        <div>
          {/* Logo i Brand */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 font-['Poppins']">
                <span className="font-black text-lg tracking-wider text-slate-950">CASUAL</span>
                <span className="px-2 py-0.5 bg-[#F7E97F] text-slate-950 text-xs font-black rounded">ADMIN</span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-1">E-Commerce Panel</p>
            </div>
            <Link
              href="/"
              target="_blank"
              className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Pregledaj Webshop"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>

          {/* Glavni Meni */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-['Poppins'] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-[#F7E97F] text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-4 h-4" />
                <span>Narudžbe</span>
              </div>
              {stats.pendingOrders > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-950 text-[#F7E97F]">
                  {stats.pendingOrders}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-['Poppins'] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-[#F7E97F] text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Artikli & Zalihe</span>
            </button>

            <button
              onClick={() => setActiveTab('abandoned')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-['Poppins'] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'abandoned'
                  ? 'bg-[#F7E97F] text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Napuštene Korpe</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-['Poppins'] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-[#F7E97F] text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Posjete & Metrika</span>
            </button>

            <button
              onClick={() => setActiveTab('newsletter')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-['Poppins'] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'newsletter'
                  ? 'bg-[#F7E97F] text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Newsletter</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-['Poppins'] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#F7E97F] text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
              <span>CMS & Postavke</span>
            </button>
          </nav>
        </div>

        {/* Status na dnu */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <div className="text-[11px]">
              <p className="text-slate-900 font-bold">Cloudflare & Firebase</p>
              <p className="text-slate-500 text-[10px]">Sinkronizacija aktivna</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. GLAVNI SADRŽAJ */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Zaglavlje */}
        <header className="p-6 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-['Poppins'] font-black text-xl text-slate-900 uppercase tracking-wide">
              {activeTab === 'orders' && 'Upravljanje Narudžbama'}
              {activeTab === 'products' && 'Katalog Artikala & Zalihe'}
              {activeTab === 'abandoned' && 'Napuštene Korpe'}
              {activeTab === 'analytics' && 'Analitika Prodaje & Posjete'}
              {activeTab === 'newsletter' && 'Pretplatnici na Newsletter'}
              {activeTab === 'settings' && 'CMS Podešavanja Webshopa'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kompletan operativni pregled u realnom vremenu.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'orders' && (
              <button
                onClick={exportOrdersCSV}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-['Poppins'] font-bold uppercase rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Izvezi CSV
              </button>
            )}

            {activeTab === 'products' && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingProduct({
                      name: '',
                      price: 39,
                      category: 'Majice',
                      description: '',
                      images: ['/hero-streetwear.webp'],
                      sizes: { S: 5, M: 5, L: 5, XL: 5, XXL: 2 }
                    });
                    setProductModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-[#F7E97F] hover:bg-amber-300 text-slate-950 text-xs font-['Poppins'] font-black uppercase rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Novi Artikl
                </button>
                <button
                  onClick={exportProductsJSON}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                  title="Izvezi artikle (JSON)"
                >
                  <Download className="w-4 h-4" />
                </button>
                <label
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                  title="Uvezi artikle (JSON)"
                >
                  <Upload className="w-4 h-4" />
                  <input type="file" accept=".json" onChange={handleImportProductsJSON} className="hidden" />
                </label>
              </div>
            )}

            <Link
              href="/"
              className="px-4 py-2 border border-slate-300 hover:border-slate-400 text-xs font-['Poppins'] font-bold uppercase text-slate-700 hover:text-slate-950 transition-all rounded-lg"
            >
              ← Webshop
            </Link>
          </div>
        </header>

        <div className="p-6 space-y-6 flex-1">

          {/* GLAVNE STATISTIČKE KARTICE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Ukupan Prihod (Poslano/Dostavljeno)</p>
                <p className="text-2xl font-['Poppins'] font-black text-slate-900 mt-1">
                  {stats.totalRevenue.toFixed(2)} KM
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-bold">
                KM
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Nove Narudžbe (Čekanje)</p>
                <p className="text-2xl font-['Poppins'] font-black text-amber-600 mt-1">
                  {stats.pendingOrders}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Uspješno Isporučeno</p>
                <p className="text-2xl font-['Poppins'] font-black text-emerald-600 mt-1">
                  {stats.deliveredOrders}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Posjete & Stopa Konverzije</p>
                <p className="text-2xl font-['Poppins'] font-black text-blue-600 mt-1">
                  {stats.conversionRate}%
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">~{stats.estimatedVisits} posjeta</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Eye className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* TAB 1: NARUDŽBE */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {/* Pretraga i filteri */}
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div className="relative flex-1 min-w-[260px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pretraži po imenu kupca, telefonu, gradu ili broju narudžbe..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-9 pr-4 py-2 text-xs rounded-lg focus:border-amber-400 focus:bg-white focus:outline-none placeholder-slate-400"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <Filter className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
                  {[
                    { id: 'all', label: 'Sve' },
                    { id: 'pending', label: 'Nove' },
                    { id: 'confirmed', label: 'Potvrđene' },
                    { id: 'shipped', label: 'Poslane' },
                    { id: 'delivered', label: 'Isporučene' },
                    { id: 'cancelled', label: 'Otkazane' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-['Poppins'] font-bold uppercase transition-colors shrink-0 cursor-pointer ${
                        statusFilter === tab.id
                          ? 'bg-[#F7E97F] text-slate-950 font-black shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabela narudžbi */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-['Poppins'] tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3.5 px-4">Narudžba & Datum</th>
                        <th className="py-3.5 px-4">Kupac & Telefon</th>
                        <th className="py-3.5 px-4">Grad & Adresa</th>
                        <th className="py-3.5 px-4">Pouzdanost</th>
                        <th className="py-3.5 px-4">Artikli</th>
                        <th className="py-3.5 px-4">Iznos</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Akcije</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-slate-400 font-medium">
                            Nema pronađenih narudžbi za zadani filter.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((order) => {
                          const c = extractCustomer(order);
                          const trust = getCustomerTrust(c.phone);
                          const TrustIcon = trust.icon;

                          return (
                            <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-4 font-mono">
                                <span className="font-bold text-slate-900 block">#{order.orderNumber || order.id?.slice(0, 7)}</span>
                                <span className="text-[10px] text-slate-400">
                                  {order.createdAt ? new Date(order.createdAt).toLocaleDateString('bs-BA') : 'Danas'}
                                </span>
                              </td>

                              <td className="py-3.5 px-4">
                                <span className="font-bold text-slate-900 block">{c.name}</span>
                                <span className="text-slate-500 text-[11px] block">{c.phone}</span>
                              </td>

                              <td className="py-3.5 px-4">
                                <span className="font-semibold text-slate-800 block">{c.city}</span>
                                <span className="text-slate-400 text-[10px] truncate max-w-[140px] block">{c.address}</span>
                              </td>

                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${trust.color}`}>
                                  <TrustIcon className="w-3 h-3" />
                                  {trust.label}
                                </span>
                              </td>

                              <td className="py-3.5 px-4">
                                <span className="text-slate-700">
                                  {order.items?.length || 0} art. ({order.items?.map((i) => `${i.quantity}x ${i.size || 'M'}`).join(', ')})
                                </span>
                              </td>

                              <td className="py-3.5 px-4 font-['Poppins'] font-black text-slate-900">
                                {(order.total || 0).toFixed(2)} KM
                              </td>

                              <td className="py-3.5 px-4">
                                <select
                                  value={normalizeStatus(order.status)}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'shipped') {
                                      setTrackingModalOrder(order);
                                      setTrackingNumberInput(order.trackingNumber || '');
                                    } else {
                                      handleStatusChange(order.id, val);
                                    }
                                  }}
                                  className="bg-slate-50 border border-slate-300 text-xs text-slate-900 rounded-lg px-2 py-1 focus:border-amber-400 focus:outline-none cursor-pointer"
                                >
                                  <option value="pending">Nova (Čeka)</option>
                                  <option value="confirmed">Potvrđena</option>
                                  <option value="shipped">Poslana (Kurir)</option>
                                  <option value="delivered">Dostavljena</option>
                                  <option value="cancelled">Otkazana / Vraćena</option>
                                </select>
                              </td>

                              <td className="py-3.5 px-4 text-right space-x-1.5">
                                <button
                                  onClick={() => generateShippingSlip(order)}
                                  className="p-1.5 bg-slate-100 hover:bg-[#F7E97F] text-slate-700 hover:text-slate-950 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                                  title="Štampaj A6 Adresnicu"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => setSelectedOrder(order)}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                                  title="Detalji narudžbe"
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

          {/* TAB 2: ARTIKLI & ZALIHE */}
          {activeTab === 'products' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-['Poppins'] font-black uppercase text-sm tracking-wide text-slate-900">
                    Katalog Proizvoda ({products.length})
                  </h3>
                  <p className="text-xs text-slate-400">Upravljajte artiklima, cijenama i veličinama na stanju.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => {
                  const sizeList: { size: string; stock: any }[] = [];
                  if (product.sizes) {
                    if (Array.isArray(product.sizes)) {
                      product.sizes.forEach((s: any) => {
                        sizeList.push({
                          size: typeof s === 'string' ? s : s.size,
                          stock: typeof s === 'object' ? s.stock : 'Dostupno'
                        });
                      });
                    } else if (typeof product.sizes === 'object') {
                      Object.entries(product.sizes).forEach(([sz, stk]) => {
                        sizeList.push({ size: sz, stock: stk });
                      });
                    }
                  }

                  return (
                    <div key={product.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between space-y-3 shadow-xs">
                      <div className="flex gap-3">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.name} className="w-16 h-16 object-cover rounded-lg bg-white border border-slate-200 shrink-0" />
                        ) : (
                          <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center shrink-0">
                            <Package className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-slate-900 truncate">{product.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-['Poppins'] font-black text-slate-900">{product.price} KM</span>
                            {product.oldPrice && (
                              <span className="text-[10px] text-slate-400 line-through">{product.oldPrice} KM</span>
                            )}
                          </div>
                          <span className="inline-block mt-1 px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-semibold text-slate-600 uppercase">
                            {product.category}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-slate-200 pt-2.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Zalihe po veličinama:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {sizeList.length > 0 ? (
                            sizeList.map((s) => (
                              <span key={s.size} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono font-semibold text-slate-700">
                                {s.size}: <strong className="text-amber-600">{s.stock}</strong>
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Univerzalno</span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1 border-t border-slate-200">
                        <button
                          onClick={() => {
                            setEditingProduct(product);
                            setProductModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Edit className="w-3 h-3" /> Uredi
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-600 border border-slate-200 rounded text-xs font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Obriši
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: NAPUŠTENE KORPE */}
          {activeTab === 'abandoned' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-['Poppins'] font-black uppercase text-sm tracking-wide text-slate-900">
                    Napuštene Korpe & Izgubljene Narudžbe
                  </h3>
                  <p className="text-xs text-slate-500">Kupci koji su započeli checkout, ali nisu potvrdili narudžbu.</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center space-y-2">
                <ShoppingCart className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm">Automatsko bilježenje sesija</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Podaci o napuštenim korpama automatski se sinkroniziraju sa Firestore kolekcijom <code className="text-amber-700 font-mono">abandoned_carts</code>. Ako kupac unese broj telefona prije napuštanja, ovdje će se pojaviti opcija za slanje SMS/WhatsApp podsjetnika.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: ANALITIKA & POSJETE */}
          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
                <h3 className="font-['Poppins'] font-bold text-sm uppercase tracking-wider text-slate-900">
                  Učinak Prodaje & Narudžbi
                </h3>
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-600">Ukupan broj narudžbi</span>
                    <span className="font-['Poppins'] font-bold text-slate-900">{orders.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-600">Prosječna vrijednost narudžbe (AOV)</span>
                    <span className="font-['Poppins'] font-bold text-slate-900">{stats.aov.toFixed(2)} KM</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-600">Stopa uspješne isporuke</span>
                    <span className="font-['Poppins'] font-bold text-emerald-600">
                      {orders.length > 0 ? ((stats.deliveredOrders / orders.length) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
                <h3 className="font-['Poppins'] font-bold text-sm uppercase tracking-wider text-slate-900">
                  Najčešći Gradovi Isporuke
                </h3>
                <div className="space-y-2 pt-2">
                  {['Sarajevo', 'Banja Luka', 'Tuzla', 'Zenica', 'Mostar'].map((city, idx) => (
                    <div key={city} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                      <span className="font-medium text-slate-700">{idx + 1}. {city}</span>
                      <span className="text-slate-400 font-mono">Aktivan region</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: NEWSLETTER PRETPLATNICI */}
          {activeTab === 'newsletter' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-['Poppins'] font-black uppercase text-sm tracking-wide text-slate-900">
                    Email Pretplatnici ({subscribers.length})
                  </h3>
                  <p className="text-xs text-slate-500">Kupci koji su se prijavili za popuste i obavijesti o dropovima.</p>
                </div>
              </div>

              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {subscribers.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 text-xs">Trenutno nema novih newsletter prijava u bazi.</p>
                ) : (
                  subscribers.map((sub, idx) => (
                    <div key={idx} className="py-3 flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-800">{sub.email}</span>
                      <span className="text-slate-400 font-mono text-[11px]">{sub.date || 'Aktivna prijava'}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 6: CMS & PODEŠAVANJA */}
          {activeTab === 'settings' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 max-w-2xl space-y-5">
              <div>
                <h3 className="font-['Poppins'] font-black text-sm uppercase tracking-wide text-slate-900">
                  CMS Konfiguracija Sajta
                </h3>
                <p className="text-xs text-slate-500">Mijenjajte obavijesti na vrhu sajta, drop tajmer i kontakt podatke u hodu.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Gornja obavijest (Top Bar Announcement):</label>
                  <input
                    type="text"
                    value={cmsSettings.topBarText}
                    onChange={(e) => setCmsSettings({ ...cmsSettings, topBarText: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-2 rounded-lg focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Prag za besplatnu dostavu (KM):</label>
                    <input
                      type="number"
                      value={cmsSettings.freeShippingThreshold}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, freeShippingThreshold: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-2 rounded-lg focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Kontakt telefon:</label>
                    <input
                      type="text"
                      value={cmsSettings.contactPhone}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, contactPhone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-2 rounded-lg focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Kontakt e-mail:</label>
                    <input
                      type="email"
                      value={cmsSettings.contactEmail}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, contactEmail: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-2 rounded-lg focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Instagram link:</label>
                    <input
                      type="text"
                      value={cmsSettings.instagramUrl}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, instagramUrl: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-2 rounded-lg focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSaveCmsSettings}
                    className="px-5 py-2.5 bg-[#F7E97F] hover:bg-amber-300 text-slate-950 font-['Poppins'] font-black text-xs uppercase rounded-lg flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    Spremi CMS Postavke
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* MODAL ZA DODAVANJE / UREĐIVANJE ARTIKLA */}
      {productModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-['Poppins'] font-black uppercase text-sm text-slate-900">
                {editingProduct.id ? 'Uredi Artikl' : 'Novi Artikl'}
              </h3>
              <button onClick={() => setProductModalOpen(false)} className="text-slate-400 hover:text-slate-900 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">Naziv artikla:</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-2 rounded-lg focus:border-amber-400 focus:outline-none"
                  placeholder="npr. Majica 'BEST DAYS ? AWAY DAYS'"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Cijena (KM):</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.price || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-2 rounded-lg focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Kategorija:</label>
                  <select
                    value={editingProduct.category || 'Majice'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-2 rounded-lg focus:border-amber-400 focus:outline-none"
                  >
                    <option value="Majice">Majice</option>
                    <option value="Dukserice">Dukserice</option>
                    <option value="Kape i dodaci">Kape i dodaci</option>
                    <option value="Jakne">Jakne</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">URL slike:</label>
                <input
                  type="text"
                  value={editingProduct.images?.[0] || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, images: [e.target.value] })}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-2 rounded-lg focus:border-amber-400 focus:outline-none"
                  placeholder="/hero-streetwear.webp ili https://..."
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold cursor-pointer"
                >
                  Odustani
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#F7E97F] hover:bg-amber-300 text-slate-950 font-['Poppins'] font-black text-xs uppercase rounded-lg shadow-sm cursor-pointer"
                >
                  Spremi Artikl
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ZA UNOS BROJA POŠILJKE */}
      {trackingModalOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="font-['Poppins'] font-black uppercase text-sm text-slate-900">
              Unos broja pošiljke (X Express)
            </h3>
            <p className="text-xs text-slate-500">
              Unesite broj pošiljke za narudžbu #{trackingModalOrder.orderNumber || trackingModalOrder.id?.slice(0, 7)} kako bi kupac mogao pratiti paket.
            </p>
            <input
              type="text"
              value={trackingNumberInput}
              onChange={(e) => setTrackingNumberInput(e.target.value)}
              placeholder="Npr. 1029384756..."
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-2 text-xs rounded-lg focus:border-amber-400 focus:outline-none"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setTrackingModalOrder(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Odustani
              </button>
              <button
                onClick={() => {
                  handleStatusChange(trackingModalOrder.id, 'shipped', trackingNumberInput.trim());
                  setTrackingModalOrder(null);
                }}
                className="px-4 py-2 bg-[#F7E97F] hover:bg-amber-300 text-slate-950 font-['Poppins'] font-black text-xs uppercase rounded-lg cursor-pointer"
              >
                Spremi & Pošalji
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ZA DETALJAN PREGLED NARUDŽBE */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-['Poppins'] font-black uppercase text-sm text-slate-900">
                Detalji Narudžbe #{selectedOrder.orderNumber || selectedOrder.id?.slice(0, 7)}
              </h3>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-slate-900 text-xs cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const c = extractCustomer(selectedOrder);
              return (
                <div className="space-y-3 text-xs text-slate-700">
                  <div className="p-3.5 bg-slate-50 rounded-xl space-y-1.5 border border-slate-200">
                    <p><strong>Ime kupca:</strong> {c.name}</p>
                    <p><strong>Telefon:</strong> {c.phone}</p>
                    <p><strong>Adresa dostave:</strong> {c.address}, {c.city}</p>
                    <p><strong>Napomena:</strong> {c.note}</p>
                  </div>

                  <div>
                    <strong className="block text-slate-900 mb-2">Naručeni artikli:</strong>
                    <div className="space-y-1.5">
                      {(selectedOrder.items || []).map((item, idx) => (
                        <div key={idx} className="flex justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                          <span>{item.quantity}x {item.name} ({item.size})</span>
                          <span className="font-bold text-slate-900">{item.price} KM</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-sm">
                    <span className="font-bold text-slate-900">UKUPAN IZNOS:</span>
                    <span className="font-['Poppins'] font-black text-slate-950 text-base">
                      {(selectedOrder.total || 0).toFixed(2)} KM
                    </span>
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <button
                onClick={() => generateShippingSlip(selectedOrder)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-[#F7E97F] text-slate-900 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Štampaj Adresnicu
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 text-xs font-semibold rounded-lg cursor-pointer"
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