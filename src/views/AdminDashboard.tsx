import React, { useState, useEffect } from 'react';
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
  BarChart3,
  Layout,
  Truck,
  Clock,
} from 'lucide-react';
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

  // Tracking modal state
  const [trackingModalOrder, setTrackingModalOrder] = useState<Order | null>(null);
  const [trackingNumberInput, setTrackingNumberInput] = useState('');
  const [courierNameInput, setCourierNameInput] = useState('X Express');

  // Promo Code Creation State
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoDiscount, setNewPromoDiscount] = useState(10);
  const [newPromoMaxUsage, setNewPromoMaxUsage] = useState(100);
  const [promoLoading, setPromoLoading] = useState(false);

  // Email & Password login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Product modal & Image upload state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // Orders filter & search
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('Sve');
  const [orderSearch, setOrderSearch] = useState('');

  const availableSizesList: Size[] = ['S', 'M', 'L', 'XL', 'XXL', '3XL', 'One size'];

  // SIGURNO UČITAVANJE PODATAKA - ISKLJUČIVO ZA LOGOVANOG ADMINA
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
        } else {
          const existing = uniqueSubscribersMap.get(cleanEmail)!;
          if (new Date(sub.subscribedAt).getTime() > new Date(existing.subscribedAt).getTime()) {
            uniqueSubscribersMap.set(cleanEmail, sub);
          }
        }
      });

      const uniqueSubscribers = Array.from(uniqueSubscribersMap.values()).sort(
        (a, b) => new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime()
      );

      setProducts(prodsData);
      setOrders(ordersData);
      setSubscribers(uniqueSubscribers);
      setStoreSettings(settingsData);
      setProductViewsMap(viewsData);
      setPromoCodes(promoData);
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // EFFEKT: Učitavanje i Auto-Refresh na svakih 15 sekundi kad je admin prijavljen
  useEffect(() => {
    if (isAdmin) {
      loadData();

      const interval = setInterval(() => {
        loadData(true); // Osvježava u pozadini bez skakanja loading spinnera
      }, 15000);

      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      await loginWithEmail(email, password, rememberMe);
    } catch (err: any) {
      console.error('Login error:', err);
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
      await createPromoCode(
        newPromoCode.trim().toUpperCase(),
        'manual',
        720,
        newPromoDiscount,
        newPromoMaxUsage
      );
      setNewPromoCode('');
      await loadData();
    } catch (err) {
      alert('Greška pri kreiranju promo koda.');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleTogglePromo = async (code: string, activeState: boolean) => {
    try {
      await togglePromoCodeStatus(code, activeState);
      await loadData();
    } catch (err) {
      alert('Greška pri promjeni statusa promo koda.');
    }
  };

  const handleDeletePromo = async (code: string) => {
    if (confirm(`Jeste li sigurni da želite trajno obrisati promo kod "${code}"?`)) {
      try {
        await deletePromoCode(code);
        await loadData();
      } catch (err) {
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

  // AKO ADMIN NIJE ULOGOVAN -> RENDERUJES FORMULAR BEZ BILO KAKVIH UPITA BAZI
  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12 font-['Inter']">
        <div className="max-w-md w-full bg-white border-2 border-[#F7E97F] p-8 shadow-2xl space-y-6 text-center">
          <div className="w-14 h-14 bg-[#0A0A0A] text-[#F7E97F] border-2 border-[#F7E97F] flex items-center justify-center mx-auto rounded-full">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="font-['Poppins'] text-xl font-black uppercase tracking-wider text-black">
              ADMIN PRIJAVA
            </h2>
            <p className="text-xs text-neutral-600">
              Casual Shop BiH kontrolna tabla za upravljanje artiklima, narudžbama i postavkama.
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs text-left rounded font-medium">
              {loginError}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4 text-left">
            <div>
              <label htmlFor="admin-login-email" className="block text-[11px] font-['Poppins'] font-bold uppercase text-neutral-700 mb-1">
                E-mail adresa *
              </label>
              <input
                id="admin-login-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Unesite vaš email"
                className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs focus:border-black focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="admin-login-password" className="block text-[11px] font-['Poppins'] font-bold uppercase text-neutral-700 mb-1">
                Lozinka *
              </label>
              <input
                id="admin-login-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs focus:border-black focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between py-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  id="admin-remember-me"
                  name="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="accent-black h-4 w-4"
                />
                <span className="text-xs text-neutral-600">Zapamti me na ovom uređaju</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-wider transition-colors border-2 border-[#0A0A0A] disabled:opacity-50 cursor-pointer"
            >
              {loginLoading ? 'Prijavljivanje...' : 'Prijavi se'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const totalRevenue = orders.reduce((sum, ord) => sum + (ord.status !== 'Otkazana' ? ord.total : 0), 0);
  const totalOrdersCount = orders.length;
  const newOrdersCount = orders.filter((o) => o.status === 'Nova').length;
  const subscribersCount = subscribers.length;

  const promoUsageCountMap: Record<string, number> = {};
  let totalPromosUsedInOrders = 0;

  orders.forEach((ord) => {
    if (ord.status !== 'Otkazana' && ord.promoCode) {
      const codeUpper = ord.promoCode.trim().toUpperCase();
      promoUsageCountMap[codeUpper] = (promoUsageCountMap[codeUpper] || 0) + 1;
      totalPromosUsedInOrders += 1;
    }
  });

  const productSalesMap: Record<string, { name: string; count: number; revenue: number }> = {};
  orders.forEach((ord) => {
    if (ord.status !== 'Otkazana') {
      ord.items.forEach((item) => {
        if (!productSalesMap[item.id]) {
          productSalesMap[item.id] = { name: item.name, count: 0, revenue: 0 };
        }
        productSalesMap[item.id].count += item.quantity;
        productSalesMap[item.id].revenue += item.price * item.quantity;
      });
    }
  });
  const bestSellers = Object.values(productSalesMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

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
        images: editingProduct.images && editingProduct.images.length > 0
          ? editingProduct.images
          : ['/images/sarajevo_geo_tee.jpg'],
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
    } catch (err) {
      console.error('Greška pri spremanju:', err);
      alert('Greška pri spremanju proizvoda.');
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (confirm(`Jeste li sigurni da želite obrisati proizvod "${name}"?`)) {
      try {
        await deleteProduct(id);
        await loadData();
      } catch (err) {
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

      if (status === 'Otkazana' && targetOrder && targetOrder.status !== 'Otkazana') {
        for (const item of targetOrder.items) {
          const prod = products.find((p) => p.id === item.id);
          if (prod) {
            const currentStock = prod.sizes[item.size] ?? 0;
            const updatedSizes = { ...prod.sizes, [item.size]: currentStock + item.quantity };
            await saveProduct({ ...prod, sizes: updatedSizes });
          }
        }
        await loadData();
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status } : o))
        );
      }
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

  const handleGenerateMonthlyReport = () => {
    if (orders.length === 0) {
      alert('Nema narudžbi za generisanje izvještaja.');
      return;
    }

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyOrders = orders.filter((o) => {
      const d = new Date(o.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const headers = 'Broj Narudžbe,Kupac,Telefon,Grad,Način Dostave,Ukupno KM,Status,Broj Pošiljke,Datum\n';
    const rows = monthlyOrders
      .map((o) => {
        const deliveryMethod = o.customer.address.includes('Lično') ? 'Lično preuzimanje' : 'Brza pošta';
        const cleanNum = o.orderNumber.replace(/^#/, '');
        return `"${cleanNum}","${o.customer.firstName} ${o.customer.lastName}","${o.customer.phone}","${o.customer.city}","${deliveryMethod}","${o.total.toFixed(2)}","${o.status}","${o.trackingNumber || '/'}","${new Date(o.createdAt).toLocaleString('bs-BA')}"`;
      })
      .join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(headers + rows);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `casualshop_mjesecni_izvjestaj_${currentYear}_${currentMonth + 1}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    if (subscribers.length === 0) {
      alert('Nema pretplatnika za izvoz.');
      return;
    }
    const headers = 'Email,Datum Prijave,Saglasnost\n';
    const rows = subscribers
      .map((s) => `"${s.email}","${new Date(s.subscribedAt).toLocaleString('bs-BA')}","Da"`)
      .join('\n');
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(headers + rows);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `casualshop_pretplatnici_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    if (!editingProduct?.images) return;
    const imgs = [...editingProduct.images];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= imgs.length) return;
    const temp = imgs[index];
    imgs[index] = imgs[targetIdx];
    imgs[targetIdx] = temp;
    setEditingProduct({ ...editingProduct, images: imgs });
  };

  const removeImage = (index: number) => {
    if (!editingProduct?.images) return;
    const imgs = editingProduct.images.filter((_, i) => i !== index);
    setEditingProduct({ ...editingProduct, images: imgs });
  };

  const addImage = () => {
    if (!newImageUrl.trim()) return;
    const imgs = [...(editingProduct?.images || []), newImageUrl.trim()];
    setEditingProduct({ ...editingProduct, images: imgs });
    setNewImageUrl('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 font-['Inter']">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b-2 border-neutral-300 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-['Poppins'] font-black uppercase tracking-[0.25em] bg-[#0A0A0A] text-[#F7E97F] border border-[#F7E97F] px-2 py-0.5">
              ADMIN PANEL
            </span>
          </div>
          <h1 className="font-['Poppins'] text-2xl sm:text-3xl font-black uppercase tracking-tight text-neutral-900 mt-1">
            KONTROLNA TABLA • CASUAL SHOP BIH
          </h1>
          <p className="text-xs text-neutral-600">
            Prijavljeni admin: {user?.email || 'Administrator'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateMonthlyReport}
            className="px-3.5 py-2 bg-[#F7E97F] border-2 border-[#0A0A0A] text-xs font-['Poppins'] font-black uppercase tracking-wider hover:bg-yellow-300 text-black cursor-pointer flex items-center gap-1.5"
            title="Preuzmi izvještaj prodaje za tekući mjesec"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Mjesečni Izvještaj</span>
          </button>
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

      {/* Tabs Navigation */}
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
              <span className="text-[11px] text-emerald-600 font-semibold block">
                Iz realizovanih narudžbi
              </span>
            </div>

            <div className="bg-white p-5 border-2 border-neutral-200 shadow-sm space-y-1">
              <span className="text-[10px] font-['Poppins'] font-bold uppercase tracking-wider text-neutral-400">
                BROJ NARUDŽBI
              </span>
              <div className="font-['Poppins'] text-2xl sm:text-3xl font-black text-black">
                {totalOrdersCount}
              </div>
              <span className="text-[11px] text-neutral-600 font-medium block">
                {newOrdersCount} novih narudžbi čeka potvrdu
              </span>
            </div>

            <div className="bg-white p-5 border-2 border-neutral-200 shadow-sm space-y-1">
              <span className="text-[10px] font-['Poppins'] font-bold uppercase tracking-wider text-neutral-400">
                UKUPNO ARTIKALA
              </span>
              <div className="font-['Poppins'] text-2xl sm:text-3xl font-black text-black">
                {products.length}
              </div>
              <span className="text-[11px] text-neutral-600 font-medium block">
                U katalogu trgovine
              </span>
            </div>

            <div className="bg-white p-5 border-2 border-neutral-200 shadow-sm space-y-1">
              <span className="text-[10px] font-['Poppins'] font-bold uppercase tracking-wider text-neutral-400">
                NEWSLETTER PRETPLATNICI
              </span>
              <div className="font-['Poppins'] text-2xl sm:text-3xl font-black text-black">
                {subscribersCount}
              </div>
              <span className="text-[11px] text-neutral-600 font-medium block">
                Prijavljenih korisnika
              </span>
            </div>
          </div>

          <SalesTrendChart orders={orders} />
          <TrafficAndCartStatsTable orders={orders} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 border-2 border-neutral-200 space-y-4">
              <h3 className="font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] text-black">
                Najprodavaniji artikli
              </h3>
              {bestSellers.length === 0 ? (
                <p className="text-xs text-neutral-500 py-4">Još nema realizovanih prodaja.</p>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {bestSellers.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-neutral-900 block font-['Poppins']">{item.name}</span>
                        <span className="text-neutral-500 text-[11px]">Prodano: {item.count} kom</span>
                      </div>
                      <span className="font-['Poppins'] font-bold text-black">{item.revenue.toFixed(2)} KM</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-6 border-2 border-neutral-200 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] text-black">
                  Posljednje narudžbe
                </h3>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-[11px] font-['Poppins'] font-bold text-neutral-700 hover:text-black uppercase underline cursor-pointer"
                >
                  Vidi sve
                </button>
              </div>

              {orders.length === 0 ? (
                <p className="text-xs text-neutral-500 py-4">Nema pristiglih narudžbi.</p>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {orders.slice(0, 5).map((ord) => (
                    <div key={ord.orderNumber} className="py-2.5 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-['Poppins'] font-bold text-neutral-900 block">{ord.orderNumber.replace(/^#/, '')}</span>
                        <span className="text-neutral-500 text-[11px]">
                          {ord.customer.firstName} {ord.customer.lastName} ({ord.customer.city})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="font-['Poppins'] font-bold text-black block">{ord.total.toFixed(2)} KM</span>
                          <span className={`text-[10px] font-['Poppins'] font-bold uppercase px-1.5 py-0.5 inline-block ${
                            ord.status === 'Nova' ? 'bg-amber-100 text-amber-900' :
                            ord.status === 'Dostavljena' ? 'bg-emerald-100 text-emerald-900' :
                            'bg-neutral-100 text-neutral-800'
                          }`}>
                            {ord.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="font-['Poppins'] text-base font-black uppercase tracking-wider text-black">
                Upravljanje proizvodima ({products.length})
              </h2>
              <p className="text-xs text-neutral-500">
                Dodajte, uredite ili sakrijte artikle. Pratite statistiku otvaranja po proizvodu.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingProduct({
                  name: '',
                  price: 35,
                  originalPrice: undefined,
                  category: 'Majice',
                  color: 'Crna',
                  material: '100% češljani pamuk 240 GSM',
                  description: '',
                  careInstructions: 'Prati na 30°C izvrnuto',
                  images: ['/images/sarajevo_geo_tee.jpg'],
                  sizes: { S: 5, M: 8, L: 6, XL: 3, XXL: 0, '3XL': 0 },
                  isNew: true,
                  featured: false,
                  isHidden: false,
                });
                setIsModalOpen(true);
              }}
              className="px-4 py-2.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] text-xs font-['Poppins'] font-bold uppercase tracking-wider flex items-center gap-2 border-2 border-[#0A0A0A] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Dodaj novi artikal</span>
            </button>
          </div>

          <div className="bg-white border-2 border-neutral-200 overflow-x-auto shadow-sm">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#0A0A0A] text-white font-['Poppins'] font-bold uppercase">
                <tr>
                  <th className="p-3">Artikal</th>
                  <th className="p-3">Kategorija</th>
                  <th className="p-3">Pregledi 👁️</th>
                  <th className="p-3">Cijena (KM)</th>
                  <th className="p-3">Zalihe</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Akcije</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {products.map((p) => {
                  const totalStock = Object.values(p.sizes || {}).reduce((sum, v) => sum + (v || 0), 0);
                  const isSoldOut = totalStock <= 0;
                  const viewsCount = productViewsMap[p.id] || 0;

                  return (
                    <tr key={p.id} className={`hover:bg-neutral-50 ${p.isHidden ? 'opacity-50 bg-neutral-100' : ''}`}>
                      <td className="p-3 flex items-center gap-3">
                        <img
                          src={p.images[0] || '/images/sarajevo_geo_tee.jpg'}
                          alt={p.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/sarajevo_geo_tee.jpg';
                          }}
                          className="w-10 h-12 object-cover bg-neutral-100 border border-neutral-300 shrink-0"
                        />
                        <div>
                          <span className="font-['Poppins'] font-bold text-neutral-900 block">{p.name}</span>
                          <span className="text-[10px] text-neutral-500 font-mono">ID: {p.id}</span>
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-neutral-700">{p.category}</td>
                      <td className="p-3">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-neutral-100 border border-neutral-300 rounded font-['Poppins'] font-bold text-neutral-900 text-[11px]">
                          <Eye className="w-3.5 h-3.5 text-neutral-600" />
                          <span>{viewsCount} otvaranja</span>
                        </div>
                      </td>
                      <td className="p-3 font-['Poppins'] font-bold text-neutral-900">
                        {p.price.toFixed(2)} KM
                      </td>
                      <td className="p-3 font-mono">
                        <div className="flex flex-wrap gap-1 text-[10px]">
                          {availableSizesList.map((sz) => {
                            const stock = p.sizes?.[sz] ?? 0;
                            return (
                              <span
                                key={sz}
                                className={`px-1.5 py-0.5 border ${
                                  stock > 0
                                    ? 'bg-[#F4F2EC] text-neutral-900 border-neutral-300'
                                    : 'bg-neutral-200 text-[#9A9A9A] border-neutral-300'
                                }`}
                              >
                                {sz}: {stock}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1 items-start">
                          {isSoldOut && (
                            <span className="bg-[#9A9A9A] text-white text-[9px] font-['Poppins'] font-bold px-1.5 py-0.5">
                              RASPRODANO
                            </span>
                          )}
                          {p.isNew && (
                            <span className="bg-[#0A0A0A] text-[#F7E97F] text-[9px] font-['Poppins'] font-bold px-1.5 py-0.5">
                              NOVO
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingProduct(p);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            className="p-1.5 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 border-2 border-neutral-200">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-['Poppins'] font-bold uppercase text-neutral-500 mr-1">Status:</span>
              {['Sve', 'Nova', 'Potvrđena', 'Poslana', 'Dostavljena', 'Otkazana'].map((status) => (
                <button
                  key={status}
                  onClick={() => setOrderStatusFilter(status)}
                  className={`px-3 py-1 text-xs font-['Poppins'] font-bold uppercase tracking-wider transition-colors border cursor-pointer ${
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
                id="order-search-input"
                name="orderSearch"
                type="text"
                placeholder="Pretraži narudžbu ili kupca..."
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
                  const matchNum = o.orderNumber.toLowerCase().includes(s);
                  const matchName = `${o.customer.firstName} ${o.customer.lastName}`.toLowerCase().includes(s);
                  const matchCity = o.customer.city.toLowerCase().includes(s);
                  const matchTracking = o.trackingNumber?.toLowerCase().includes(s);
                  if (!matchNum && !matchName && !matchCity && !matchTracking) return false;
                }
                return true;
              })
              .map((order) => (
                <div key={order.orderNumber} className="bg-white border-2 border-neutral-200 p-5 space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-3 gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-['Poppins'] font-black text-sm text-black">
                        {order.orderNumber.replace(/^#/, '')}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {new Date(order.createdAt).toLocaleString('bs-BA')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <label htmlFor={`order-status-${order.id}`} className="text-[11px] font-['Poppins'] font-bold uppercase text-neutral-500">
                        Status:
                      </label>
                      <select
                        id={`order-status-${order.id}`}
                        name="orderStatus"
                        value={order.status}
                        onChange={(e) => handleUpdateStatus(order.id || '', e.target.value as OrderStatus)}
                        className={`text-xs font-['Poppins'] font-bold uppercase px-3 py-1 border-2 focus:outline-none cursor-pointer ${
                          order.status === 'Nova' ? 'bg-amber-50 text-amber-900 border-amber-400' :
                          order.status === 'Potvrđena' ? 'bg-blue-50 text-blue-900 border-blue-400' :
                          order.status === 'Poslana' ? 'bg-purple-50 text-purple-900 border-purple-400' :
                          order.status === 'Dostavljena' ? 'bg-emerald-50 text-emerald-900 border-emerald-400' :
                          'bg-red-50 text-red-900 border-red-400'
                        }`}
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
                        Podaci o kupcu i dostavi:
                      </span>
                      <p className="font-bold text-neutral-900">
                        {order.customer.firstName} {order.customer.lastName}
                      </p>
                      <p className="text-neutral-800">
                        📞 Mobitel: <strong>{order.customer.phone}</strong>
                      </p>
                      {order.customer.email && (
                        <p className="text-neutral-600">✉️ Email: {order.customer.email}</p>
                      )}
                      <p className="text-neutral-800">
                        📍 Adresa: {order.customer.address}, {order.customer.postalCode} {order.customer.city}
                      </p>
                      {order.trackingNumber && (
                        <div className="pt-2 border-t border-neutral-300 text-purple-900 font-semibold flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-purple-700 shrink-0" />
                          <span>
                            {order.courierName || 'X Express'} kod za praćenje: <strong className="font-mono">{order.trackingNumber}</strong>
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
                              {it.quantity}x <strong>{it.name}</strong> (Vel: {it.size})
                            </span>
                            <span className="font-['Poppins'] font-bold">{(it.price * it.quantity).toFixed(2)} KM</span>
                          </div>
                        ))}
                      </div>
                      {order.promoCode && (
                        <div className="pt-1 text-[11px] text-emerald-700 font-bold border-t border-neutral-200 flex justify-between">
                          <span>Iskorišten promo kod ({order.promoCode}):</span>
                          <span>-{order.discountAmount ? order.discountAmount.toFixed(2) : '0.00'} KM</span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-neutral-300 flex justify-between font-bold text-xs font-['Poppins']">
                        <span>Ukupno za plaćanje:</span>
                        <span className="font-black text-black text-sm">{order.total.toFixed(2)} KM</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* PROMO KODOVI TAB */}
      {activeTab === 'promo' && (
        <div className="space-y-6 animate-fadeIn max-w-5xl">
          <div>
            <h2 className="font-['Poppins'] text-base font-black uppercase tracking-wider text-black">
              Upravljanje i Odbrojavanje Promo Kodova
            </h2>
            <p className="text-xs text-neutral-600">
              Generišite nove kodove, ograničite broj upotreba i pratite točno odbrojavanje vremena do isteka.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-white border-2 border-neutral-300 shadow-sm font-['Poppins']">
              <span className="block text-2xl font-black text-black">{promoCodes.length}</span>
              <span className="text-xs text-neutral-500 uppercase font-bold">Ukupno Kodova</span>
            </div>
            <div className="p-4 bg-white border-2 border-emerald-500 shadow-sm font-['Poppins']">
              <span className="block text-2xl font-black text-emerald-600">
                {promoCodes.filter((c) => c.active !== false && !c.used).length}
              </span>
              <span className="text-xs text-emerald-700 uppercase font-bold">Aktivno / Dostupno</span>
            </div>
            <div className="p-4 bg-white border-2 border-amber-500 shadow-sm font-['Poppins']">
              <span className="block text-2xl font-black text-amber-600">
                {totalPromosUsedInOrders}
              </span>
              <span className="text-xs text-amber-700 uppercase font-bold">Ukupno Iskorišteno u Narudžbama</span>
            </div>
          </div>

          <form onSubmit={handleCreatePromo} className="bg-white p-6 border-2 border-neutral-300 space-y-4 shadow-sm">
            <h3 className="font-['Poppins'] text-xs font-black uppercase tracking-wider text-black">
              Kreiraj novi promo kod
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">Naziv Koda *</label>
                <input
                  type="text"
                  required
                  placeholder="npr. FIRST100"
                  value={newPromoCode}
                  onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                  className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs font-mono font-bold uppercase focus:border-black focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">Popust (%) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="100"
                  value={newPromoDiscount}
                  onChange={(e) => setNewPromoDiscount(Number(e.target.value))}
                  className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs font-mono font-bold focus:border-black focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">Max Narudžbi *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newPromoMaxUsage}
                  onChange={(e) => setNewPromoMaxUsage(Number(e.target.value))}
                  className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs font-mono font-bold focus:border-black focus:outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={promoLoading}
              className="px-6 py-2.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-wider transition-colors border-2 border-[#0A0A0A] cursor-pointer"
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
                  <th className="p-3">Limit Iskorištenosti</th>
                  <th className="p-3">Preostalo Vrijeme (Timer)</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Akcije</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {promoCodes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-neutral-500">Nema kreiranih promo kodova.</td>
                  </tr>
                ) : (
                  promoCodes.map((codeItem, idx) => {
                    const codeUpper = (codeItem.code || '').trim().toUpperCase();
                    const timesUsedInOrders = promoUsageCountMap[codeUpper] || codeItem.usageCount || 0;
                    const maxUsage = codeItem.maxUsage || 100;
                    const timer = codeItem.expiresAt ? getPromoRemainingTime(codeItem.expiresAt) : null;

                    return (
                      <tr key={idx} className="hover:bg-neutral-50">
                        <td className="p-3 font-mono font-bold text-black">{codeItem.code}</td>
                        <td className="p-3 font-['Poppins'] font-bold text-amber-700">-{codeItem.discountPercent || 10}%</td>
                        <td className="p-3">
                          <span className="font-mono font-bold text-neutral-800">
                            {timesUsedInOrders} / {maxUsage} narudžbi
                          </span>
                        </td>
                        <td className="p-3">
                          {timer ? (
                            <span className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 text-[11px] ${
                              timer.expired ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-900'
                            }`}>
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>{timer.formatted}</span>
                            </span>
                          ) : (
                            <span className="text-neutral-400">Bez limita</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-[10px] font-['Poppins'] font-bold uppercase ${
                            codeItem.active === false || timer?.expired ? 'bg-neutral-200 text-neutral-700' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {codeItem.active === false ? 'Ugašen' : timer?.expired ? 'Istekao' : 'Aktivan'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleTogglePromo(codeItem.code, codeItem.active ?? true)}
                              className={`px-2.5 py-1 text-[10px] font-['Poppins'] font-bold uppercase border flex items-center gap-1 cursor-pointer transition-colors ${
                                codeItem.active === false
                                  ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                                  : 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700'
                              }`}
                              title={codeItem.active === false ? 'Aktiviraj kod' : 'Deaktiviraj / Ugasi kod'}
                            >
                              <Power className="w-3 h-3" />
                              <span>{codeItem.active === false ? 'Aktiviraj' : 'Ugasi'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePromo(codeItem.code)}
                              className="p-1 text-red-600 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer"
                              title="Obriši kod"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBSCRIBERS TAB */}
      {activeTab === 'subscribers' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="font-['Poppins'] text-base font-black uppercase tracking-wider text-black">
                Newsletter pretplatnici ({subscribers.length})
              </h2>
            </div>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] text-xs font-['Poppins'] font-bold uppercase tracking-wider flex items-center gap-2 border-2 border-[#0A0A0A] transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Izvezi u CSV</span>
            </button>
          </div>

          <div className="bg-white border-2 border-neutral-200 overflow-hidden shadow-sm">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#0A0A0A] text-white font-['Poppins'] font-bold uppercase">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">E-mail adresa</th>
                  <th className="p-3">Datum prijave</th>
                  <th className="p-3">Saglasnost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {subscribers.map((sub, idx) => (
                  <tr key={sub.id || idx} className="hover:bg-neutral-50">
                    <td className="p-3 text-neutral-400 font-mono">{idx + 1}</td>
                    <td className="p-3 font-semibold text-neutral-900">{sub.email}</td>
                    <td className="p-3 text-neutral-600">
                      {new Date(sub.subscribedAt).toLocaleString('bs-BA')}
                    </td>
                    <td className="p-3 text-emerald-600 font-bold">Potvrđena</td>
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
          <div>
            <h2 className="font-['Poppins'] text-base font-black uppercase tracking-wider text-black">
              Postavke trgovine
            </h2>
          </div>

          {settingsSaved && (
            <div className="bg-white border-2 border-[#F7E97F] p-4 flex items-center gap-2 text-xs font-['Poppins'] font-bold text-black animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Postavke su uspješno spremljene!</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="bg-white p-6 sm:p-8 border-2 border-neutral-300 space-y-6 shadow-sm">
            <div className="space-y-4 border-b pb-6 border-neutral-200">
              <h3 className="font-['Poppins'] text-xs font-black uppercase tracking-wider text-black flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-[#0A0A0A]" />
                <span>Upravljanje prikazom kategorija</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F4F2EC] p-4 border border-neutral-300">
                {CATEGORIES.filter((c) => c !== 'Rasprodano').map((cat) => {
                  const isHidden = (storeSettings.hiddenCategories || []).includes(cat);
                  return (
                    <label key={cat} className="flex items-center gap-2 cursor-pointer text-xs font-['Poppins'] font-bold select-none">
                      <input
                        type="checkbox"
                        checked={isHidden}
                        onChange={(e) => {
                          const currentHidden = storeSettings.hiddenCategories || [];
                          const updated = e.target.checked
                            ? [...currentHidden, cat]
                            : currentHidden.filter((c) => c !== cat);
                          setStoreSettings({ ...storeSettings, hiddenCategories: updated });
                        }}
                        className="accent-black h-4 w-4 cursor-pointer"
                      />
                      <span className={isHidden ? 'text-red-600 line-through' : 'text-black'}>
                        {cat}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 border-b pb-6 border-neutral-200">
              <h3 className="font-['Poppins'] text-xs font-black uppercase tracking-wider text-black">
                1. Dostava i prag za besplatnu dostavu
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="settings-shipping-fee" className="block text-xs font-['Poppins'] font-bold uppercase text-neutral-700 mb-1">
                    Cijena dostave (KM) *
                  </label>
                  <input
                    id="settings-shipping-fee"
                    name="shippingFee"
                    type="number"
                    step="0.5"
                    required
                    value={storeSettings.shippingFee}
                    onChange={(e) => setStoreSettings({ ...storeSettings, shippingFee: Number(e.target.value) })}
                    className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs font-bold font-mono focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="settings-free-threshold" className="block text-xs font-['Poppins'] font-bold uppercase text-neutral-700 mb-1">
                    Prag za besplatnu dostavu (KM) *
                  </label>
                  <input
                    id="settings-free-threshold"
                    name="freeShippingThreshold"
                    type="number"
                    step="1"
                    required
                    value={storeSettings.freeShippingThreshold}
                    onChange={(e) => setStoreSettings({ ...storeSettings, freeShippingThreshold: Number(e.target.value) })}
                    className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs font-bold font-mono focus:border-black focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-wider flex items-center gap-2 border-2 border-[#0A0A0A] transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Spremi sve postavke</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DEV SETTINGS TAB */}
      {activeTab === 'dev-settings' && (
        <div className="animate-fadeIn">
          <DevSettings />
        </div>
      )}

      {/* TRACKING MODAL */}
      {trackingModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-6 border-2 border-[#F7E97F] shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-black" />
                <h3 className="font-['Poppins'] text-xs font-black uppercase text-black">
                  Označavanje narudžbe #{trackingModalOrder.orderNumber.replace(/^#/, '')} kao POSLANA
                </h3>
              </div>
              <button onClick={() => setTrackingModalOrder(null)} className="p-1 text-neutral-400 hover:text-black cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmTrackingAndSend} className="space-y-4 text-xs">
              <div className="bg-[#F4F2EC] p-3 border border-neutral-300 space-y-1">
                <p className="font-bold text-black font-['Poppins']">
                  Primalac: {trackingModalOrder.customer.firstName} {trackingModalOrder.customer.lastName}
                </p>
                <p className="text-neutral-600">Adresa: {trackingModalOrder.customer.address}, {trackingModalOrder.customer.city}</p>
              </div>

              <div>
                <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">Kurirska Služba:</label>
                <select
                  value={courierNameInput}
                  onChange={(e) => setCourierNameInput(e.target.value)}
                  className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs font-['Poppins'] font-bold focus:border-black focus:outline-none cursor-pointer"
                >
                  <option value="X Express">X Express Brza Pošta</option>
                  <option value="EuroExpress">EuroExpress</option>
                  <option value="BH Pošta">BH Pošta / Express Courier</option>
                  <option value="PostExpress">PostExpress</option>
                  <option value="Ostalo">Drugo / Lično</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">
                  Broj pošiljke (Tracking Number) <span className="text-neutral-400 font-normal">(Opcionalno)</span>
                </label>
                <input
                  type="text"
                  value={trackingNumberInput}
                  onChange={(e) => setTrackingNumberInput(e.target.value.toUpperCase())}
                  placeholder="npr. XE-987654321"
                  className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs font-mono font-bold uppercase focus:border-black focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setTrackingModalOrder(null)}
                  className="px-4 py-2 border border-neutral-300 text-xs font-['Poppins'] font-bold uppercase cursor-pointer"
                >
                  Odustani
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] border-2 border-[#0A0A0A] text-xs font-['Poppins'] font-bold uppercase cursor-pointer transition-colors"
                >
                  Potvrdi slanje
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRODUCT FORM MODAL */}
      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white max-w-2xl w-full p-6 sm:p-8 space-y-6 border-2 border-[#F7E97F] shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b-2 border-neutral-200 pb-4 sticky top-0 bg-white z-10">
              <h3 className="font-['Poppins'] text-base font-black uppercase tracking-wider text-black">
                {editingProduct.id ? 'Uredi artikal' : 'Dodaj novi artikal'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-500 hover:text-black p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProductSubmit} className="space-y-4 text-xs">
              <div>
                <label htmlFor="product-name-input" className="block font-['Poppins'] font-bold uppercase text-neutral-800 mb-1">
                  Naziv artikla *
                </label>
                <input
                  id="product-name-input"
                  name="productName"
                  type="text"
                  required
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full border-2 border-neutral-300 p-2.5 text-xs sm:text-sm focus:border-black focus:outline-none"
                  placeholder="npr. Majica 'SARAJEVO geographic' Box Logo"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                  <label htmlFor="product-price-input" className="block font-['Poppins'] font-bold uppercase text-neutral-800 mb-1">
                    Cijena (KM) *
                  </label>
                  <input
                    id="product-price-input"
                    name="price"
                    type="number"
                    step="0.5"
                    required
                    value={editingProduct.price || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="w-full border-2 border-neutral-300 p-2.5 text-xs sm:text-sm font-mono font-bold focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="product-orig-price-input" className="block font-['Poppins'] font-bold uppercase text-neutral-800 mb-1">
                    Stara cijena <span className="text-[10px] text-neutral-500 font-normal">(opciono)</span>
                  </label>
                  <input
                    id="product-orig-price-input"
                    name="originalPrice"
                    type="number"
                    step="0.5"
                    value={editingProduct.originalPrice || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, originalPrice: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="Za akciju"
                    className="w-full border-2 border-neutral-300 p-2.5 text-xs sm:text-sm font-mono focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="product-category-select" className="block font-['Poppins'] font-bold uppercase text-neutral-800 mb-1">
                    Kategorija *
                  </label>
                  <select
                    id="product-category-select"
                    name="category"
                    value={editingProduct.category || 'Majice'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value as any })}
                    className="w-full border-2 border-neutral-300 p-2.5 text-xs sm:text-sm font-['Poppins'] font-bold focus:border-black focus:outline-none cursor-pointer"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="product-color-input" className="block font-['Poppins'] font-bold uppercase text-neutral-800 mb-1">
                    Boja artikla *
                  </label>
                  <input
                    id="product-color-input"
                    name="color"
                    type="text"
                    required
                    value={editingProduct.color || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, color: e.target.value })}
                    placeholder="npr. Crna, Bijela, Maslinasto zelena..."
                    className="w-full border-2 border-neutral-300 p-2.5 text-xs focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="product-material-input" className="block font-['Poppins'] font-bold uppercase text-neutral-800 mb-1">
                    Materijal i gramatura *
                  </label>
                  <input
                    id="product-material-input"
                    name="material"
                    type="text"
                    required
                    value={editingProduct.material || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, material: e.target.value })}
                    placeholder="npr. 100% češljani pamuk 240 GSM"
                    className="w-full border-2 border-neutral-300 p-2.5 text-xs focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="product-desc-textarea" className="block font-['Poppins'] font-bold uppercase text-neutral-800 mb-1">
                  Opis artikla
                </label>
                <textarea
                  id="product-desc-textarea"
                  name="description"
                  rows={3}
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full border-2 border-neutral-300 p-2.5 text-xs focus:border-black focus:outline-none font-['Inter']"
                  placeholder="Urbani kroj, visoki kvalitet štampe..."
                />
              </div>

              <div>
                <label htmlFor="product-care-input" className="block font-['Poppins'] font-bold uppercase text-neutral-800 mb-1">
                  Upute za njegu
                </label>
                <input
                  id="product-care-input"
                  name="careInstructions"
                  type="text"
                  value={editingProduct.careInstructions || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, careInstructions: e.target.value })}
                  placeholder="npr. Prati na 30°C izvrnuto, ne peglati preko štampe"
                  className="w-full border-2 border-neutral-300 p-2.5 text-xs focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-2 bg-[#F4F2EC] p-4 border-2 border-neutral-300">
                <label className="block font-['Poppins'] font-black uppercase text-black">
                  Zalihe po veličinama (komada na stanju):
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {availableSizesList.map((sz) => (
                    <div key={sz}>
                      <label htmlFor={`stock-size-${sz}`} className="block font-['Poppins'] font-bold text-center mb-1 text-[11px]">{sz}</label>
                      <input
                        id={`stock-size-${sz}`}
                        name={`stockSize_${sz}`}
                        type="number"
                        min="0"
                        value={editingProduct.sizes?.[sz] ?? 0}
                        onChange={(e) => {
                          const currentSizes = { ...(editingProduct.sizes || {}) };
                          currentSizes[sz] = Math.max(0, parseInt(e.target.value) || 0);
                          setEditingProduct({ ...editingProduct, sizes: currentSizes });
                        }}
                        className="w-full border border-neutral-300 p-1.5 text-center font-mono text-xs focus:border-black focus:outline-none bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 border-2 border-neutral-300 p-4 bg-white">
                <label className="block font-['Poppins'] font-bold uppercase text-neutral-800">
                  Galerija slika:
                </label>

                <div className="mb-3">
                  <label className="inline-block px-4 py-2 bg-[#F7E97F] text-[#0A0A0A] font-bold text-xs uppercase cursor-pointer border border-[#0A0A0A] shadow-sm hover:bg-yellow-300 transition-colors">
                    {uploading ? 'Učitavanje...' : 'Učitaj slike sa uređaja'}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFiles}
                      disabled={uploading}
                    />
                  </label>
                </div>

                {editingProduct.images && editingProduct.images.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {editingProduct.images.map((img, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-[#F4F2EC] border border-neutral-300">
                        <img src={img} alt="preview" className="w-10 h-10 object-cover border border-neutral-300 shrink-0" />
                        <span className="text-[11px] truncate flex-1 font-mono">{img}</span>
                        {idx === 0 && (
                          <span className="bg-[#0A0A0A] text-[#F7E97F] text-[9px] font-['Poppins'] font-bold px-1.5 py-0.5">
                            GLAVNA
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveImage(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 hover:bg-neutral-300 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveImage(idx, 'down')}
                            disabled={idx === (editingProduct.images?.length || 1) - 1}
                            className="p-1 hover:bg-neutral-300 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="p-1 text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <input
                    id="new-image-url-input"
                    name="newImageUrl"
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="Ili unesite URL slike ručno..."
                    className="flex-1 border border-neutral-300 p-2 text-xs focus:border-black focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addImage}
                    className="px-4 py-2 bg-[#0A0A0A] text-[#ffffff] hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-bold uppercase cursor-pointer"
                  >
                    Dodaj URL
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-6 pt-2 bg-[#F4F2EC] p-3 border border-neutral-300">
                <label className="flex items-center gap-2 cursor-pointer font-['Poppins'] font-bold">
                  <input
                    id="product-is-new"
                    name="isNew"
                    type="checkbox"
                    checked={editingProduct.isNew ?? true}
                    onChange={(e) => setEditingProduct({ ...editingProduct, isNew: e.target.checked })}
                    className="accent-black cursor-pointer"
                  />
                  <span>Oznaka "NOVO"</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-['Poppins'] font-bold">
                  <input
                    id="product-is-featured"
                    name="featured"
                    type="checkbox"
                    checked={editingProduct.featured ?? false}
                    onChange={(e) => setEditingProduct({ ...editingProduct, featured: e.target.checked })}
                    className="accent-black cursor-pointer"
                  />
                  <span>Istaknuto</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-['Poppins'] font-bold text-red-700">
                  <input
                    id="product-is-hidden"
                    name="isHidden"
                    type="checkbox"
                    checked={editingProduct.isHidden ?? false}
                    onChange={(e) => setEditingProduct({ ...editingProduct, isHidden: e.target.checked })}
                    className="accent-red-600 cursor-pointer"
                  />
                  <span>Sakriven iz ponude</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t-2 border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border-2 border-neutral-300 font-['Poppins'] font-bold uppercase text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                >
                  Odustani
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] font-bold uppercase flex items-center gap-2 border-2 border-[#0A0A0A] transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Spremi artikal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
