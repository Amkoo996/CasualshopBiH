"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  ShoppingBag,
  Users,
  TrendingUp,
  Plus,
  Trash2,
  Edit,
  Download,
  Settings,
  LogOut,
  Lock,
  Search,
  X,
  Save,
  ArrowUp,
  ArrowDown,
  Eye,
  CheckCircle2,
  Mail,
  Palette,
  EyeOff,
  Boxes,
  FileSpreadsheet,
  Ticket,
  Power,
  Layout,
  Truck,
  Clock,
  Printer,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useAuth } from '../context/AuthContext';
import { Product, Order, NewsletterSubscriber, Size, OrderStatus, StoreSettings, CATEGORIES, DEFAULT_STORE_SETTINGS } from '../types';
import {
  getProducts,
  saveProduct,
  deleteProduct,
  getOrders,
  updateOrderStatus,
  getSubscribers,
  getStoreSettings,
  saveStoreSettings,
} from '../lib/db';
import { uploadImage } from '../lib/upload';
import { getProductViewStats } from '../lib/tracking';
import { getAllPromoCodes, createPromoCode, togglePromoCodeStatus, deletePromoCode, getPromoRemainingTime } from '../lib/promo';
import { useCart } from '../context/CartContext';
import { SalesTrendChart } from '../components/admin/SalesTrendChart';
import { FunnelAnalytics } from '../components/admin/FunnelAnalytics';
import { AbandonedCartsPromo } from '../components/admin/AbandonedCartsPromo';
import { TrafficAndCartStatsTable } from '../components/admin/TrafficAndCartStatsTable';
import { StockManagementTab } from '../components/admin/StockManagementTab';
import { HomeCMSEditor } from '../components/admin/HomeCMSEditor';
import DevSettings from '../components/admin/DevSettings';

// Čišćenje slova za termo printer
const cleanPdfText = (str: string = ''): string => {
  return str
    .replace(/[čČ]/g, (m) => (m === 'č' ? 'c' : 'C'))
    .replace(/[ćĆ]/g, (m) => (m === 'ć' ? 'c' : 'C'))
    .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'dj' : 'Dj'))
    .replace(/[šŠ]/g, (m) => (m === 'š' ? 's' : 'S'))
    .replace(/[žŽ]/g, (m) => (m === 'ž' ? 'z' : 'Z'));
};

// Sigurno izvlačenje imena i adrese kupca
const extractCustomer = (order: Order) => {
  const c = order.customer as any || {};
  let name = '';
  if (c.firstName || c.lastName) {
    name = `${c.firstName || ''} ${c.lastName || ''}`.trim();
  } else if (c.name || c.fullName || c.ime) {
    name = c.fullName || c.name || c.ime;
  } else if ((order as any).customerName) {
    name = (order as any).customerName;
  }

  const phone = c.phone || (order as any).phone || 'N/A';
  const city = c.city || (order as any).city || 'BiH';
  const address = c.address || (order as any).address || 'N/A';
  const postalCode = c.postalCode || (order as any).postalCode || '';
  const note = c.note || (order as any).note || 'Nema napomene';

  return {
    name: name || (phone !== 'N/A' ? `Kupac (${phone})` : 'Kupac'),
    phone,
    city,
    address,
    postalCode,
    note,
  };
};

export const AdminDashboard: React.FC = () => {
  const { user, isAdmin, loginWithEmail, signOut } = useAuth();
  const { refreshSettings } = useCart();

  const [activeTab, setActiveTab] = useState<'overview' | 'cms' | 'analytics' | 'leads' | 'products' | 'stock' | 'orders' | 'promo' | 'subscribers' | 'settings' | 'dev-settings'>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [productViewsMap, setProductViewsMap] = useState<Record<string, number>>({});
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Tracking modal
  const [trackingModalOrder, setTrackingModalOrder] = useState<Order | null>(null);
  const [trackingNumberInput, setTrackingNumberInput] = useState('');
  const [courierNameInput, setCourierNameInput] = useState('X Express');

  // Štampanje A6 adresnice
  const [printModalOrder, setPrintModalOrder] = useState<{
    order: Order;
    name: string;
    address: string;
    city: string;
  } | null>(null);

  // Promo kodovi
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoDiscount, setNewPromoDiscount] = useState(10);
  const [newPromoMaxUsage, setNewPromoMaxUsage] = useState(100);
  const [promoLoading, setPromoLoading] = useState(false);

  // Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Artikli
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // Filteri
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('Sve');
  const [orderSearch, setOrderSearch] = useState('');

  const availableSizesList: Size[] = ['S', 'M', 'L', 'XL', 'XXL', '3XL', 'One size'];

  const loadData = async (silent = false) => {
    if (!isAdmin) return;
    if (!silent) setLoading(true);

    try {
      const [prodsData, ordersData, subsData, settingsData, viewsData, promoData] = await Promise.all([
        getProducts(true),
        getOrders().catch(() => []),
        getSubscribers().catch(() => []),
        getStoreSettings().catch(() => DEFAULT_STORE_SETTINGS),
        getProductViewStats().catch(() => ({})),
        getAllPromoCodes().catch(() => []),
      ]);

      const uniqueSubscribersMap = new Map<string, NewsletterSubscriber>();
      subsData.forEach((sub) => {
        const cleanEmail = sub.email.trim().toLowerCase();
        if (!cleanEmail) return;
        if (!uniqueSubscribersMap.has(cleanEmail)) {
          uniqueSubscribersMap.set(cleanEmail, sub);
        }
      });

      setProducts(prodsData);
      setOrders(ordersData);
      setSubscribers(Array.from(uniqueSubscribersMap.values()));
      setStoreSettings(settingsData);
      setProductViewsMap(viewsData);
      setPromoCodes(promoData);
    } catch (e) {
      console.error('Greška pri učitavanju podataka:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
      const interval = setInterval(() => loadData(true), 15000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  // Pouzdanost kupca prema broju telefona
  const customerTrustMap = useMemo(() => {
    const map = new Map<string, { total: number; delivered: number; returned: number }>();
    orders.forEach((o) => {
      const phone = (o.customer?.phone || '').replace(/\D/g, '');
      if (!phone) return;
      const cur = map.get(phone) || { total: 0, delivered: 0, returned: 0 };
      cur.total += 1;
      if (o.status === 'Dostavljena') cur.delivered += 1;
      if (o.status === 'Otkazana') cur.returned += 1;
      map.set(phone, cur);
    });
    return map;
  }, [orders]);

  const getCustomerTrust = (phoneRaw?: string) => {
    const phone = (phoneRaw || '').replace(/\D/g, '');
    const data = customerTrustMap.get(phone);
    if (!data || data.total <= 1) {
      return { label: 'Novi kupac', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: ShieldCheck };
    }
    if (data.returned > 0) {
      return { label: 'Oprez (Ima povrat)', color: 'bg-red-100 text-red-800 border-red-300', icon: ShieldAlert };
    }
    if (data.delivered >= 1) {
      return { label: 'Provjeren kupac', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: ShieldCheck };
    }
    return { label: 'Više narudžbi', color: 'bg-amber-100 text-amber-900 border-amber-300', icon: ShieldCheck };
  };

  // Generisanje A6 termo PDF naljepnice
  const generateShippingSlip = (order: Order, customName?: string, customAddress?: string, customCity?: string) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [105, 148],
    });

    const c = extractCustomer(order);
    const buyerName = cleanPdfText((customName || c.name).toUpperCase());
    const buyerPhone = cleanPdfText(c.phone);
    const buyerAddress = cleanPdfText(customAddress || c.address);
    const buyerCity = cleanPdfText(customCity || `${c.postalCode} ${c.city}`.trim());
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
    doc.text(`NARUDZBA #${order.orderNumber.replace(/^#/, '')}`, 8, 17);

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
    doc.text(`${order.total.toFixed(2)} KM`, 12, 90);

    // Artikli
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('SADRZAJ POSILJKE:', 8, 100);

    let y = 106;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    order.items.forEach((item) => {
      doc.text(`• ${item.quantity}x ${cleanPdfText(item.name)} (${cleanPdfText(item.size || 'M')})`, 10, y);
      y += 5;
    });

    // Uputstvo za kurira
    doc.setFillColor(254, 240, 138);
    doc.rect(8, 126, 89, 13, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(113, 63, 18);
    doc.text('DOZVOLJENO OTVARANJE PAKETA PRIJE PREUZIMANJA', 11, 132);
    doc.text(`UGOVORENA BRZA POSTA: ${cleanPdfText(order.courierName || 'X EXPRESS')}`, 11, 136);

    doc.save(`Adresnica_${order.orderNumber.replace(/^#/, '')}.pdf`);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      await loginWithEmail(email, password, rememberMe);
    } catch (err: any) {
      setLoginError(err.message || 'Pogrešan email ili lozinka.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoCode.trim()) return;
    setPromoLoading(true);
    try {
      await createPromoCode(newPromoCode.trim().toUpperCase(), 'manual', 720, newPromoDiscount, newPromoMaxUsage);
      setNewPromoCode('');
      await loadData();
    } catch {
      alert('Greška pri kreiranju promo koda.');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleTogglePromo = async (code: string, activeState: boolean) => {
    try {
      await togglePromoCodeStatus(code, activeState);
      await loadData();
    } catch {
      alert('Greška pri promjeni statusa.');
    }
  };

  const handleDeletePromo = async (code: string) => {
    if (confirm(`Obrisati promo kod "${code}"?`)) {
      try {
        await deletePromoCode(code);
        await loadData();
      } catch {
        alert('Greška pri brisanju promo koda.');
      }
    }
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of files) {
        urls.push(await uploadImage(f));
      }
      setEditingProduct((prev: any) => ({
        ...prev,
        images: [...(prev?.images || []), ...urls],
      }));
    } catch (err: any) {
      alert(err?.message || 'Upload slike nije uspio.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSaveProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name || !editingProduct.price) return;

    try {
      const productPayload: Omit<Product, 'id'> & { id?: string } = {
        id: editingProduct.id,
        name: editingProduct.name,
        price: Number(editingProduct.price),
        originalPrice: editingProduct.originalPrice ? Number(editingProduct.originalPrice) : undefined,
        category: (editingProduct.category as any) || 'Majice',
        color: editingProduct.color || 'Crna',
        material: editingProduct.material || '100% češljani pamuk 240 GSM',
        description: editingProduct.description || '',
        careInstructions: editingProduct.careInstructions || 'Prati na 30°C izvrnuto',
        details: editingProduct.details || [
          'Visokokvalitetni pamuk',
          'Streetwear casual kroj',
          'Plaćanje pouzećem ili lično preuzimanje',
        ],
        images: editingProduct.images && editingProduct.images.length > 0 ? editingProduct.images : ['/hero-streetwear.webp'],
        sizes: editingProduct.sizes || { S: 5, M: 8, L: 6, XL: 3, XXL: 0, '3XL': 0 },
        isNew: Boolean(editingProduct.isNew),
        featured: Boolean(editingProduct.featured),
        isHidden: Boolean(editingProduct.isHidden),
        createdAt: editingProduct.createdAt || new Date().toISOString(),
      };

      await saveProduct(productPayload);
      setIsModalOpen(false);
      setEditingProduct(null);
      await loadData();
    } catch {
      alert('Greška pri spremanju proizvoda.');
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (confirm(`Jeste li sigurni da želite obrisati proizvod "${name}"?`)) {
      try {
        await deleteProduct(id);
        await loadData();
      } catch {
        alert('Greška pri brisanju artikla.');
      }
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveStoreSettings(storeSettings);
      await refreshSettings();
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
    } catch {
      alert('Greška pri spremanju postavki.');
    }
  };

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    const targetOrder = orders.find((o) => o.id === orderId);

    if (status === 'Poslana' && targetOrder) {
      setTrackingModalOrder(targetOrder);
      setTrackingNumberInput(targetOrder.trackingNumber || '');
      setCourierNameInput(targetOrder.courierName || 'X Express');
      return;
    }

    try {
      await updateOrderStatus(orderId, status);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    } catch {
      alert('Greška pri ažuriranju statusa.');
    }
  };

  const handleConfirmTrackingAndSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingModalOrder?.id) return;

    try {
      await updateOrderStatus(trackingModalOrder.id, 'Poslana', {
        trackingNumber: trackingNumberInput,
        courierName: courierNameInput,
      });

      setOrders((prev) =>
        prev.map((o) =>
          o.id === trackingModalOrder.id
            ? { ...o, status: 'Poslana', trackingNumber: trackingNumberInput, courierName: courierNameInput }
            : o
        )
      );

      setTrackingModalOrder(null);
      setTrackingNumberInput('');
    } catch {
      alert('Greška pri spremanju koda za praćenje.');
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12 font-['Inter']">
        <div className="max-w-md w-full bg-white border-2 border-[#F7E97F] p-8 shadow-2xl space-y-6 text-center">
          <div className="w-14 h-14 bg-[#0A0A0A] text-[#F7E97F] border-2 border-[#F7E97F] flex items-center justify-center mx-auto rounded-full">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="font-['Poppins'] text-xl font-black uppercase tracking-wider text-black">
              ADMIN PRIJAVA
            </h2>
            <p className="text-xs text-neutral-600 mt-1">
              Casual Shop BiH kontrolna tabla.
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs text-left rounded font-medium">
              {loginError}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-[11px] font-['Poppins'] font-bold uppercase text-neutral-700 mb-1">
                E-mail adresa *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs focus:border-black focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-['Poppins'] font-bold uppercase text-neutral-700 mb-1">
                Lozinka *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs focus:border-black focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-wider transition-colors border-2 border-[#0A0A0A] cursor-pointer"
            >
              {loginLoading ? 'Prijavljivanje...' : 'Prijavi se'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const totalRevenue = orders.reduce((sum, ord) => sum + (ord.status !== 'Otkazana' ? ord.total : 0), 0);
  const newOrdersCount = orders.filter((o) => o.status === 'Nova').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 font-['Inter']">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b-2 border-neutral-300 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-['Poppins'] font-black uppercase tracking-[0.25em] bg-[#0A0A0A] text-[#F7E97F] border border-[#F7E97F] px-2 py-0.5">
              ADMIN CONTROL
            </span>
          </div>
          <h1 className="font-['Poppins'] text-2xl sm:text-3xl font-black uppercase tracking-tight text-neutral-900 mt-1">
            CASUAL SHOP BIH • KONTROLNA TABLA
          </h1>
          <p className="text-xs text-neutral-600">
            Prijavljeni admin: {user?.email}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="px-3.5 py-2 bg-white border-2 border-neutral-300 text-xs font-['Poppins'] font-bold uppercase tracking-wider hover:bg-neutral-100 text-neutral-800 cursor-pointer"
          >
            Osvježi
          </button>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-['Poppins'] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Odjavi se</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-neutral-300 gap-2 sm:gap-6 overflow-x-auto">
        {[
          { id: 'overview', label: 'Pregled & Prodaja', icon: TrendingUp },
          { id: 'cms', label: 'CMS (Početna)', icon: Layout },
          { id: 'analytics', label: 'Posjete & Funnel', icon: Eye },
          { id: 'leads', label: 'Napuštene korpe', icon: Mail },
          { id: 'products', label: `Proizvodi (${products.length})`, icon: Package },
          { id: 'stock', label: 'Inventar', icon: Boxes },
          { id: 'orders', label: `Narudžbe (${orders.length})`, icon: ShoppingBag },
          { id: 'promo', label: `Promo Kodovi (${promoCodes.length})`, icon: Ticket },
          { id: 'subscribers', label: `Newsletter (${subscribers.length})`, icon: Users },
          { id: 'settings', label: 'Postavke Trgovine', icon: Settings },
          { id: 'dev-settings', label: 'Dev Settings', icon: Palette },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 font-['Poppins'] font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-[#0A0A0A] text-[#0A0A0A]'
                  : 'border-transparent text-neutral-500 hover:text-black'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fadeIn">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white p-5 border-2 border-neutral-200 shadow-sm space-y-1">
              <span className="text-[10px] font-['Poppins'] font-bold uppercase tracking-wider text-neutral-400">
                UKUPAN PRIHOD
              </span>
              <div className="font-['Poppins'] text-2xl sm:text-3xl font-black text-black">
                {totalRevenue.toFixed(2)} KM
              </div>
            </div>

            <div className="bg-white p-5 border-2 border-neutral-200 shadow-sm space-y-1">
              <span className="text-[10px] font-['Poppins'] font-bold uppercase tracking-wider text-neutral-400">
                BROJ NARUDŽBI
              </span>
              <div className="font-['Poppins'] text-2xl sm:text-3xl font-black text-black">
                {orders.length}
              </div>
              <span className="text-[11px] text-amber-700 font-medium block">
                {newOrdersCount} novih narudžbi
              </span>
            </div>

            <div className="bg-white p-5 border-2 border-neutral-200 shadow-sm space-y-1">
              <span className="text-[10px] font-['Poppins'] font-bold uppercase tracking-wider text-neutral-400">
                UKUPNO ARTIKALA
              </span>
              <div className="font-['Poppins'] text-2xl sm:text-3xl font-black text-black">
                {products.length}
              </div>
            </div>

            <div className="bg-white p-5 border-2 border-neutral-200 shadow-sm space-y-1">
              <span className="text-[10px] font-['Poppins'] font-bold uppercase tracking-wider text-neutral-400">
                NEWSLETTER
              </span>
              <div className="font-['Poppins'] text-2xl sm:text-3xl font-black text-black">
                {subscribers.length}
              </div>
            </div>
          </div>

          <SalesTrendChart orders={orders} />
          <TrafficAndCartStatsTable orders={orders} />
        </div>
      )}

      {/* CMS TAB */}
      {activeTab === 'cms' && (
        <div className="animate-fadeIn">
          <HomeCMSEditor />
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <div className="animate-fadeIn">
          <FunnelAnalytics ordersCount={orders.length} />
        </div>
      )}

      {/* LEADS TAB */}
      {activeTab === 'leads' && (
        <div className="animate-fadeIn">
          <AbandonedCartsPromo />
        </div>
      )}

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex justify-between items-center">
            <h2 className="font-['Poppins'] text-base font-black uppercase text-black">
              Proizvodi ({products.length})
            </h2>
            <button
              onClick={() => {
                setEditingProduct({
                  name: '',
                  price: 35,
                  category: 'Majice',
                  color: 'Crna',
                  material: '100% češljani pamuk 240 GSM',
                  description: '',
                  images: ['/hero-streetwear.webp'],
                  sizes: { S: 5, M: 8, L: 6, XL: 3, XXL: 0, '3XL': 0 },
                  isNew: true,
                  featured: false,
                  isHidden: false,
                });
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] text-xs font-['Poppins'] font-bold uppercase flex items-center gap-2 border-2 border-[#0A0A0A] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novi Artikal</span>
            </button>
          </div>

          <div className="bg-white border-2 border-neutral-200 overflow-x-auto shadow-sm">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#0A0A0A] text-white font-['Poppins'] font-bold uppercase">
                <tr>
                  <th className="p-3">Artikal</th>
                  <th className="p-3">Kategorija</th>
                  <th className="p-3">Pregledi 👁️</th>
                  <th className="p-3">Cijena</th>
                  <th className="p-3">Zalihe</th>
                  <th className="p-3 text-right">Akcije</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50">
                    <td className="p-3 flex items-center gap-3">
                      <img src={p.images[0]} alt={p.name} className="w-10 h-12 object-cover border" />
                      <div>
                        <span className="font-bold text-neutral-900 block">{p.name}</span>
                        <span className="text-[10px] text-neutral-500 font-mono">ID: {p.id}</span>
                      </div>
                    </td>
                    <td className="p-3 font-semibold">{p.category}</td>
                    <td className="p-3 font-bold">{productViewsMap[p.id] || 0}</td>
                    <td className="p-3 font-bold">{p.price.toFixed(2)} KM</td>
                    <td className="p-3 font-mono text-[10px]">
                      {Object.entries(p.sizes || {}).map(([sz, stk]) => `${sz}:${stk}`).join(' ')}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingProduct(p);
                          setIsModalOpen(true);
                        }}
                        className="p-1 hover:bg-neutral-200 text-neutral-700 cursor-pointer"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id, p.name)}
                        className="p-1 hover:bg-red-100 text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STOCK TAB */}
      {activeTab === 'stock' && (
        <div className="animate-fadeIn">
          <StockManagementTab products={products} onRefreshData={loadData} />
        </div>
      )}

      {/* ORDERS TAB SA A6 ADRESNICOM I POUZDANOSTI KUPCA */}
      {activeTab === 'orders' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 border-2 border-neutral-200">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-['Poppins'] font-bold uppercase text-neutral-500 mr-1">Status:</span>
              {['Sve', 'Nova', 'Potvrđena', 'Poslana', 'Dostavljena', 'Otkazana'].map((status) => (
                <button
                  key={status}
                  onClick={() => setOrderStatusFilter(status)}
                  className={`px-3 py-1 text-xs font-['Poppins'] font-bold uppercase transition-colors border cursor-pointer ${
                    orderStatusFilter === status
                      ? 'bg-[#0A0A0A] text-[#F7E97F] border-[#0A0A0A]'
                      : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Pretraži narudžbe..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full bg-[#F4F2EC] border border-neutral-300 px-3 py-1.5 text-xs focus:bg-white focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-2.5" />
            </div>
          </div>

          <div className="space-y-4">
            {orders
              .filter((o) => {
                if (orderStatusFilter !== 'Sve' && o.status !== orderStatusFilter) return false;
                if (orderSearch.trim()) {
                  const s = orderSearch.toLowerCase();
                  const c = extractCustomer(o);
                  return (
                    o.orderNumber.toLowerCase().includes(s) ||
                    c.name.toLowerCase().includes(s) ||
                    c.city.toLowerCase().includes(s) ||
                    c.phone.toLowerCase().includes(s)
                  );
                }
                return true;
              })
              .map((order) => {
                const c = extractCustomer(order);
                const trust = getCustomerTrust(c.phone);
                const TrustIcon = trust.icon;

                return (
                  <div key={order.orderNumber} className="bg-white border-2 border-neutral-200 p-5 space-y-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-3 gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-['Poppins'] font-black text-sm text-black">
                          #{order.orderNumber.replace(/^#/, '')}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {new Date(order.createdAt).toLocaleString('bs-BA')}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold ${trust.color}`}>
                          <TrustIcon className="w-3 h-3" />
                          <span>{trust.label}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Dugme za pripremu i štampu A6 adresnice */}
                        <button
                          onClick={() => setPrintModalOrder({
                            order,
                            name: c.name,
                            address: c.address,
                            city: `${c.postalCode} ${c.city}`.trim()
                          })}
                          className="px-3 py-1 bg-[#F7E97F] hover:bg-yellow-300 text-black border border-neutral-800 text-xs font-['Poppins'] font-bold uppercase rounded flex items-center gap-1.5 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Adresnica</span>
                        </button>

                        <select
                          value={order.status}
                          onChange={(e) => handleUpdateStatus(order.id || '', e.target.value as OrderStatus)}
                          className="text-xs font-['Poppins'] font-bold uppercase px-3 py-1 border-2 focus:outline-none cursor-pointer bg-white"
                        >
                          <option value="Nova">Nova</option>
                          <option value="Potvrđena">Potvrđena</option>
                          <option value="Poslana">Poslana</option>
                          <option value="Dostavljena">Dostavljena</option>
                          <option value="Otkazana">Otkazana</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1.5 bg-[#F4F2EC] p-3.5 border border-neutral-300">
                        <span className="font-['Poppins'] font-bold uppercase text-neutral-700 block">
                          Podaci o kupcu:
                        </span>
                        <p className="font-bold text-neutral-900 text-sm">
                          {c.name}
                        </p>
                        <p className="text-neutral-800">
                          📞 Mobitel: <strong>{c.phone}</strong>
                        </p>
                        <p className="text-neutral-800">
                          📍 Adresa: {c.address}, {c.city}
                        </p>
                        {order.trackingNumber && (
                          <div className="pt-2 border-t border-neutral-300 text-purple-900 font-semibold flex items-center gap-1.5">
                            <Truck className="w-4 h-4 text-purple-700 shrink-0" />
                            <span>
                              {order.courierName || 'X Express'}: <strong className="font-mono">{order.trackingNumber}</strong>
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 bg-[#F4F2EC] p-3.5 border border-neutral-300">
                        <span className="font-['Poppins'] font-bold uppercase text-neutral-700 block">
                          Naručeni artikli:
                        </span>
                        <div className="space-y-1">
                          {order.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[11px]">
                              <span>
                                {it.quantity}x <strong>{it.name}</strong> ({it.size})
                              </span>
                              <span className="font-['Poppins'] font-bold">{(it.price * it.quantity).toFixed(2)} KM</span>
                            </div>
                          ))}
                        </div>
                        <div className="pt-2 border-t border-neutral-300 flex justify-between font-bold text-xs font-['Poppins']">
                          <span>Ukupno za naplatu pouzećem:</span>
                          <span className="font-black text-black text-sm">{order.total.toFixed(2)} KM</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* PROMO KODOVI TAB */}
      {activeTab === 'promo' && (
        <div className="space-y-6 animate-fadeIn max-w-5xl">
          <form onSubmit={handleCreatePromo} className="bg-white p-6 border-2 border-neutral-300 space-y-4 shadow-sm">
            <h3 className="font-['Poppins'] text-xs font-black uppercase text-black">
              Kreiraj novi promo kod
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                placeholder="NAZIV KODA (npr. FIRST100)"
                value={newPromoCode}
                onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs font-mono font-bold uppercase"
              />
              <input
                type="number"
                required
                min="1"
                max="100"
                value={newPromoDiscount}
                onChange={(e) => setNewPromoDiscount(Number(e.target.value))}
                className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs font-mono font-bold"
                placeholder="Popust %"
              />
              <input
                type="number"
                required
                min="1"
                value={newPromoMaxUsage}
                onChange={(e) => setNewPromoMaxUsage(Number(e.target.value))}
                className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs font-mono font-bold"
                placeholder="Maksimalno korištenja"
              />
            </div>
            <button
              type="submit"
              disabled={promoLoading}
              className="px-6 py-2.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase cursor-pointer"
            >
              {promoLoading ? 'Kreiranje...' : 'Generiši Promo Kod'}
            </button>
          </form>

          <div className="bg-white border-2 border-neutral-200 overflow-x-auto shadow-sm">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#0A0A0A] text-white font-['Poppins'] font-bold uppercase">
                <tr>
                  <th className="p-3">Kod</th>
                  <th className="p-3">Popust</th>
                  <th className="p-3">Korištenje</th>
                  <th className="p-3">Preostalo vrijeme</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Akcije</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {promoCodes.map((codeItem, idx) => {
                  const timer = codeItem.expiresAt ? getPromoRemainingTime(codeItem.expiresAt) : null;
                  return (
                    <tr key={idx} className="hover:bg-neutral-50">
                      <td className="p-3 font-mono font-bold">{codeItem.code}</td>
                      <td className="p-3 font-bold text-amber-700">-{codeItem.discountPercent || 10}%</td>
                      <td className="p-3">{codeItem.usageCount || 0} / {codeItem.maxUsage || 100}</td>
                      <td className="p-3">{timer ? timer.formatted : 'Bez limita'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                          {codeItem.active === false ? 'Ugašen' : 'Aktivan'}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => handleTogglePromo(codeItem.code, codeItem.active ?? true)}
                          className="px-2 py-1 text-[10px] font-bold uppercase border cursor-pointer"
                        >
                          <Power className="w-3 h-3 inline mr-1" />
                          <span>{codeItem.active === false ? 'Aktiviraj' : 'Ugasi'}</span>
                        </button>
                        <button
                          onClick={() => handleDeletePromo(codeItem.code)}
                          className="p-1 text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBSCRIBERS TAB */}
      {activeTab === 'subscribers' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white border-2 border-neutral-200 overflow-hidden shadow-sm">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#0A0A0A] text-white font-['Poppins'] font-bold uppercase">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">E-mail adresa</th>
                  <th className="p-3">Datum prijave</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {subscribers.map((sub, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50">
                    <td className="p-3 font-mono text-neutral-400">{idx + 1}</td>
                    <td className="p-3 font-semibold">{sub.email}</td>
                    <td className="p-3 text-neutral-600">{new Date(sub.subscribedAt).toLocaleString('bs-BA')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="space-y-6 animate-fadeIn max-w-4xl">
          {settingsSaved && (
            <div className="bg-white border-2 border-[#F7E97F] p-4 flex items-center gap-2 text-xs font-bold text-black">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Postavke su spremljene!</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="bg-white p-6 sm:p-8 border-2 border-neutral-300 space-y-6 shadow-sm">
            <div className="space-y-4 border-b pb-6 border-neutral-200">
              <h3 className="font-['Poppins'] text-xs font-black uppercase text-black flex items-center gap-2">
                <EyeOff className="w-4 h-4" />
                <span>Sakrivene kategorije</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F4F2EC] p-4 border border-neutral-300">
                {CATEGORIES.filter((c) => c !== 'Rasprodano').map((cat) => {
                  const isHidden = (storeSettings.hiddenCategories || []).includes(cat);
                  return (
                    <label key={cat} className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                      <input
                        type="checkbox"
                        checked={isHidden}
                        onChange={(e) => {
                          const current = storeSettings.hiddenCategories || [];
                          const updated = e.target.checked ? [...current, cat] : current.filter((c) => c !== cat);
                          setStoreSettings({ ...storeSettings, hiddenCategories: updated });
                        }}
                        className="accent-black h-4 w-4"
                      />
                      <span className={isHidden ? 'text-red-600 line-through' : 'text-black'}>{cat}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">Cijena dostave (KM)</label>
                <input
                  type="number"
                  step="0.5"
                  value={storeSettings.shippingFee}
                  onChange={(e) => setStoreSettings({ ...storeSettings, shippingFee: Number(e.target.value) })}
                  className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">Prag za besplatnu dostavu (KM)</label>
                <input
                  type="number"
                  step="1"
                  value={storeSettings.freeShippingThreshold}
                  onChange={(e) => setStoreSettings({ ...storeSettings, freeShippingThreshold: Number(e.target.value) })}
                  className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-3 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase cursor-pointer"
            >
              Spremi postavke
            </button>
          </form>
        </div>
      )}

      {/* DEV SETTINGS TAB */}
      {activeTab === 'dev-settings' && (
        <div className="animate-fadeIn">
          <DevSettings />
        </div>
      )}

      {/* MODAL ZA PRIJE-ŠTAMPNU PROVJERU ADRESNICE */}
      {printModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-6 border-2 border-[#F7E97F] shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
              <h3 className="font-['Poppins'] text-xs font-black uppercase text-black">
                Priprema A6 Adresnice (#{printModalOrder.order.orderNumber.replace(/^#/, '')})
              </h3>
              <button onClick={() => setPrintModalOrder(null)} className="p-1 text-neutral-400 hover:text-black cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">Ime i prezime na paketu:</label>
                <input
                  type="text"
                  value={printModalOrder.name}
                  onChange={(e) => setPrintModalOrder({ ...printModalOrder, name: e.target.value })}
                  className="w-full bg-[#F4F2EC] border border-neutral-300 p-2 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Adresa kupca:</label>
                <input
                  type="text"
                  value={printModalOrder.address}
                  onChange={(e) => setPrintModalOrder({ ...printModalOrder, address: e.target.value })}
                  className="w-full bg-[#F4F2EC] border border-neutral-300 p-2"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Grad i poštanski broj:</label>
                <input
                  type="text"
                  value={printModalOrder.city}
                  onChange={(e) => setPrintModalOrder({ ...printModalOrder, city: e.target.value })}
                  className="w-full bg-[#F4F2EC] border border-neutral-300 p-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
              <button
                onClick={() => setPrintModalOrder(null)}
                className="px-3.5 py-1.5 border border-neutral-300 text-xs font-bold uppercase cursor-pointer"
              >
                Odustani
              </button>
              <button
                onClick={() => {
                  generateShippingSlip(
                    printModalOrder.order,
                    printModalOrder.name,
                    printModalOrder.address,
                    printModalOrder.city
                  );
                  setPrintModalOrder(null);
                }}
                className="px-4 py-1.5 bg-[#0A0A0A] text-[#F7E97F] hover:bg-neutral-800 text-xs font-['Poppins'] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Preuzmi PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRACKING MODAL */}
      {trackingModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-6 border-2 border-[#F7E97F] shadow-2xl space-y-4">
            <h3 className="font-['Poppins'] text-xs font-black uppercase text-black">
              Unos broja pošiljke (#{trackingModalOrder.orderNumber.replace(/^#/, '')})
            </h3>
            <form onSubmit={handleConfirmTrackingAndSend} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase mb-1">Kurirska Služba:</label>
                <select
                  value={courierNameInput}
                  onChange={(e) => setCourierNameInput(e.target.value)}
                  className="w-full bg-[#F4F2EC] border border-neutral-300 p-2"
                >
                  <option value="X Express">X Express Brza Pošta</option>
                  <option value="EuroExpress">EuroExpress</option>
                  <option value="BH Pošta">BH Pošta</option>
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase mb-1">Tracking broj:</label>
                <input
                  type="text"
                  value={trackingNumberInput}
                  onChange={(e) => setTrackingNumberInput(e.target.value.toUpperCase())}
                  placeholder="npr. XE-123456"
                  className="w-full bg-[#F4F2EC] border border-neutral-300 p-2 font-mono font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setTrackingModalOrder(null)}
                  className="px-3.5 py-1.5 border border-neutral-300 text-xs font-bold uppercase cursor-pointer"
                >
                  Odustani
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] text-xs font-bold uppercase cursor-pointer"
                >
                  Potvrdi slanje
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRODUCT MODAL */}
      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white max-w-2xl w-full p-6 sm:p-8 space-y-6 border-2 border-[#F7E97F] shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b-2 border-neutral-200 pb-4">
              <h3 className="font-['Poppins'] text-base font-black uppercase text-black">
                {editingProduct.id ? 'Uredi artikal' : 'Novi artikal'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProductSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-neutral-800 mb-1">Naziv artikla *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full border-2 border-neutral-300 p-2.5 text-xs focus:border-black focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase text-neutral-800 mb-1">Cijena (KM) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={editingProduct.price || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="w-full border-2 border-neutral-300 p-2.5 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-neutral-800 mb-1">Kategorija</label>
                  <select
                    value={editingProduct.category || 'Majice'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value as any })}
                    className="w-full border-2 border-neutral-300 p-2.5 text-xs font-bold"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-neutral-800 mb-1">Slike (Upload sa uređaja):</label>
                <label className="inline-block px-4 py-2 bg-[#F7E97F] text-[#0A0A0A] font-bold text-xs uppercase cursor-pointer border border-[#0A0A0A]">
                  {uploading ? 'Upload u toku...' : 'Izaberi sa telefona / računara'}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} disabled={uploading} />
                </label>
              </div>

              <div className="pt-4 border-t flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border-2 border-neutral-300 font-bold uppercase cursor-pointer"
                >
                  Odustani
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-bold uppercase cursor-pointer"
                >
                  Spremi artikal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};