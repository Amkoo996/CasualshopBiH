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
  RefreshCw,
  Eye,
  CheckCircle2,
  Mail,
  ArrowRight,
  MessageCircle,
  FileText,
  Palette,
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
import { useCart } from '../context/CartContext';
import { SalesTrendChart } from '../components/admin/SalesTrendChart';
import { FunnelAnalytics } from '../components/admin/FunnelAnalytics';
import { AbandonedCartsPromo } from '../components/admin/AbandonedCartsPromo';
import { TrafficAndCartStatsTable } from '../components/admin/TrafficAndCartStatsTable';
import { generateOrderInvoicePDF, getWhatsAppConfirmationUrl } from '../lib/pdfInvoice';
import DevSettings from '../components/admin/DevSettings';

export const AdminDashboard: React.FC = () => {
  const { user, isAdmin, loginWithEmail, signOut } = useAuth();
  const { refreshSettings } = useCart();

  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'leads' | 'products' | 'orders' | 'subscribers' | 'settings' | 'dev-settings'>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [productViewsMap, setProductViewsMap] = useState<Record<string, number>>({});
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [settingsSaved, setSettingsSaved] = useState(false);

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

  // Svi podržani nazivi veličina za formu
  const availableSizesList: Size[] = ['S', 'M', 'L', 'XL', 'XXL', '3XL', 'One size'];

  // Load admin data
  const loadData = async () => {
    setLoading(true);
    try {
      const [prodsData, ordersData, subsData, settingsData, viewsData] = await Promise.all([
        getProducts(true),
        getOrders().catch(() => []),
        getSubscribers().catch(() => []),
        getStoreSettings().catch(() => DEFAULT_STORE_SETTINGS),
        getProductViewStats().catch(() => ({})),
      ]);
      setProducts(prodsData);
      setOrders(ordersData);
      setSubscribers(subsData);
      setStoreSettings(settingsData);
      setProductViewsMap(viewsData);
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
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

  // UPLOAD IMAGE HANDLER (Cloudinary)
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

  // LOGIN SCREEN
  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white border-2 border-[#F7E97F] p-8 shadow-2xl space-y-6 text-center">
          <div className="w-14 h-14 bg-[#0A0A0A] text-[#F7E97F] border-2 border-[#F7E97F] flex items-center justify-center mx-auto rounded-full">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="font-['Poppins'] text-xl font-black uppercase tracking-wider text-black">
              ADMIN PRIJAVA
            </h2>
            <p className="text-xs text-neutral-600 font-['Inter']">
              Casual Shop BiH kontrolna tabla za upravljanje artiklima, narudžbama i postavkama.
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-['Inter'] text-left rounded">
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
                className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs font-['Inter'] focus:border-black focus:outline-none"
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
                className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs font-['Inter'] focus:border-black focus:outline-none"
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
                <span className="text-xs text-neutral-600 font-['Inter']">Zapamti me na ovom uređaju</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-wider transition-colors border-2 border-[#0A0A0A] disabled:opacity-50"
            >
              {loginLoading ? 'Prijavljivanje...' : 'Prijavi se'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // CALCULATE METRICS
  const totalRevenue = orders.reduce((sum, ord) => sum + (ord.status !== 'Otkazana' ? ord.total : 0), 0);
  const totalOrdersCount = orders.length;
  const newOrdersCount = orders.filter((o) => o.status === 'Nova').length;
  const subscribersCount = subscribers.length;

  // Best selling products calculation
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

  // SAVE PRODUCT
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
          'Plaćanje pouzećem širom BiH',
        ],
        images: editingProduct.images && editingProduct.images.length > 0
          ? editingProduct.images
          : ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80'],
        sizes: editingProduct.sizes || { S: 5, M: 8, L: 6, XL: 3 },
        isNew: editingProduct.isNew ?? true,
        featured: editingProduct.featured ?? false,
        isHidden: editingProduct.isHidden ?? false,
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

  // DELETE PRODUCT
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

  // SAVE STORE SETTINGS
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

  const handleSyncAuthenticProducts = async () => {
    try {
      await loadData();
      alert('Uspješno sinhronizovano!');
    } catch {
      alert('Greška pri sinhronizaciji artikala.');
    }
  };

  // UPDATE ORDER STATUS (Sa automatskim vraćanjem na stock ako se otkaže)
  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const targetOrder = orders.find((o) => o.id === orderId);
      await updateOrderStatus(orderId, status);

      // Ako se narudžba otkaže, automatski vraćamo zalihe
      if (status === 'Otkazana' && targetOrder && targetOrder.status !== 'Otkazana') {
        for (const item of targetOrder.items) {
          const prod = products.find((p) => p.id === item.id);
          if (prod) {
            const currentStock = prod.sizes[item.size] ?? 0;
            const updatedSizes = { ...prod.sizes, [item.size]: currentStock + item.quantity };
            await saveProduct({ id: prod.id, sizes: updatedSizes } as any);
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

  // EXPORT CSV
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

  // IMAGE REORDER HELPERS
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
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
          <p className="text-xs text-neutral-600 font-['Inter']">
            Prijavljeni admin: {user?.email || 'Administrator'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="px-3.5 py-2 bg-white border-2 border-neutral-300 text-xs font-['Poppins'] font-bold uppercase tracking-wider hover:bg-neutral-100 text-neutral-800"
          >
            Osvježi
          </button>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-['Poppins'] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
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
          { id: 'analytics', label: 'Posjete & Funnel', icon: Eye },
          { id: 'leads', label: 'Napuštene korpe & Promocije', icon: Mail },
          { id: 'products', label: `Proizvodi (${products.length})`, icon: Package },
          { id: 'orders', label: `Narudžbe (${orders.length})`, icon: ShoppingBag },
          { id: 'subscribers', label: `Newsletter (${subscribers.length})`, icon: Users },
          { id: 'settings', label: 'Postavke Trgovine', icon: Settings },
          { id: 'dev-settings', label: 'Dev Settings & Tema', icon: Palette },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 font-['Poppins'] font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-colors ${
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
              <div className="font-[#Poppins] text-2xl sm:text-3xl font-black text-black">
                {totalRevenue.toFixed(2)} KM
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold block font-['Inter']">
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
              <span className="text-[11px] text-neutral-600 font-medium block font-['Inter']">
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
              <span className="text-[11px] text-neutral-600 font-medium block font-['Inter']">
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
              <span className="text-[11px] text-neutral-600 font-medium block font-['Inter']">
                Prijavljenih korisnika
              </span>
            </div>
          </div>

          <SalesTrendChart orders={orders} />
          <TrafficAndCartStatsTable orders={orders} />

          <div className="bg-[#0A0A0A] text-white p-5 border-2 border-[#F7E97F] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-[#F7E97F] text-[#0A0A0A] text-[9px] font-['Poppins'] font-black uppercase px-2 py-0.5 border border-[#F7E97F]">
                  ANALITIKA POSJETILACA
                </span>
                <span className="text-xs text-neutral-400">Praćenje u Firestore kolekciji 'analytics_events'</span>
              </div>
              <h4 className="font-['Poppins'] text-base font-bold text-white">
                Praćenje jedinstvenih posjetilaca & akcija 'dodaj u korpu'
              </h4>
              <p className="text-xs text-neutral-300 font-['Inter']">
                Provjerite koliko je posjetilaca pregledalo shop, ko je dodao artikal u korpu i pošaljite im popust prije nego napuste stranicu.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('analytics')}
              className="px-4 py-2.5 bg-[#F7E97F] hover:bg-yellow-300 text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-wider transition-colors shrink-0 flex items-center gap-2 border border-[#0A0A0A] cursor-pointer"
            >
              <span>Otvori detaljnu analitiku</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 border-2 border-neutral-200 space-y-4">
              <h3 className="font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] text-black">
                Najprodavaniji artikli
              </h3>
              {bestSellers.length === 0 ? (
                <p className="text-xs text-neutral-500 py-4 font-['Inter']">Još nema realizovanih prodaja.</p>
              ) : (
                <div className="divide-y divide-neutral-100 font-['Inter']">
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
                  className="text-[11px] font-['Poppins'] font-bold text-neutral-700 hover:text-black uppercase underline"
                >
                  Vidi sve
                </button>
              </div>

              {orders.length === 0 ? (
                <p className="text-xs text-neutral-500 py-4 font-['Inter']">Nema pristiglih narudžbi.</p>
              ) : (
                <div className="divide-y divide-neutral-100 font-['Inter']">
                  {orders.slice(0, 5).map((ord) => (
                    <div key={ord.orderNumber} className="py-2.5 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-['Poppins'] font-bold text-neutral-900 block">{ord.orderNumber}</span>
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
                        <div className="flex items-center gap-1 pl-1">
                          <a
                            href={getWhatsAppConfirmationUrl(ord)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-[#25D366] hover:bg-emerald-600 text-white transition-colors border border-emerald-700"
                            title="Pošalji potvrdu putem WhatsAppa"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => generateOrderInvoicePDF(ord, storeSettings)}
                            className="p-1.5 bg-[#0A0A0A] hover:bg-[#F7E97F] hover:text-[#0A0A0A] text-white transition-colors border border-black cursor-pointer"
                            title="Preuzmi PDF fakturu"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
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

      {/* PRODUCTS TAB (Sa brojačem pregleda po artiklima) */}
      {activeTab === 'products' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="font-['Poppins'] text-base font-black uppercase tracking-wider text-black">
                Upravljanje proizvodima ({products.length})
              </h2>
              <p className="text-xs text-neutral-500 font-['Inter']">
                Dodajte, uredite ili sakrijte artikle. Pratite statistiku otvaranja po proizvodu u realnom vremenu.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSyncAuthenticProducts}
                className="px-3.5 py-2.5 bg-[#F7E97F] text-[#0A0A0A] border-2 border-[#0A0A0A] hover:bg-yellow-300 text-xs font-['Poppins'] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-colors"
                title="Sinhronizuj originalne majice i slike brenda"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sinhronizuj autentične artikle i slike</span>
              </button>

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
                    images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80'],
                    sizes: { S: 5, M: 8, L: 6, XL: 3, XXL: 0, '3XL': 0 },
                    isNew: true,
                    featured: false,
                    isHidden: false,
                  });
                  setIsModalOpen(true);
                }}
                className="px-4 py-2.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] text-xs font-['Poppins'] font-bold uppercase tracking-wider flex items-center gap-2 border-2 border-[#0A0A0A] transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Dodaj novi artikal</span>
              </button>
            </div>
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
              <tbody className="divide-y divide-neutral-200 font-['Inter']">
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
                        {p.originalPrice && (
                          <span className="text-[10px] text-neutral-400 line-through block font-normal">
                            {p.originalPrice.toFixed(2)} KM
                          </span>
                        )}
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
                        <span className="text-[10px] text-neutral-400 mt-0.5 block">
                          Ukupno: {totalStock} kom
                        </span>
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
                          {p.featured && (
                            <span className="bg-[#F7E97F] text-[#0A0A0A] text-[9px] font-['Poppins'] font-bold px-1.5 py-0.5">
                              ISTAKNUTO
                            </span>
                          )}
                          {p.isHidden && (
                            <span className="bg-red-100 text-red-800 text-[9px] font-['Poppins'] font-bold px-1.5 py-0.5">
                              SAKRIVEN
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
                            className="p-1.5 hover:bg-neutral-200 text-neutral-700 transition-colors"
                            title="Uredi artikal"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            className="p-1.5 hover:bg-red-100 text-red-600 transition-colors"
                            title="Obriši artikal"
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
                  className={`px-3 py-1 text-xs font-['Poppins'] font-bold uppercase tracking-wider transition-colors border ${
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
                  if (!matchNum && !matchName && !matchCity) return false;
                }
                return true;
              })
              .map((order) => (
                <div key={order.orderNumber} className="bg-white border-2 border-neutral-200 p-5 space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-3 gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-['Poppins'] font-black text-sm text-black">
                        #{order.orderNumber}
                      </span>
                      <span className="text-xs text-neutral-500 font-['Inter']">
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
                        className={`text-xs font-['Poppins'] font-bold uppercase px-3 py-1 border-2 focus:outline-none ${
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-['Inter']">
                    <div className="space-y-1.5 bg-[#F4F2EC] p-3.5 border border-neutral-300">
                      <span className="font-['Poppins'] font-bold uppercase text-neutral-700 block">
                        Podaci o kupcu za dostavu:
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
                      {order.customer.note && (
                        <p className="text-neutral-600 italic pt-1">
                          Napomena kupca: "{order.customer.note}"
                        </p>
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
                      <div className="pt-2 border-t border-neutral-300 flex justify-between font-bold text-xs font-['Poppins']">
                        <span>Ukupno za plaćanje pouzećem:</span>
                        <span className="font-black text-black text-sm">{order.total.toFixed(2)} KM</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[11px] text-neutral-500 font-['Inter']">
                      Plaćanje pouzećem • Kurirska dostava širom BiH
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={getWhatsAppConfirmationUrl(order)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 bg-[#25D366] hover:bg-[#1faa4f] text-white font-['Poppins'] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-colors border border-emerald-700 active:scale-95"
                        title="Otvori WhatsApp sa pripremljenom porukom za kupca"
                      >
                        <MessageCircle className="w-4 h-4 fill-white text-[#25D366]" />
                        <span>Pošalji potvrdu putem WhatsAppa</span>
                      </a>

                      <button
                        onClick={() => generateOrderInvoicePDF(order, storeSettings)}
                        className="px-3.5 py-2 bg-[#0A0A0A] hover:bg-[#F7E97F] hover:text-[#0A0A0A] text-white font-['Poppins'] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-colors border-2 border-[#0A0A0A] active:scale-95 cursor-pointer"
                        title="Preuzmi profesionalni PDF račun za štampanje i arhivu"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Preuzmi PDF fakturu</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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
              <p className="text-xs text-neutral-600 font-['Inter']">
                Korisnici koji su dali saglasnost za obavijesti brenda Casual Shop BiH.
              </p>
            </div>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] text-xs font-['Poppins'] font-bold uppercase tracking-wider flex items-center gap-2 border-2 border-[#0A0A0A] transition-colors"
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
              <tbody className="divide-y divide-neutral-200 font-['Inter']">
                {subscribers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-neutral-500">
                      Još nema prijavljenih pretplatnika na newsletter.
                    </td>
                  </tr>
                ) : (
                  subscribers.map((sub, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50">
                      <td className="p-3 text-neutral-400 font-mono">{idx + 1}</td>
                      <td className="p-3 font-semibold text-neutral-900">{sub.email}</td>
                      <td className="p-3 text-neutral-600">
                        {new Date(sub.subscribedAt).toLocaleString('bs-BA')}
                      </td>
                      <td className="p-3 text-emerald-600 font-bold">Potvrđena</td>
                    </tr>
                  ))
                )}
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
            <p className="text-xs text-neutral-600 font-['Inter']">
              Prilagodite troškove dostave, kontakte, pravne podatke o firmi i tekstove na sajtu.
            </p>
          </div>

          {settingsSaved && (
            <div className="bg-white border-2 border-[#F7E97F] p-4 flex items-center gap-2 text-xs font-['Poppins'] font-bold text-black animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Postavke su uspješno spremljene u Firestore bazu!</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="bg-white p-6 sm:p-8 border-2 border-neutral-300 space-y-6 shadow-sm">
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

              <div>
                <label htmlFor="settings-topbar-text" className="block text-xs font-['Poppins'] font-bold uppercase text-neutral-700 mb-1">
                  Tekst trake iznad headera *
                </label>
                <input
                  id="settings-topbar-text"
                  name="topBarText"
                  type="text"
                  required
                  value={storeSettings.topBarText}
                  onChange={(e) => setStoreSettings({ ...storeSettings, topBarText: e.target.value })}
                  placeholder="Plaćanje pouzećem • Brza pošta 12 KM • Moguće otvaranje paketa prije preuzimanja"
                  className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs font-bold focus:border-black focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-4 border-b pb-6 border-neutral-200">
              <h3 className="font-['Poppins'] text-xs font-black uppercase tracking-wider text-black">
                2. Kontakt podaci
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="settings-email" className="block text-xs font-['Poppins'] font-bold uppercase text-neutral-700 mb-1">
                    E-mail adresa
                  </label>
                  <input
                    id="settings-email"
                    name="email"
                    type="email"
                    value={storeSettings.email}
                    onChange={(e) => setStoreSettings({ ...storeSettings, email: e.target.value })}
                    className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="settings-instagram" className="block text-xs font-['Poppins'] font-bold uppercase text-neutral-700 mb-1">
                    Instagram profil URL
                  </label>
                  <input
                    id="settings-instagram"
                    name="instagramUrl"
                    type="url"
                    value={storeSettings.instagramUrl}
                    onChange={(e) => setStoreSettings({ ...storeSettings, instagramUrl: e.target.value })}
                    className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs focus:border-black focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-wider flex items-center gap-2 border-2 border-[#0A0A0A] transition-colors"
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

      {/* PRODUCT FORM MODAL (Sa svim veličinama) */}
      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white max-w-2xl w-full p-6 sm:p-8 space-y-6 border-2 border-[#F7E97F] shadow-2xl relative my-8">
            <div className="flex justify-between items-center border-b-2 border-neutral-200 pb-4">
              <h3 className="font-['Poppins'] text-base font-black uppercase tracking-wider text-black">
                {editingProduct.id ? 'Uredi artikal' : 'Dodaj novi artikal'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-500 hover:text-black p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProductSubmit} className="space-y-4 text-xs font-['Inter']">
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
                  placeholder="npr. Majica 'SARAJEVO geographic'"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    Stara cijena (KM)
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
                    className="w-full border-2 border-neutral-300 p-2.5 text-xs sm:text-sm font-['Poppins'] font-bold focus:border-black focus:outline-none"
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

              {/* ZALIHE PO VELIČINAMA */}
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

              {/* UPLOAD SLIKA */}
              <div className="space-y-2 border-2 border-neutral-300 p-4 bg-white">
                <label className="block font-['Poppins'] font-bold uppercase text-neutral-800">
                  Galerija slika (Prva slika je glavna za prikaz):
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
                            className="p-1 hover:bg-neutral-300 disabled:opacity-30"
                            title="Pomjeri gore"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveImage(idx, 'down')}
                            disabled={idx === (editingProduct.images?.length || 1) - 1}
                            className="p-1 hover:bg-neutral-300 disabled:opacity-30"
                            title="Pomjeri dolje"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="p-1 text-red-600 hover:bg-red-50"
                            title="Ukloni sliku"
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
                    className="px-4 py-2 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-bold uppercase"
                  >
                    Dodaj URL
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="product-desc-textarea" className="block font-['Poppins'] font-bold uppercase text-neutral-800 mb-1">
                  Opis artikla
                </label>
                <textarea
                  id="product-desc-textarea"
                  name="description"
                  rows={2}
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full border-2 border-neutral-300 p-2.5 text-xs focus:border-black focus:outline-none"
                  placeholder="Streetwear kroj, grafika, detalji..."
                />
              </div>

              <div className="flex flex-wrap gap-6 pt-2 bg-[#F4F2EC] p-3 border border-neutral-300">
                <label className="flex items-center gap-2 cursor-pointer font-['Poppins'] font-bold">
                  <input
                    id="product-is-new"
                    name="isNew"
                    type="checkbox"
                    checked={editingProduct.isNew ?? true}
                    onChange={(e) => setEditingProduct({ ...editingProduct, isNew: e.target.checked })}
                    className="accent-black"
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
                    className="accent-black"
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
                    className="accent-red-600"
                  />
                  <span>Sakriven iz ponude</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t-2 border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border-2 border-neutral-300 font-['Poppins'] font-bold uppercase text-neutral-700 hover:bg-neutral-100"
                >
                  Odustani
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] font-bold uppercase flex items-center gap-2 border-2 border-[#0A0A0A] transition-colors"
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
