"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Package, ShoppingBag, Users, TrendingUp, Plus, Trash2, Edit,
  Settings, LogOut, Lock, Search, X, Save, Eye, CheckCircle2,
  Mail, Palette, EyeOff, Boxes, Ticket, Power, Layout, Truck,
  Printer, ShieldCheck, ShieldAlert, Image as ImageIcon, Tag, Info, Menu,
  ArrowLeft, Zap
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useAuth } from '../context/AuthContext';
import { Product, Order, NewsletterSubscriber, Size, OrderStatus, StoreSettings, CATEGORIES, DEFAULT_STORE_SETTINGS } from '../types';
import {
  getProducts, saveProduct, deleteProduct, getOrders, updateOrderStatus,
  getSubscribers, getStoreSettings, saveStoreSettings,
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

// Pomoćna funkcija za automatsko ubacivanje Cloudinary transformacija za smanjenje težine slika
const optimizeCloudinaryUrl = (url: string): string => {
  if (!url || typeof url !== 'string') return url;
  if (url.includes('cloudinary.com') && url.includes('/upload/')) {
    if (
      !url.includes('/upload/f_') &&
      !url.includes('/upload/q_') &&
      !url.includes('/upload/w_') &&
      !url.includes('/upload/c_')
    ) {
      return url.replace('/upload/', '/upload/f_auto,q_auto,w_800,c_limit/');
    }
  }
  return url;
};

const cleanPdfText = (str: string = ''): string => {
  return str
    .replace(/[čČ]/g, (m) => (m === 'č' ? 'c' : 'C'))
    .replace(/[ćĆ]/g, (m) => (m === 'ć' ? 'c' : 'C'))
    .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'dj' : 'Dj'))
    .replace(/[šŠ]/g, (m) => (m === 'š' ? 's' : 'S'))
    .replace(/[žŽ]/g, (m) => (m === 'ž' ? 'z' : 'Z'));
};

const extractCustomer = (order: Order) => {
  const c = (order.customer as any) || {};
  let name = '';
  if (c.firstName || c.lastName) {
    name = `${c.firstName || ''} ${c.lastName || ''}`.trim();
  } else if (c.name || c.fullName || c.ime) {
    name = c.fullName || c.name || c.ime;
  } else if ((order as any).customerName) {
    name = (order as any).customerName;
  }

  return {
    name: name || (c.phone ? `Kupac (${c.phone})` : 'Kupac'),
    phone: c.phone || (order as any).phone || 'N/A',
    city: c.city || (order as any).city || 'BiH',
    address: c.address || (order as any).address || 'N/A',
    postalCode: c.postalCode || (order as any).postalCode || '',
    note: c.note || (order as any).note || 'Nema napomene',
  };
};

export const AdminDashboard: React.FC = () => {
  const { user, isAdmin, loginWithEmail, signOut } = useAuth();
  const { refreshSettings } = useCart();

  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [productViewsMap, setProductViewsMap] = useState<Record<string, number>>({});
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const [trackingModalOrder, setTrackingModalOrder] = useState<Order | null>(null);
  const [trackingNumberInput, setTrackingNumberInput] = useState('');
  const [courierNameInput, setCourierNameInput] = useState('X Express');

  const [printModalOrder, setPrintModalOrder] = useState<any | null>(null);

  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoDiscount, setNewPromoDiscount] = useState(10);
  const [newPromoMaxUsage, setNewPromoMaxUsage] = useState(100);
  const [promoLoading, setPromoLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [optimizingImages, setOptimizingImages] = useState(false);

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
        if (!uniqueSubscribersMap.has(cleanEmail)) uniqueSubscribersMap.set(cleanEmail, sub);
      });

      setProducts(prodsData);
      setOrders(ordersData);
      setSubscribers(Array.from(uniqueSubscribersMap.values()));
      setStoreSettings(settingsData);
      setProductViewsMap(viewsData);
      setPromoCodes(promoData);
    } catch (e) {
      console.error('Greška:', e);
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
    if (!data || data.total <= 1) return { label: 'Novi kupac', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: ShieldCheck };
    if (data.returned > 0) return { label: 'Oprez (Ima povrat)', color: 'bg-red-100 text-red-800 border-red-300', icon: ShieldAlert };
    if (data.delivered >= 1) return { label: 'Provjeren kupac', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: ShieldCheck };
    return { label: 'Više narudžbi', color: 'bg-amber-100 text-amber-900 border-amber-300', icon: ShieldCheck };
  };

  const generateShippingSlip = (order: Order, customName?: string, customAddress?: string, customCity?: string) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [105, 148] });
    const c = extractCustomer(order);
    const buyerName = cleanPdfText((customName || c.name).toUpperCase());
    const buyerPhone = cleanPdfText(c.phone);
    const buyerAddress = cleanPdfText(customAddress || c.address);
    const buyerCity = cleanPdfText(customCity || `${c.postalCode} ${c.city}`.trim());
    const buyerNote = cleanPdfText(c.note);

    doc.setDrawColor(30, 41, 59); doc.setLineWidth(0.4); doc.rect(4, 4, 97, 140);
    doc.setFillColor(15, 23, 42); doc.rect(4, 4, 97, 16, 'F');
    doc.setTextColor(247, 233, 127); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('CASUAL SHOP BiH', 8, 12);
    doc.setFontSize(8); doc.setTextColor(226, 232, 240); doc.text(`NARUDZBA #${order.orderNumber.replace(/^#/, '')}`, 8, 17);
    
    doc.setTextColor(100, 116, 139); doc.setFontSize(7); doc.text('POSILJALAC:', 8, 25);
    doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text('Casual Shop BiH (Sarajevo)', 8, 29);
    doc.setFont('helvetica', 'normal'); doc.text('Tel: +387 61 000 000 | info@casualshop.ba', 8, 33);
    doc.line(8, 36, 97, 36);

    doc.setTextColor(100, 116, 139); doc.setFontSize(7); doc.text('PRIMALAC (KUPAC):', 8, 42);
    doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(buyerName, 8, 48);
    doc.setFontSize(9); doc.text(`Adresa: ${buyerAddress}`, 8, 54); doc.text(`Grad: ${buyerCity}`, 8, 59); doc.text(`Telefon: ${buyerPhone}`, 8, 64);
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.text(`Napomena: ${buyerNote}`, 8, 70);

    doc.setFillColor(248, 250, 252); doc.rect(8, 75, 89, 18, 'F'); doc.setDrawColor(15, 23, 42); doc.rect(8, 75, 89, 18);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42); doc.text('OTKUPNINA (PLACANJE POUZECEM):', 12, 82);
    doc.setFontSize(14); doc.text(`${order.total.toFixed(2)} KM`, 12, 90);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.text('SADRZAJ POSILJKE:', 8, 100);
    let y = 106; doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(15, 23, 42);
    order.items.forEach((item) => { doc.text(`• ${item.quantity}x ${cleanPdfText(item.name)} (${cleanPdfText(item.size || 'M')})`, 10, y); y += 5; });

    doc.setFillColor(254, 240, 138); doc.rect(8, 126, 89, 13, 'F'); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(113, 63, 18);
    doc.text('DOZVOLJENO OTVARANJE PAKETA PRIJE PREUZIMANJA', 11, 132); doc.text(`UGOVORENA BRZA POSTA: ${cleanPdfText(order.courierName || 'X EXPRESS')}`, 11, 136);

    doc.save(`Adresnica_${order.orderNumber.replace(/^#/, '')}.pdf`);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try { await loginWithEmail(email, password, true); } 
    catch (err: any) { setLoginError('Pogrešan email ili lozinka.'); } 
    finally { setLoginLoading(false); }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoCode.trim()) return;
    setPromoLoading(true);
    try {
      await createPromoCode(newPromoCode.trim().toUpperCase(), 'manual', 720, newPromoDiscount, newPromoMaxUsage);
      setNewPromoCode(''); await loadData();
    } catch { alert('Greška pri kreiranju promo koda.'); } finally { setPromoLoading(false); }
  };

  const handleTogglePromo = async (code: string, activeState: boolean) => {
    try { await togglePromoCodeStatus(code, activeState); await loadData(); } catch { alert('Greška.'); }
  };

  const handleDeletePromo = async (code: string) => {
    if (confirm(`Obrisati promo kod "${code}"?`)) {
      try { await deletePromoCode(code); await loadData(); } catch { alert('Greška.'); }
    }
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of files) {
        const rawUrl = await uploadImage(f);
        urls.push(optimizeCloudinaryUrl(rawUrl));
      }
      setEditingProduct((prev: any) => ({ ...prev, images: [...(prev?.images || []), ...urls] }));
    } catch (err: any) { alert(err?.message || 'Upload nije uspio.'); } 
    finally { setUploading(false); e.target.value = ''; }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setEditingProduct((prev: any) => ({
      ...prev, images: prev.images.filter((_: any, i: number) => i !== indexToRemove)
    }));
  };

  const handleBatchOptimizeImages = async () => {
    if (!confirm('Želite li optimizovati sve Cloudinary linkove slika u bazi (smanjenje veličine za brže učitavanje)?')) return;
    setOptimizingImages(true);
    try {
      let updatedCount = 0;
      for (const p of products) {
        if (p.images && p.images.length > 0) {
          let hasChange = false;
          const newImages = p.images.map((img) => {
            const opt = optimizeCloudinaryUrl(img);
            if (opt !== img) hasChange = true;
            return opt;
          });
          if (hasChange) {
            await saveProduct({ ...p, images: newImages });
            updatedCount++;
          }
        }
      }
      alert(`Uspješno optimizovane slike za ${updatedCount} artikala!`);
      await loadData();
    } catch (err) {
      console.error('Greška pri optimizaciji slika:', err);
      alert('Došlo je do greške pri optimizaciji.');
    } finally {
      setOptimizingImages(false);
    }
  };

  const handleSaveProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name || !editingProduct.price) return;
    try {
      const rawImages = editingProduct.images && editingProduct.images.length > 0 ? editingProduct.images : ['/hero-streetwear.webp'];
      const optimizedImages = rawImages.map((img: string) => optimizeCloudinaryUrl(img));

      const productPayload: any = {
        name: editingProduct.name,
        price: Number(editingProduct.price),
        originalPrice: editingProduct.originalPrice ? Number(editingProduct.originalPrice) : null,
        category: editingProduct.category || 'Majice',
        color: editingProduct.color || 'Crna',
        material: editingProduct.material || '100% češljani pamuk 240 GSM',
        description: editingProduct.description || '',
        careInstructions: editingProduct.careInstructions || 'Prati na 30°C izvrnuto',
        details: editingProduct.details || ['Visokokvalitetni pamuk', 'Streetwear casual kroj', 'Plaćanje pouzećem ili lično preuzimanje'],
        images: optimizedImages,
        sizes: editingProduct.sizes || { S: 0, M: 0, L: 0, XL: 0, XXL: 0, '3XL': 0, 'One size': 0 },
        isNew: Boolean(editingProduct.isNew),
        featured: Boolean(editingProduct.featured),
        isHidden: Boolean(editingProduct.isHidden),
        createdAt: editingProduct.createdAt || new Date().toISOString(),
      };

      if (editingProduct.id) {
        productPayload.id = editingProduct.id;
      }

      await saveProduct(productPayload);
      setIsSidebarOpen(false);
      setEditingProduct(null);
      await loadData();
    } catch (error) { 
      console.error("Firebase greška:", error);
      alert('Greška pri spremanju proizvoda. Provjerite konzolu (F12) za detalje.'); 
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (confirm(`Sigurno obrisati "${name}"?`)) {
      try { await deleteProduct(id); await loadData(); } catch { alert('Greška.'); }
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveStoreSettings(storeSettings);
      await refreshSettings();
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
    } catch { alert('Greška.'); }
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
    } catch { alert('Greška pri ažuriranju statusa.'); }
  };

  const handleConfirmTrackingAndSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingModalOrder?.id) return;
    try {
      await updateOrderStatus(trackingModalOrder.id, 'Poslana', { trackingNumber: trackingNumberInput, courierName: courierNameInput });
      setOrders((prev) => prev.map((o) => o.id === trackingModalOrder.id ? { ...o, status: 'Poslana', trackingNumber: trackingNumberInput, courierName: courierNameInput } : o));
      setTrackingModalOrder(null);
      setTrackingNumberInput('');
    } catch { alert('Greška pri spremanju.'); }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#FAF9F5] px-4 font-['Inter']">
        <Link 
          href="/" 
          className="mb-8 flex items-center gap-2 text-xs font-['Poppins'] font-bold uppercase tracking-widest text-neutral-500 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Nazad na trgovinu
        </Link>
        <div className="max-w-md w-full bg-white border-2 border-[#0A0A0A] p-6 sm:p-8 shadow-2xl space-y-6 text-center">
          <div className="w-14 h-14 bg-[#0A0A0A] text-[#F7E97F] flex items-center justify-center mx-auto rounded-full">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="font-['Poppins'] text-xl font-black uppercase tracking-wider text-black">ADMIN PRIJAVA</h2>
            <p className="text-xs text-neutral-600 mt-1">Casual Shop BiH kontrolna tabla.</p>
          </div>
          {loginError && <div className="p-3 bg-red-50 text-red-600 text-xs border border-red-200">{loginError}</div>}
          <form onSubmit={handleEmailLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-[11px] font-bold uppercase mb-1">E-mail adresa *</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#FAF9F5] border-2 border-neutral-300 p-2.5 text-xs focus:border-black focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase mb-1">Lozinka *</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#FAF9F5] border-2 border-neutral-300 p-2.5 text-xs focus:border-black focus:outline-none" />
            </div>
            <button type="submit" disabled={loginLoading} className="w-full py-3 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase transition-colors border-2 border-[#0A0A0A] cursor-pointer">
              {loginLoading ? 'Prijavljivanje...' : 'Prijavi se'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const totalRevenue = orders.reduce((sum, ord) => sum + (ord.status !== 'Otkazana' ? ord.total : 0), 0);
  const newOrdersCount = orders.filter((o) => o.status === 'Nova').length;

  const NAV_GROUPS = [
    {
      title: 'Glavno',
      items: [
        { id: 'overview', label: 'Pregled', icon: TrendingUp },
        { id: 'analytics', label: 'Analitika', icon: Eye },
      ]
    },
    {
      title: 'Prodaja',
      items: [
        { id: 'orders', label: `Narudžbe`, badge: newOrdersCount > 0 ? newOrdersCount : null, icon: ShoppingBag },
        { id: 'leads', label: 'Napuštene korpe', icon: Mail },
      ]
    },
    {
      title: 'Katalog',
      items: [
        { id: 'products', label: `Proizvodi`, icon: Package },
        { id: 'stock', label: 'Zalihe', icon: Boxes },
      ]
    },
    {
      title: 'Marketing',
      items: [
        { id: 'promo', label: 'Promo Kodovi', icon: Ticket },
        { id: 'subscribers', label: 'Newsletter', icon: Users },
      ]
    },
    {
      title: 'Sistem',
      items: [
        { id: 'cms', label: 'CMS Izgled', icon: Layout },
        { id: 'settings', label: 'Postavke', icon: Settings },
        { id: 'dev-settings', label: 'Dev alati', icon: Palette },
      ]
    }
  ];

  return (
    <div className="flex h-[100dvh] bg-[#FAF9F5] font-['Inter'] overflow-hidden">
      
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#0A0A0A] text-white flex items-center justify-between px-4 z-[60] shadow-md">
        <span className="font-['Poppins'] font-black uppercase text-sm tracking-widest text-[#F7E97F]">Casual Admin</span>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 cursor-pointer z-50">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 z-[50]" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <div className={`fixed inset-y-0 left-0 z-[55] w-64 bg-[#0A0A0A] text-neutral-300 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0 mt-14' : '-translate-x-full'} flex flex-col h-[calc(100dvh-3.5rem)] md:h-full overflow-y-auto`}>
        <div className="p-6 hidden md:block border-b border-neutral-800">
          <span className="text-[10px] font-['Poppins'] font-black uppercase tracking-[0.2em] bg-[#F7E97F] text-[#0A0A0A] px-2 py-0.5 rounded-sm">
            Control Panel
          </span>
          <h2 className="font-['Poppins'] font-black text-xl text-white uppercase tracking-wider mt-2">Casual Shop</h2>
        </div>

        <div className="flex-1 py-6 space-y-6 px-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2">{group.title}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-['Poppins'] font-bold uppercase tracking-wider transition-colors rounded-md cursor-pointer ${
                      isActive ? 'bg-neutral-800 text-[#F7E97F]' : 'hover:bg-neutral-900 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#F7E97F]' : 'text-neutral-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="bg-[#F7E97F] text-[#0A0A0A] text-[9px] px-1.5 py-0.5 rounded-sm font-black">{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-neutral-800">
          <button onClick={() => signOut()} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-['Poppins'] font-bold uppercase tracking-wider text-red-400 hover:bg-neutral-900 hover:text-red-300 transition-colors rounded-md cursor-pointer">
            <LogOut className="w-4 h-4" /><span>Odjavi se</span>
          </button>
        </div>
      </div>

      <div className="flex-1 h-[100dvh] overflow-y-auto p-4 sm:p-8 md:p-10 pt-20 md:pt-16 bg-[#FAF9F5]">
        
        {activeTab === 'overview' && (
          <div className="space-y-6 sm:space-y-8 animate-fadeIn max-w-6xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
              <div>
                <h1 className="font-['Poppins'] text-2xl font-black uppercase text-black">Pregled i Prodaja</h1>
                <p className="text-xs text-neutral-500">Statistika poslovanja na prvi pogled.</p>
              </div>
              <button onClick={() => loadData()} className="w-full sm:w-auto px-4 py-2 bg-white border-2 border-black text-xs font-bold uppercase cursor-pointer hover:bg-neutral-100">Osvježi podatke</button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <div className="bg-white p-4 sm:p-5 border-2 border-neutral-200 shadow-sm space-y-1">
                <span className="text-[10px] font-['Poppins'] font-bold uppercase tracking-wider text-neutral-400">UKUPAN PRIHOD</span>
                <div className="font-['Poppins'] text-xl sm:text-3xl font-black text-black">{totalRevenue.toFixed(2)} KM</div>
              </div>
              <div className="bg-white p-4 sm:p-5 border-2 border-neutral-200 shadow-sm space-y-1">
                <span className="text-[10px] font-['Poppins'] font-bold uppercase tracking-wider text-neutral-400">BROJ NARUDŽBI</span>
                <div className="font-['Poppins'] text-xl sm:text-3xl font-black text-black">{orders.length}</div>
                <span className="text-[10px] text-amber-700 font-medium block">{newOrdersCount} novih narudžbi</span>
              </div>
              <div className="bg-white p-4 sm:p-5 border-2 border-neutral-200 shadow-sm space-y-1">
                <span className="text-[10px] font-['Poppins'] font-bold uppercase tracking-wider text-neutral-400">UKUPNO ARTIKALA</span>
                <div className="font-['Poppins'] text-xl sm:text-3xl font-black text-black">{products.length}</div>
              </div>
              <div className="bg-white p-4 sm:p-5 border-2 border-neutral-200 shadow-sm space-y-1">
                <span className="text-[10px] font-['Poppins'] font-bold uppercase tracking-wider text-neutral-400">NEWSLETTER</span>
                <div className="font-['Poppins'] text-xl sm:text-3xl font-black text-black">{subscribers.length}</div>
              </div>
            </div>
            
            <div className="overflow-x-auto pb-4">
              <div className="min-w-[600px]">
                <SalesTrendChart orders={orders} />
              </div>
            </div>
            
            <div className="overflow-x-auto pb-4">
              <div className="min-w-[600px]">
                <TrafficAndCartStatsTable orders={orders} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cms' && <div className="animate-fadeIn max-w-5xl"><HomeCMSEditor /></div>}

        {activeTab === 'analytics' && <div className="animate-fadeIn max-w-5xl overflow-x-auto"><div className="min-w-[700px]"><FunnelAnalytics ordersCount={orders.length} /></div></div>}

        {activeTab === 'leads' && <div className="animate-fadeIn max-w-6xl"><AbandonedCartsPromo /></div>}

        {activeTab === 'products' && (
          <div className="space-y-6 animate-fadeIn max-w-6xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="font-['Poppins'] text-xl font-black uppercase text-black">Proizvodi ({products.length})</h2>
              
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  onClick={handleBatchOptimizeImages}
                  disabled={optimizingImages}
                  title="Automatski dodaje Cloudinary transformacije (f_auto, q_auto, w_800) za sve postojeće slike artikala"
                  className="w-full sm:w-auto px-4 py-2 bg-white text-black hover:bg-neutral-100 text-xs font-['Poppins'] font-bold uppercase flex items-center justify-center gap-2 border-2 border-black cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>{optimizingImages ? 'Optimizacija...' : 'Optimizuj Slike (Cloudinary)'}</span>
                </button>

                <button
                  onClick={() => {
                    setEditingProduct({
                      name: '', price: 0, originalPrice: 0, category: 'Majice', color: 'Crna', material: '100% češljani pamuk 240 GSM',
                      description: '', careInstructions: 'Prati na 30°C izvrnuto, ne peglati preko štampe', images: [],
                      sizes: { S: 0, M: 0, L: 0, XL: 0, XXL: 0, '3XL': 0, 'One size': 0 }, isNew: true, featured: false, isHidden: false,
                    });
                    setIsSidebarOpen(true);
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] text-xs font-['Poppins'] font-bold uppercase flex items-center justify-center gap-2 border-2 border-[#0A0A0A] cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" /><span>Novi Artikal</span>
                </button>
              </div>
            </div>

            <div className="bg-white border-2 border-neutral-200 overflow-x-auto shadow-sm">
              <table className="w-full text-xs text-left min-w-[700px]">
                <thead className="bg-[#0A0A0A] text-white font-['Poppins'] font-bold uppercase">
                  <tr>
                    <th className="p-3">Artikal</th>
                    <th className="p-3">Kategorija</th>
                    <th className="p-3">Pregledi</th>
                    <th className="p-3">Cijena</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {products.map((p) => {
                    const totalStock = Object.values(p.sizes || {}).reduce((sum, val) => sum + (val as number), 0);
                    return (
                      <tr key={p.id} className="hover:bg-neutral-50">
                        <td className="p-3 flex items-center gap-3">
                          <img src={optimizeCloudinaryUrl(p.images?.[0] || '/hero-streetwear.webp')} alt={p.name} className="w-10 h-12 object-cover border" />
                          <div>
                            <span className="font-bold text-neutral-900 block">{p.name}</span>
                            <span className="text-[10px] text-neutral-500 font-mono">Zaliha: {totalStock} kom</span>
                          </div>
                        </td>
                        <td className="p-3 font-semibold">{p.category}</td>
                        <td className="p-3 font-bold">{productViewsMap[p.id] || 0}</td>
                        <td className="p-3 font-bold">
                          {p.originalPrice && p.originalPrice > p.price ? (
                            <div className="flex flex-col"><span className="text-red-600">{p.price.toFixed(2)} KM</span><span className="text-[10px] text-neutral-400 line-through">{p.originalPrice.toFixed(2)} KM</span></div>
                          ) : (<span>{p.price.toFixed(2)} KM</span>)}
                        </td>
                        <td className="p-3">
                          {p.isHidden ? <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-neutral-200 text-neutral-700">Skriven</span> : totalStock === 0 ? <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-red-100 text-red-800">Rasprodano</span> : <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">Aktivan</span>}
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button onClick={() => { setEditingProduct(p); setIsSidebarOpen(true); }} className="px-2 py-1 bg-[#FAF9F5] border border-neutral-300 text-neutral-800 font-bold uppercase text-[10px] hover:bg-neutral-200 transition-colors cursor-pointer">Uredi</button>
                          <button onClick={() => handleDeleteProduct(p.id, p.name)} className="px-2 py-1 bg-red-50 border border-red-200 text-red-600 font-bold uppercase text-[10px] hover:bg-red-100 transition-colors cursor-pointer">Obriši</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'stock' && <div className="animate-fadeIn max-w-6xl overflow-x-auto"><div className="min-w-[600px]"><StockManagementTab products={products} onRefreshData={loadData} /></div></div>}

        {activeTab === 'orders' && (
          <div className="space-y-6 animate-fadeIn max-w-6xl">
            <div className="flex justify-between items-center">
              <h2 className="font-['Poppins'] text-xl font-black uppercase text-black">Narudžbe ({orders.length})</h2>
            </div>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 border-2 border-neutral-200 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-['Poppins'] font-bold uppercase text-neutral-500 mr-1">Status:</span>
                {['Sve', 'Nova', 'Potvrđena', 'Poslana', 'Dostavljena', 'Otkazana'].map((status) => (
                  <button key={status} onClick={() => setOrderStatusFilter(status)} className={`px-2 sm:px-3 py-1 text-[9px] sm:text-[10px] font-['Poppins'] font-bold uppercase transition-colors border cursor-pointer ${orderStatusFilter === status ? 'bg-[#0A0A0A] text-[#F7E97F] border-[#0A0A0A]' : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'}`}>{status}</button>
                ))}
              </div>
              <div className="relative w-full lg:w-64">
                <input type="text" placeholder="Pretraži (ime, grad, telefon)..." value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} className="w-full bg-[#F4F2EC] border border-neutral-300 px-3 py-1.5 text-xs focus:bg-white focus:outline-none" />
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-2.5" />
              </div>
            </div>

            <div className="space-y-4">
              {orders.filter((o) => {
                  if (orderStatusFilter !== 'Sve' && o.status !== orderStatusFilter) return false;
                  if (orderSearch.trim()) {
                    const s = orderSearch.toLowerCase();
                    const c = extractCustomer(o);
                    return o.orderNumber.toLowerCase().includes(s) || c.name.toLowerCase().includes(s) || c.city.toLowerCase().includes(s) || c.phone.toLowerCase().includes(s);
                  }
                  return true;
                }).map((order) => {
                  const c = extractCustomer(order);
                  const trust = getCustomerTrust(c.phone);
                  const TrustIcon = trust.icon;

                  return (
                    <div key={order.orderNumber} className="bg-white border-2 border-neutral-200 p-4 sm:p-5 space-y-4 shadow-sm">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-neutral-200 pb-3 gap-3">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <span className="font-['Poppins'] font-black text-xs sm:text-sm text-black">#{order.orderNumber.replace(/^#/, '')}</span>
                          <span className="text-[10px] sm:text-xs text-neutral-500">{new Date(order.createdAt).toLocaleString('bs-BA')}</span>
                          <span className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded border text-[9px] sm:text-[10px] font-bold ${trust.color}`}><TrustIcon className="w-3 h-3" /><span>{trust.label}</span></span>
                        </div>
                        <div className="flex items-center gap-2 w-full lg:w-auto">
                          <button onClick={() => setPrintModalOrder({ order, name: c.name, address: c.address, city: `${c.postalCode} ${c.city}`.trim() })} className="flex-1 lg:flex-none px-3 py-1.5 bg-[#F7E97F] hover:bg-yellow-300 text-black border border-neutral-800 text-[10px] sm:text-xs font-['Poppins'] font-bold uppercase rounded flex items-center justify-center gap-1.5 cursor-pointer">
                            <Printer className="w-3.5 h-3.5" /><span>Adresnica</span>
                          </button>
                          <select value={order.status} onChange={(e) => handleUpdateStatus(order.id || '', e.target.value as OrderStatus)} className="flex-1 lg:flex-none text-[10px] sm:text-xs font-['Poppins'] font-bold uppercase px-3 py-1.5 border-2 focus:outline-none cursor-pointer bg-white">
                            <option value="Nova">Nova</option>
                            <option value="Potvrđena">Potvrđena</option>
                            <option value="Poslana">Poslana</option>
                            <option value="Dostavljena">Dostavljena</option>
                            <option value="Otkazana">Otkazana</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1.5 bg-[#F4F2EC] p-3.5 border border-neutral-300">
                          <span className="font-['Poppins'] font-bold uppercase text-neutral-700 block">Podaci o kupcu:</span>
                          <p className="font-bold text-neutral-900 text-sm">{c.name}</p>
                          <p className="text-neutral-800">📞 Mobitel: <strong>{c.phone}</strong></p>
                          <p className="text-neutral-800">📍 Adresa: {c.address}, {c.city}</p>
                          {order.trackingNumber && (
                            <div className="pt-2 border-t border-neutral-300 text-purple-900 font-semibold flex items-center gap-1.5">
                              <Truck className="w-4 h-4 text-purple-700 shrink-0" />
                              <span>{order.courierName || 'X Express'}: <strong className="font-mono">{order.trackingNumber}</strong></span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2 bg-[#F4F2EC] p-3.5 border border-neutral-300">
                          <span className="font-['Poppins'] font-bold uppercase text-neutral-700 block">Naručeni artikli:</span>
                          <div className="space-y-1">
                            {order.items.map((it, idx) => (
                              <div key={idx} className="flex justify-between items-center text-[11px]">
                                <span>{it.quantity}x <strong>{it.name}</strong> ({it.size})</span>
                                <span className="font-['Poppins'] font-bold">{(it.price * it.quantity).toFixed(2)} KM</span>
                              </div>
                            ))}
                          </div>
                          <div className="pt-2 border-t border-neutral-300 flex justify-between items-center font-bold text-xs font-['Poppins']">
                            <span>Ukupno pouzećem:</span>
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

        {activeTab === 'promo' && (
          <div className="space-y-6 animate-fadeIn max-w-5xl">
            <h2 className="font-['Poppins'] text-xl font-black uppercase text-black">Promo Kuponi</h2>
            <form onSubmit={handleCreatePromo} className="bg-white p-6 border-2 border-neutral-300 space-y-4 shadow-sm">
              <h3 className="font-['Poppins'] text-xs font-black uppercase text-black">Kreiraj novi promo kod</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input type="text" required placeholder="NAZIV KODA (npr. FIRST100)" value={newPromoCode} onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())} className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs font-mono font-bold uppercase" />
                <input type="number" required min="1" max="100" value={newPromoDiscount} onChange={(e) => setNewPromoDiscount(Number(e.target.value))} className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs font-mono font-bold" placeholder="Popust %" />
                <input type="number" required min="1" value={newPromoMaxUsage} onChange={(e) => setNewPromoMaxUsage(Number(e.target.value))} className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs font-mono font-bold" placeholder="Maksimalno korištenja" />
              </div>
              <button type="submit" disabled={promoLoading} className="w-full sm:w-auto px-6 py-2.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase cursor-pointer">
                {promoLoading ? 'Kreiranje...' : 'Generiši Promo Kod'}
              </button>
            </form>

            <div className="bg-white border-2 border-neutral-200 overflow-x-auto shadow-sm">
              <table className="w-full text-xs text-left min-w-[500px]">
                <thead className="bg-[#0A0A0A] text-white font-['Poppins'] font-bold uppercase">
                  <tr>
                    <th className="p-3">Kod</th>
                    <th className="p-3">Popust</th>
                    <th className="p-3">Korištenje</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {promoCodes.map((codeItem, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50">
                      <td className="p-3 font-mono font-bold">{codeItem.code}</td>
                      <td className="p-3 font-bold text-amber-700">-{codeItem.discountPercent || 10}%</td>
                      <td className="p-3">{codeItem.usageCount || 0} / {codeItem.maxUsage || 100}</td>
                      <td className="p-3"><span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">{codeItem.active === false ? 'Ugašen' : 'Aktivan'}</span></td>
                      <td className="p-3 text-right space-x-2">
                        <button onClick={() => handleTogglePromo(codeItem.code, codeItem.active ?? true)} className="px-2 py-1 text-[10px] font-bold uppercase border cursor-pointer"><Power className="w-3 h-3 inline mr-1" /><span>{codeItem.active === false ? 'Aktiviraj' : 'Ugasi'}</span></button>
                        <button onClick={() => handleDeletePromo(codeItem.code)} className="p-1 text-red-600 hover:bg-red-50 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'subscribers' && (
          <div className="space-y-6 animate-fadeIn max-w-5xl">
            <h2 className="font-['Poppins'] text-xl font-black uppercase text-black">Email Baza ({subscribers.length})</h2>
            <div className="bg-white border-2 border-neutral-200 overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#0A0A0A] text-white font-['Poppins'] font-bold uppercase">
                  <tr><th className="p-3">#</th><th className="p-3">E-mail adresa</th><th className="p-3">Datum prijave</th></tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {subscribers.map((sub, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50">
                      <td className="p-3 font-mono text-neutral-400">{idx + 1}</td>
                      <td className="p-3 font-semibold break-all">{sub.email}</td>
                      <td className="p-3 text-neutral-600">{new Date(sub.subscribedAt).toLocaleString('bs-BA')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SETTINGS TAB SA E-MAIL POLJEM */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fadeIn max-w-4xl">
            <h2 className="font-['Poppins'] text-xl font-black uppercase text-black">Postavke Trgovine</h2>
            {settingsSaved && (
              <div className="bg-white border-2 border-[#F7E97F] p-4 flex items-center gap-2 text-xs font-bold text-black">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" /><span>Postavke su spremljene!</span>
              </div>
            )}
            <form onSubmit={handleSaveSettings} className="bg-white p-6 sm:p-8 border-2 border-neutral-300 space-y-6 shadow-sm">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-6 border-b border-neutral-200">
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">Email za kontakt</label>
                  <input type="email" value={storeSettings.email || ''} onChange={(e) => setStoreSettings({ ...storeSettings, email: e.target.value })} placeholder="info@casualshop.ba" className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">Cijena dostave (KM)</label>
                  <input type="number" step="0.5" value={storeSettings.shippingFee} onChange={(e) => setStoreSettings({ ...storeSettings, shippingFee: Number(e.target.value) })} className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">Besplatna dostava iznad (KM)</label>
                  <input type="number" step="1" value={storeSettings.freeShippingThreshold} onChange={(e) => setStoreSettings({ ...storeSettings, freeShippingThreshold: Number(e.target.value) })} className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs font-bold" />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-['Poppins'] text-xs font-black uppercase text-black flex items-center gap-2">
                  <EyeOff className="w-4 h-4" /><span>Sakrivene kategorije</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F4F2EC] p-4 border border-neutral-300">
                  {CATEGORIES.filter((c) => c !== 'Rasprodano').map((cat) => {
                    const isHidden = (storeSettings.hiddenCategories || []).includes(cat);
                    return (
                      <label key={cat} className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                        <input type="checkbox" checked={isHidden} onChange={(e) => {
                            const current = storeSettings.hiddenCategories || [];
                            const updated = e.target.checked ? [...current, cat] : current.filter((c) => c !== cat);
                            setStoreSettings({ ...storeSettings, hiddenCategories: updated });
                          }} className="accent-black h-4 w-4" />
                        <span className={isHidden ? 'text-red-600 line-through' : 'text-black'}>{cat}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              
              <button type="submit" className="w-full sm:w-auto px-6 py-3 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase cursor-pointer">
                Spremi postavke
              </button>
            </form>
          </div>
        )}

        {activeTab === 'dev-settings' && <div className="animate-fadeIn max-w-5xl"><DevSettings /></div>}

      </div>

      {printModalOrder && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-6 border-2 border-[#F7E97F] shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
              <h3 className="font-['Poppins'] text-xs font-black uppercase text-black">
                A6 Adresnica (#{printModalOrder.order.orderNumber.replace(/^#/, '')})
              </h3>
              <button onClick={() => setPrintModalOrder(null)} className="p-1 text-neutral-400 hover:text-black cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">Ime i prezime na paketu:</label>
                <input type="text" value={printModalOrder.name} onChange={(e) => setPrintModalOrder({ ...printModalOrder, name: e.target.value })} className="w-full bg-[#F4F2EC] border border-neutral-300 p-2 font-bold" />
              </div>
              <div>
                <label className="block font-bold text-neutral-700 mb-1">Adresa kupca:</label>
                <input type="text" value={printModalOrder.address} onChange={(e) => setPrintModalOrder({ ...printModalOrder, address: e.target.value })} className="w-full bg-[#F4F2EC] border border-neutral-300 p-2" />
              </div>
              <div>
                <label className="block font-bold text-neutral-700 mb-1">Grad i poštanski broj:</label>
                <input type="text" value={printModalOrder.city} onChange={(e) => setPrintModalOrder({ ...printModalOrder, city: e.target.value })} className="w-full bg-[#F4F2EC] border border-neutral-300 p-2" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
              <button onClick={() => setPrintModalOrder(null)} className="px-3.5 py-1.5 border border-neutral-300 text-xs font-bold uppercase cursor-pointer">Odustani</button>
              <button onClick={() => { generateShippingSlip(printModalOrder.order, printModalOrder.name, printModalOrder.address, printModalOrder.city); setPrintModalOrder(null); }} className="px-4 py-1.5 bg-[#0A0A0A] text-[#F7E97F] hover:bg-neutral-800 text-xs font-['Poppins'] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer"><Printer className="w-4 h-4" /><span>Preuzmi PDF</span></button>
            </div>
          </div>
        </div>
      )}

      {trackingModalOrder && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-6 border-2 border-[#F7E97F] shadow-2xl space-y-4">
            <h3 className="font-['Poppins'] text-xs font-black uppercase text-black">
              Unos broja pošiljke (#{trackingModalOrder.orderNumber.replace(/^#/, '')})
            </h3>
            <form onSubmit={handleConfirmTrackingAndSend} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase mb-1">Kurirska Služba:</label>
                <select value={courierNameInput} onChange={(e) => setCourierNameInput(e.target.value)} className="w-full bg-[#F4F2EC] border border-neutral-300 p-2">
                  <option value="X Express">X Express Brza Pošta</option>
                  <option value="EuroExpress">EuroExpress</option>
                  <option value="BH Pošta">BH Pošta</option>
                </select>
              </div>
              <div>
                <label className="block font-bold uppercase mb-1">Tracking broj:</label>
                <input type="text" value={trackingNumberInput} onChange={(e) => setTrackingNumberInput(e.target.value.toUpperCase())} placeholder="npr. XE-123456" className="w-full bg-[#F4F2EC] border border-neutral-300 p-2 font-mono font-bold" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
                <button type="button" onClick={() => setTrackingModalOrder(null)} className="px-3.5 py-1.5 border border-neutral-300 text-xs font-bold uppercase cursor-pointer">Odustani</button>
                <button type="submit" className="px-4 py-1.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] text-xs font-bold uppercase cursor-pointer">Potvrdi slanje</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isSidebarOpen && editingProduct && (
        <div className="fixed inset-0 z-[60] overflow-hidden font-['Inter']">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)} />
          
          <div className="fixed inset-y-0 right-0 max-w-full flex">
            <div className="w-screen max-w-lg bg-[#FAF9F5] shadow-2xl flex flex-col h-full animate-fadeIn border-l-2 border-[#0A0A0A]">
              <div className="px-6 py-5 bg-[#0A0A0A] text-white flex justify-between items-center border-b border-neutral-800">
                <div className="flex items-center gap-3"><Package className="w-5 h-5 text-[#F7E97F]" /><h2 className="font-['Poppins'] text-sm sm:text-base font-black uppercase tracking-wider text-white">{editingProduct.id ? 'UREĐIVANJE ARTIKLA' : 'NOVI ARTIKAL'}</h2></div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-1 text-neutral-400 hover:text-white cursor-pointer"><X className="w-6 h-6" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8">
                <form id="product-form" onSubmit={handleSaveProductSubmit} className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="font-['Poppins'] text-xs font-black uppercase text-black border-b border-neutral-300 pb-2 flex items-center gap-2"><Info className="w-4 h-4" /> 1. Osnovne informacije</h3>
                    <div><label className="block font-bold uppercase text-[11px] text-neutral-700 mb-1">Naziv artikla *</label><input type="text" required placeholder="npr. Oversized Majica 'Urban'" value={editingProduct.name || ''} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} className="w-full bg-white border-2 border-neutral-300 p-2.5 text-xs font-bold text-black focus:border-black focus:outline-none" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block font-bold uppercase text-[11px] text-neutral-700 mb-1">Kategorija *</label><select value={editingProduct.category || 'Majice'} onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value as any })} className="w-full bg-white border-2 border-neutral-300 p-2.5 text-xs font-bold text-black focus:border-black focus:outline-none cursor-pointer">{CATEGORIES.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}</select></div>
                      <div><label className="block font-bold uppercase text-[11px] text-neutral-700 mb-1">Cijena (KM) *</label><input type="number" step="0.5" required value={editingProduct.price || 0} onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })} className="w-full bg-white border-2 border-neutral-300 p-2.5 text-xs font-mono font-black text-black focus:border-black focus:outline-none" /></div>
                    </div>
                    <div><label className="block font-bold uppercase text-[11px] text-neutral-700 mb-1">Prekrižena cijena (Za Akcije - Opciono)</label><input type="number" step="0.5" placeholder="Upišite višu cijenu ako je artikal na sniženju" value={editingProduct.originalPrice || ''} onChange={(e) => setEditingProduct({ ...editingProduct, originalPrice: e.target.value ? Number(e.target.value) : undefined })} className="w-full bg-white border-2 border-neutral-300 p-2.5 text-xs font-mono text-neutral-600 focus:border-black focus:outline-none" /></div>
                    <div><label className="block font-bold uppercase text-[11px] text-neutral-700 mb-1">Opis artikla</label><textarea rows={3} placeholder="Napišite uvjerljiv opis proizvoda..." value={editingProduct.description || ''} onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })} className="w-full bg-white border-2 border-neutral-300 p-2.5 text-xs text-black focus:border-black focus:outline-none" /></div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-['Poppins'] text-xs font-black uppercase text-black border-b border-neutral-300 pb-2 flex items-center gap-2"><ImageIcon className="w-4 h-4" /> 2. Mediji i slike</h3>
                    <label className="block w-full text-center border-2 border-dashed border-neutral-300 hover:border-black bg-white p-6 cursor-pointer transition-colors">
                      <span className="font-['Poppins'] text-xs font-black uppercase text-black">{uploading ? 'Upload u toku...' : '+ KLIKNI DA DODAŠ SLIKE'}</span>
                      <p className="text-[10px] text-neutral-500 mt-1">Podržani formati: JPG, PNG, WEBP (Max 5MB)</p>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} disabled={uploading} />
                    </label>
                    {(editingProduct.images && editingProduct.images.length > 0) && (
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 pt-2">
                        {editingProduct.images.map((img, idx) => (
                          <div key={idx} className="relative aspect-4/5 bg-neutral-100 border border-neutral-300 group">
                            <img src={optimizeCloudinaryUrl(img)} alt={`Slika ${idx + 1}`} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => handleRemoveImage(idx)} className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"><X className="w-3 h-3" /></button>
                            {idx === 0 && <span className="absolute bottom-0 left-0 right-0 bg-[#0A0A0A] text-[#F7E97F] text-[8px] font-bold text-center py-0.5">GLAVNA</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-['Poppins'] text-xs font-black uppercase text-black border-b border-neutral-300 pb-2 flex items-center gap-2"><Tag className="w-4 h-4" /> 3. Detalji i materijali</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block font-bold uppercase text-[11px] text-neutral-700 mb-1">Materijal</label><input type="text" value={editingProduct.material || ''} onChange={(e) => setEditingProduct({ ...editingProduct, material: e.target.value })} className="w-full bg-white border-2 border-neutral-300 p-2.5 text-xs text-black focus:border-black focus:outline-none" /></div>
                      <div><label className="block font-bold uppercase text-[11px] text-neutral-700 mb-1">Boja</label><input type="text" value={editingProduct.color || ''} onChange={(e) => setEditingProduct({ ...editingProduct, color: e.target.value })} className="w-full bg-white border-2 border-neutral-300 p-2.5 text-xs text-black focus:border-black focus:outline-none" /></div>
                      <div className="col-span-2"><label className="block font-bold uppercase text-[11px] text-neutral-700 mb-1">Održavanje</label><input type="text" value={editingProduct.careInstructions || ''} onChange={(e) => setEditingProduct({ ...editingProduct, careInstructions: e.target.value })} className="w-full bg-white border-2 border-neutral-300 p-2.5 text-xs text-black focus:border-black focus:outline-none" /></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-['Poppins'] text-xs font-black uppercase text-black border-b border-neutral-300 pb-2 flex items-center gap-2"><Boxes className="w-4 h-4" /> 4. Zalihe po veličinama</h3>
                    <div className="grid grid-cols-4 gap-3">
                      {availableSizesList.map((sz) => (
                        <div key={sz} className="bg-neutral-50 p-2 border border-neutral-200">
                          <label className="block text-[10px] font-['Poppins'] font-bold uppercase text-center mb-1">{sz}</label>
                          <input type="number" min="0" value={editingProduct.sizes?.[sz] || 0} onChange={(e) => { const val = Math.max(0, parseInt(e.target.value) || 0); setEditingProduct((prev: any) => ({ ...prev, sizes: { ...(prev?.sizes || {}), [sz]: val } })); }} className="w-full bg-white border border-neutral-300 p-1.5 text-center text-xs font-mono font-bold focus:border-black focus:outline-none" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pb-10">
                    <h3 className="font-['Poppins'] text-xs font-black uppercase text-black border-b border-neutral-300 pb-2 flex items-center gap-2"><Settings className="w-4 h-4" /> 5. Vidljivost artikla</h3>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer p-3 border border-neutral-200 bg-white hover:bg-neutral-50"><input type="checkbox" checked={editingProduct.isHidden || false} onChange={(e) => setEditingProduct({ ...editingProduct, isHidden: e.target.checked })} className="w-4 h-4 accent-black" /><div className="flex flex-col"><span className="font-bold text-xs">Sakrij proizvod iz trgovine</span><span className="text-[10px] text-neutral-500">Kupci ga neće moći vidjeti niti kupiti.</span></div></label>
                      <label className="flex items-center gap-3 cursor-pointer p-3 border border-neutral-200 bg-white hover:bg-neutral-50"><input type="checkbox" checked={editingProduct.isNew || false} onChange={(e) => setEditingProduct({ ...editingProduct, isNew: e.target.checked })} className="w-4 h-4 accent-black" /><div className="flex flex-col"><span className="font-bold text-xs">Označi kao "Novo"</span><span className="text-[10px] text-neutral-500">Prikazuje markicu NOVO na slici proizvoda.</span></div></label>
                      <label className="flex items-center gap-3 cursor-pointer p-3 border border-neutral-200 bg-white hover:bg-neutral-50"><input type="checkbox" checked={editingProduct.featured || false} onChange={(e) => setEditingProduct({ ...editingProduct, featured: e.target.checked })} className="w-4 h-4 accent-black" /><div className="flex flex-col"><span className="font-bold text-xs">Istaknuti proizvod (Featured)</span><span className="text-[10px] text-neutral-500">Prikazuje se na vrhu početne stranice.</span></div></label>
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-4 sm:p-5 bg-white border-t-2 border-neutral-300 flex justify-between gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <button type="button" onClick={() => setIsSidebarOpen(false)} className="px-4 sm:px-6 py-3 border-2 border-neutral-300 font-['Poppins'] font-bold text-xs uppercase hover:bg-neutral-100 transition-colors w-1/3 cursor-pointer">Odustani</button>
                <button type="submit" form="product-form" className="px-4 sm:px-6 py-3 bg-[#0A0A0A] text-[#F7E97F] font-['Poppins'] font-black text-xs uppercase tracking-wider hover:bg-black border-2 border-black flex items-center justify-center gap-2 w-2/3 shadow-lg cursor-pointer"><Save className="w-4 h-4" /><span>Spremi Artikal</span></button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};