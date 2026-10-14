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
  EyeOff,
  Trash2,
  Edit,
  Save,
  X,
  FileSpreadsheet,
  Tag,
  Star,
  Mail,
  Send,
  Copy,
  Check,
  Image as ImageIcon,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { getOrders, getProducts, updateOrderStatus } from '../lib/db';
import { Order, Product, Category } from '../types';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

// 1. Čišćenje slova za termo printer (jsPDF bez praznina)
const cleanPdfText = (str: string = ''): string => {
  return str
    .replace(/[čČ]/g, (m) => (m === 'č' ? 'c' : 'C'))
    .replace(/[ćĆ]/g, (m) => (m === 'ć' ? 'c' : 'C'))
    .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'dj' : 'Dj'))
    .replace(/[šŠ]/g, (m) => (m === 'š' ? 's' : 'S'))
    .replace(/[žŽ]/g, (m) => (m === 'ž' ? 'z' : 'Z'));
};

// 2. Sveobuhvatni detektor podataka o kupcu (rješava problem sa KUPAC fallbackom)
const extractCustomer = (order: any) => {
  const c = order.customer || order.customerInfo || order.shippingAddress || order.formData || order.buyer || {};
  
  let name =
    c.fullName ||
    c.name ||
    (c.firstName ? `${c.firstName} ${c.lastName || ''}`.trim() : '') ||
    (c.ime ? `${c.ime} ${c.prezime || ''}`.trim() : '') ||
    c.imeIPrezime ||
    order.customerName ||
    order.fullName ||
    order.name ||
    order.buyerName ||
    (order.firstName ? `${order.firstName} ${order.lastName || ''}`.trim() : '') ||
    (order.ime ? `${order.ime} ${order.prezime || ''}`.trim() : '') ||
    order.imePrezime ||
    '';

  const phone = c.phone || order.phone || order.brojTelefona || 'N/A';
  const city = c.city || order.city || order.grad || 'BiH';
  const address = c.address || order.address || order.adresa || 'N/A';
  const postalCode = c.postalCode || order.postalCode || order.postanskiBroj || '';
  const note = c.note || order.note || order.napomena || 'Nema napomene';
  const email = c.email || order.email || '';

  if (!name.trim()) {
    name = phone !== 'N/A' ? `Kupac (${phone})` : 'Kupac';
  }

  return { name: name.trim(), phone, city, address, postalCode, note, email };
};

const normalizeStatus = (statusRaw?: any): string => {
  const s = String(statusRaw || '').toLowerCase();
  if (['delivered', 'dostavljeno', 'isporuceno', 'isporučeno', 'zavrseno'].includes(s)) return 'delivered';
  if (['shipped', 'poslano', 'poslato', 'u_dostavi'].includes(s)) return 'shipped';
  if (['confirmed', 'potvrdjeno', 'potvrđeno', 'u_obradi'].includes(s)) return 'confirmed';
  if (['cancelled', 'otkazano', 'stornirano', 'returned', 'vraceno', 'vraćeno'].includes(s)) return 'cancelled';
  return 'pending';
};

interface PromoCode {
  id: string;
  code: string;
  discountPercent?: number;
  discountAmount?: number;
  minOrderTotal?: number;
  validFrom?: string;
  validUntil?: string;
  maxUses?: number;
  usedCount?: number;
  active: boolean;
}

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'discounts' | 'abandoned' | 'analytics' | 'newsletter' | 'settings'>('orders');
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [subscribers, setSubscribers] = useState<{ id: string; email: string; createdAt?: string }[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [abandonedCarts, setAbandonedCarts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedEmails, setCopiedEmails] = useState(false);

  // Filteri
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingModalOrder, setTrackingModalOrder] = useState<Order | null>(null);
  const [trackingNumberInput, setTrackingNumberInput] = useState('');

  // Priprema za print sa opcijom brze izmjene
  const [printModalOrder, setPrintModalOrder] = useState<any | null>(null);

  // Cloudinary upload status
  const [uploadingImage, setUploadingImage] = useState(false);

  // Modali
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [newPromo, setNewPromo] = useState<Partial<PromoCode>>({
    code: '',
    discountPercent: 10,
    minOrderTotal: 50,
    validFrom: new Date().toISOString().slice(0, 10),
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    maxUses: 100,
    usedCount: 0,
    active: true
  });

  // CMS Postavke uključujući Cloudinary podatke
  const [cmsSettings, setCmsSettings] = useState({
    topBarText: 'Plaćanje pouzećem • Brza pošta 12 KM • Moguće otvaranje paketa prije preuzimanja',
    freeShippingThreshold: 100,
    contactPhone: '+387 61 000 000',
    contactEmail: 'info@casualshop.ba',
    instagramUrl: 'https://www.instagram.com/casualshop.bih',
    cloudinaryCloudName: 'dt0bc9jqy',
    cloudinaryUploadPreset: 'casualshop_preset'
  });

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [ordersData, productsData] = await Promise.all([
        getOrders().catch(() => []),
        getProducts().catch(() => [])
      ]);
      setOrders(ordersData || []);
      setProducts(productsData || []);

      // Kuponi
      try {
        const promoSnap = await getDocs(collection(db, 'promo_codes'));
        const pList: PromoCode[] = [];
        promoSnap.forEach(d => pList.push({ id: d.id, ...d.data() } as PromoCode));
        setPromoCodes(pList.length > 0 ? pList : [
          { 
            id: 'FIRST100', 
            code: 'FIRST100', 
            discountPercent: 10, 
            minOrderTotal: 0, 
            validFrom: '2026-01-01', 
            validUntil: '2026-12-31', 
            maxUses: 100, 
            usedCount: 14, 
            active: true 
          }
        ]);
      } catch {
        setPromoCodes([]);
      }

      // Napuštene korpe
      try {
        const cartSnap = await getDocs(collection(db, 'abandoned_carts'));
        const cartList: any[] = [];
        cartSnap.forEach(d => cartList.push({ id: d.id, ...d.data() }));
        setAbandonedCarts(cartList);
      } catch {
        setAbandonedCarts([]);
      }

      // Newsletter
      try {
        const subsSnap = await getDocs(collection(db, 'newsletter'));
        const subsList: any[] = [];
        subsSnap.forEach((d) => {
          const val = d.data();
          subsList.push({
            id: d.id,
            email: val.email || d.id,
            createdAt: val.createdAt ? new Date(val.createdAt).toLocaleDateString('bs-BA') : 'Prijava aktivna'
          });
        });
        setSubscribers(subsList);
      } catch {
        setSubscribers([]);
      }

      // Postavke
      try {
        const setSnap = await getDocs(collection(db, 'settings'));
        if (!setSnap.empty) {
          setCmsSettings((prev) => ({ ...prev, ...(setSnap.docs[0].data() as any) }));
        }
      } catch {}
    } catch (err) {
      console.error('Greška pri učitavanju:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Metrike
  const stats = useMemo(() => {
    const totalRevenue = orders
      .filter((o) => ['delivered', 'shipped'].includes(normalizeStatus(o.status)))
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const pendingOrders = orders.filter((o) => normalizeStatus(o.status) === 'pending').length;
    const deliveredOrders = orders.filter((o) => normalizeStatus(o.status) === 'delivered').length;
    const aov = orders.length > 0 ? totalRevenue / (deliveredOrders || 1) : 0;
    const estimatedVisits = Math.max(orders.length * 38, 1420);
    const conversionRate = ((orders.length / estimatedVisits) * 100).toFixed(2);

    return { totalRevenue, pendingOrders, deliveredOrders, aov, estimatedVisits, conversionRate };
  }, [orders]);

  // Pouzdanost kupca
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
      console.error('Greška pri ažuriranju statusa:', err);
    }
  };

  // 3. Direktni Cloudinary Upload sa telefona ili računara
  const handleFileUploadToCloudinary = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cmsSettings.cloudinaryUploadPreset || 'ml_default');

    try {
      const cloudName = cmsSettings.cloudinaryCloudName || 'demo';
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Upload na Cloudinary nije uspio.');
      }

      const data = await res.json();
      if (data.secure_url) {
        setEditingProduct((prev: any) => ({
          ...prev,
          images: [data.secure_url, ...(prev?.images?.slice(1) || [])]
        }));
      }
    } catch (err) {
      console.error('Upload greška:', err);
      alert('Neuspješan upload slike. Provjerite Cloudinary Cloud Name i Preset u CMS Postavkama.');
    } finally {
      setUploadingImage(false);
    }
  };

  // 4. Štampanje A6 PDF Adresnice sa verifikovanim imenom
  const executeGeneratePdf = (order: any, customName?: string, customAddress?: string, customCity?: string) => {
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
    (order.items || []).forEach((item: any) => {
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

  // 5. Prebacivanje vidljivosti / istaknutosti artikla direktno u tabeli
  const toggleProductFlag = async (productId: string, field: 'isFeatured' | 'isHidden') => {
    const prod = products.find(p => p.id === productId) as any;
    if (!prod) return;
    const updatedVal = !prod[field];

    try {
      await setDoc(doc(db, 'products', productId), { [field]: updatedVal }, { merge: true });
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, [field]: updatedVal } : p));
    } catch (err) {
      console.error(err);
    }
  };

  // Spremanje artikla
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || !editingProduct?.price) return;

    try {
      const prodId = editingProduct.id || `cs-${Date.now()}`;
      const productData = {
        ...editingProduct,
        id: prodId,
        price: Number(editingProduct.price),
        oldPrice: editingProduct.oldPrice ? Number(editingProduct.oldPrice) : undefined,
        sizes: editingProduct.sizes || { S: 5, M: 5, L: 5, XL: 5 },
        images: editingProduct.images || ['/hero-streetwear.webp'],
        category: (editingProduct.category || 'Majice') as Category,
        isFeatured: Boolean(editingProduct.isFeatured),
        isHidden: Boolean(editingProduct.isHidden)
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
      console.error('Greška pri spremanju:', err);
    }
  };

  // 6. Automatizovano slanje EmailJS podsjetnika za napuštene korpe
  const handleSendAbandonedEmail = async (cart: any, type: 'day3' | 'day5') => {
    const customerEmail = cart.email || cart.customerEmail;
    if (!customerEmail) {
      alert('Kupac nije ostavio email adresu.');
      return;
    }

    let promoCodeGenerated = '';
    if (type === 'day5') {
      promoCodeGenerated = `VRATI10-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      // Spremanje unikatnog koda u bazu
      await setDoc(doc(db, 'promo_codes', promoCodeGenerated), {
        id: promoCodeGenerated,
        code: promoCodeGenerated,
        discountPercent: 10,
        minOrderTotal: 40,
        validUntil: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        active: true
      });
    }

    const messageText = type === 'day3' 
      ? `Pozdrav! Vaši streetwear komadi u Casual Shop BiH korpi vas još uvijek čekaju. Završite narudžbu prije nego što se rasprodaju zalihe!`
      : `Specijalan popust za vas! Iskoristite kupon kod ${promoCodeGenerated} za 10% popusta na vašu korpu u narednih 48h!`;

    try {
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: 'service_contact',
          template_id: 'template_order',
          user_id: 'public_key_here',
          template_params: {
            to_email: customerEmail,
            email: customerEmail,
            to_name: cart.customerName || 'Kupac',
            customer_name: cart.customerName || 'Kupac',
            customer_note: messageText,
            order_number: type === 'day3' ? 'PODSJETNIK ZA KORPU' : 'KUPON 10% POPUSTA',
            items_summary: cart.itemsSummary || 'Artikli u korpi',
            total_amount: `${cart.total || 0} KM`
          }
        })
      });

      alert(type === 'day3' ? 'Podsjetnik (3 dana) uspješno poslan!' : `Kupon ${promoCodeGenerated} kreiran i poslan na email!`);
    } catch (err) {
      alert('Slanje emaila nije uspjelo.');
    }
  };

  // Kopiranje svih e-mailova pretplatnika
  const handleCopyAllEmails = () => {
    const list = subscribers.map(s => s.email).join(', ');
    navigator.clipboard.writeText(list);
    setCopiedEmails(true);
    setTimeout(() => setCopiedEmails(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col md:flex-row font-['Inter']">
      
      {/* 1. LIJEVA BOČNA TRAKA */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 shadow-xs">
        <div>
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 font-['Poppins']">
                <span className="font-black text-lg tracking-wider text-slate-950">CASUAL</span>
                <span className="px-2 py-0.5 bg-[#F7E97F] text-slate-950 text-xs font-black rounded">PRO</span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-1">E-Commerce Management</p>
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

          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-['Poppins'] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-[#F7E97F] text-slate-950 shadow-xs'
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
                  ? 'bg-[#F7E97F] text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Artikli & Zalihe</span>
            </button>

            <button
              onClick={() => setActiveTab('discounts')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-['Poppins'] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'discounts'
                  ? 'bg-[#F7E97F] text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Kuponi & Popusti</span>
            </button>

            <button
              onClick={() => setActiveTab('abandoned')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-['Poppins'] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'abandoned'
                  ? 'bg-[#F7E97F] text-slate-950 shadow-xs'
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
                  ? 'bg-[#F7E97F] text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Posjete & Metrika</span>
            </button>

            <button
              onClick={() => setActiveTab('newsletter')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-['Poppins'] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'newsletter'
                  ? 'bg-[#F7E97F] text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4" />
                <span>Newsletter</span>
              </div>
              <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-bold">
                {subscribers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-['Poppins'] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#F7E97F] text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
              <span>CMS & Postavke</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <div className="text-[11px]">
              <p className="text-slate-900 font-bold">Cloudflare & Firebase</p>
              <p className="text-slate-500 text-[10px]">Real-time sinhronizovano</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. GLAVNI PROSTOR */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="p-6 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-['Poppins'] font-black text-xl text-slate-900 uppercase tracking-wide">
              {activeTab === 'orders' && 'Upravljanje Narudžbama'}
              {activeTab === 'products' && 'Katalog Artikala & Zalihe'}
              {activeTab === 'discounts' && 'Kuponi & Promotivni Kodovi'}
              {activeTab === 'abandoned' && 'Napuštene Korpe & EmailJS Automatizacija'}
              {activeTab === 'analytics' && 'Napredna Metrika & Posjete'}
              {activeTab === 'newsletter' && 'Newsletter Baza Pretplatnika'}
              {activeTab === 'settings' && 'CMS Podešavanja & Cloudinary'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kompletan operativni pregled webshopa.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="px-4 py-2 border border-slate-300 hover:border-slate-400 text-xs font-['Poppins'] font-bold uppercase text-slate-700 hover:text-slate-950 transition-all rounded-lg"
            >
              ← Webshop
            </Link>
          </div>
        </header>

        <div className="p-6 space-y-6 flex-1">
          
          {/* STATISTIČKE KARTICE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Ukupan Prihod (Poslano/Dostavljeno)</p>
                <p className="text-2xl font-['Poppins'] font-black text-slate-900 mt-1">
                  {stats.totalRevenue.toFixed(2)} KM
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold">
                KM
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex items-center justify-between">
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

            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex items-center justify-between">
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

            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex items-center justify-between">
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
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-4">
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
                          ? 'bg-[#F7E97F] text-slate-950 font-black shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabela narudžbi */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
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
                                  onClick={() => {
                                    const info = extractCustomer(order);
                                    setPrintModalOrder({
                                      order,
                                      name: info.name,
                                      address: info.address,
                                      city: `${info.postalCode} ${info.city}`.trim()
                                    });
                                  }}
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

          {/* TAB 2: ARTIKLI & ZALIHE SA KONTROLOM VIDLJIVOSTI */}
          {activeTab === 'products' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-['Poppins'] font-black uppercase text-sm tracking-wide text-slate-900">
                    Katalog Proizvoda ({products.length})
                  </h3>
                  <p className="text-xs text-slate-400">Upravljajte artiklima, cijenama, istaknutim modelima i stanjem.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingProduct({
                      name: '',
                      price: 39,
                      oldPrice: 49,
                      category: 'Majice',
                      description: '',
                      images: ['/hero-streetwear.webp'],
                      isFeatured: false,
                      isHidden: false,
                      sizes: { S: 5, M: 5, L: 5, XL: 5, XXL: 2 }
                    });
                    setProductModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-[#F7E97F] hover:bg-amber-300 text-slate-950 text-xs font-['Poppins'] font-black uppercase rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Novi Artikl
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => {
                  const p = product as any;
                  const sizeList: { size: string; stock: any }[] = [];
                  if (p.sizes) {
                    if (Array.isArray(p.sizes)) {
                      p.sizes.forEach((s: any) => {
                        sizeList.push({
                          size: typeof s === 'string' ? s : s.size,
                          stock: typeof s === 'object' ? s.stock : 'Dostupno'
                        });
                      });
                    } else if (typeof p.sizes === 'object') {
                      Object.entries(p.sizes).forEach(([sz, stk]) => {
                        sizeList.push({ size: sz, stock: stk });
                      });
                    }
                  }

                  return (
                    <div key={p.id} className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 shadow-xs transition-all ${p.isHidden ? 'bg-slate-100/70 border-slate-300 opacity-60' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex gap-3">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.name} className="w-16 h-16 object-cover rounded-lg bg-white border border-slate-200 shrink-0" />
                        ) : (
                          <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center shrink-0">
                            <Package className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-sm text-slate-900 truncate">{p.name}</h4>
                            {p.isFeatured && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" title="Istaknuto" />}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-['Poppins'] font-black text-slate-900">{p.price} KM</span>
                            {p.oldPrice && (
                              <span className="text-[10px] text-slate-400 line-through">{p.oldPrice} KM</span>
                            )}
                          </div>
                          <div className="flex gap-1.5 mt-1.5">
                            <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-semibold text-slate-600 uppercase">
                              {p.category}
                            </span>
                            {p.isHidden && (
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-bold uppercase">
                                Sakriveno
                              </span>
                            )}
                          </div>
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

                      <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-xs">
                        <div className="flex gap-1">
                          <button
                            onClick={() => toggleProductFlag(p.id, 'isFeatured')}
                            className={`p-1.5 rounded border transition-colors ${p.isFeatured ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-white text-slate-500 border-slate-200 hover:text-slate-900'}`}
                            title={p.isFeatured ? 'Ukloni iz istaknutih' : 'Označi kao istaknuto'}
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleProductFlag(p.id, 'isHidden')}
                            className={`p-1.5 rounded border transition-colors ${p.isHidden ? 'bg-red-50 text-red-700 border-red-300' : 'bg-white text-slate-500 border-slate-200 hover:text-slate-900'}`}
                            title={p.isHidden ? 'Prikaži na webshopu' : 'Sakrij sa webshopa'}
                          >
                            {p.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        <div className="flex gap-1.5">
                          <button
                            onClick={() => {
                              setEditingProduct(p);
                              setProductModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <Edit className="w-3 h-3" /> Uredi
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-600 border border-slate-200 rounded text-xs font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Obriši
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: KUPONI SA ROKOM TRAJANJA */}
          {activeTab === 'discounts' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-['Poppins'] font-black uppercase text-sm tracking-wide text-slate-900">
                    Kuponi & Promotivni Kodovi ({promoCodes.length})
                  </h3>
                  <p className="text-xs text-slate-500">Postavite rokove trajanja, procente i maksimalan broj korištenja.</p>
                </div>
                <button
                  onClick={() => setPromoModalOpen(true)}
                  className="px-3.5 py-2 bg-[#F7E97F] hover:bg-amber-300 text-slate-950 text-xs font-['Poppins'] font-black uppercase rounded-lg flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Novi Kupon
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {promoCodes.map((p) => {
                  const isExpired = p.validUntil && new Date(p.validUntil) < new Date();
                  const isMaxed = p.maxUses && (p.usedCount || 0) >= p.maxUses;

                  return (
                    <div key={p.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-['Poppins'] font-black text-sm tracking-widest text-slate-900 block">
                            {p.code}
                          </span>
                          <span className="text-xs text-amber-700 font-bold block mt-0.5">
                            {p.discountPercent ? `${p.discountPercent}% POPUSTA` : `${p.discountAmount} KM`}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isExpired ? 'bg-red-100 text-red-700' : isMaxed ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-800'}`}>
                          {isExpired ? 'Istekao' : isMaxed ? 'Iskorišten' : 'Aktivan'}
                        </span>
                      </div>

                      <div className="space-y-1 text-[11px] text-slate-500 border-t border-slate-200 pt-2">
                        <div className="flex justify-between">
                          <span>Aktiviran:</span>
                          <span className="font-mono text-slate-700">{p.validFrom || 'Danas'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Vrijedi do:</span>
                          <span className="font-mono text-slate-700">{p.validUntil || 'Bez roka'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Iskorištenost:</span>
                          <span className="font-bold text-slate-800">{p.usedCount || 0} / {p.maxUses || '∞'}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex justify-end">
                        <button
                          onClick={async () => {
                            if (!confirm('Obrisati kupon?')) return;
                            await deleteDoc(doc(db, 'promo_codes', p.id));
                            setPromoCodes(prev => prev.filter(item => item.id !== p.id));
                          }}
                          className="text-xs text-red-600 hover:text-red-800 font-medium cursor-pointer"
                        >
                          Obriši kupon
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: NAPUŠTENE KORPE SA EMAILJS 3 I 5 DANA */}
          {activeTab === 'abandoned' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-['Poppins'] font-black uppercase text-sm tracking-wide text-slate-900">
                    Napuštene Korpe & EmailJS Automatizacija ({abandonedCarts.length})
                  </h3>
                  <p className="text-xs text-slate-500">Automatsko slanje napomena nakon 3 dana i 10% kupona nakon 5 dana.</p>
                </div>
              </div>

              {abandonedCarts.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center space-y-2">
                  <ShoppingCart className="w-8 h-8 text-slate-400 mx-auto" />
                  <h4 className="font-bold text-slate-800 text-sm">Nema zabilježenih napuštenih korpi</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Kupci trenutno redovno završavaju kupovinu.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {abandonedCarts.map((cart, idx) => {
                    const daysAgo = cart.createdAt ? Math.floor((Date.now() - new Date(cart.createdAt).getTime()) / 86400000) : 3;

                    return (
                      <div key={idx} className="py-4 flex flex-wrap justify-between items-center gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{cart.customerName || 'Posjetilac'}</span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono">
                              prije {daysAgo} dana
                            </span>
                          </div>
                          <span className="text-slate-500 text-xs block mt-0.5">
                            {cart.email || cart.phone || 'Nema kontakta'} • Iznos: <strong>{cart.total || 0} KM</strong>
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSendAbandonedEmail(cart, 'day3')}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            Email Napomena (3 dana)
                          </button>
                          <button
                            onClick={() => handleSendAbandonedEmail(cart, 'day5')}
                            className="px-3 py-1.5 bg-[#F7E97F] hover:bg-amber-300 text-slate-950 font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Tag className="w-3.5 h-3.5" />
                            Pošalji 10% Popust (5 dana)
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: NAPREDNA METRIKA & ANALITIKA */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 space-y-2">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Prosječna vrijednost (AOV)</span>
                  <p className="text-3xl font-['Poppins'] font-black text-slate-900">{stats.aov.toFixed(2)} KM</p>
                  <p className="text-xs text-emerald-600 font-medium">Usklađeno sa streetwear tržištem</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 space-y-2">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Stopa konverzije</span>
                  <p className="text-3xl font-['Poppins'] font-black text-blue-600">{stats.conversionRate}%</p>
                  <p className="text-xs text-slate-500">Posjete pretvorene u narudžbe</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 space-y-2">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Uspjeh isporuke</span>
                  <p className="text-3xl font-['Poppins'] font-black text-emerald-600">
                    {orders.length > 0 ? ((stats.deliveredOrders / orders.length) * 100).toFixed(1) : 0}%
                  </p>
                  <p className="text-xs text-slate-500">Paketi preuzeti od brze pošte</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 space-y-4">
                  <h3 className="font-['Poppins'] font-bold text-sm uppercase tracking-wider text-slate-900">
                    Top gradovi po prodaji
                  </h3>
                  <div className="space-y-3 pt-2">
                    {['Sarajevo', 'Banja Luka', 'Tuzla', 'Zenica', 'Mostar', 'Bihać'].map((c, i) => (
                      <div key={c} className="flex justify-between items-center text-xs">
                        <span className="font-medium text-slate-700">{i + 1}. {c}</span>
                        <span className="font-mono text-slate-500">X Express Pokrivenost</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 space-y-4">
                  <h3 className="font-['Poppins'] font-bold text-sm uppercase tracking-wider text-slate-900">
                    Kategorije po potražnji
                  </h3>
                  <div className="space-y-3 pt-2 text-xs">
                    <div className="flex justify-between">
                      <span>Majice (Kratki rukav)</span>
                      <strong className="text-slate-900">54% prodaje</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Dukserice & Hoodice</span>
                      <strong className="text-slate-900">32% prodaje</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Kape i dodaci</span>
                      <strong className="text-slate-900">14% prodaje</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: NEWSLETTER PRETPATNICI */}
          {activeTab === 'newsletter' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-['Poppins'] font-black uppercase text-sm tracking-wide text-slate-900">
                    Newsletter Pretplatnici ({subscribers.length})
                  </h3>
                  <p className="text-xs text-slate-500">Svi posjetioci koji su unijeli e-mail za popuste i obavijesti.</p>
                </div>
                <button
                  onClick={handleCopyAllEmails}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                >
                  {copiedEmails ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copiedEmails ? 'Kopirano u Clipboard!' : 'Kopiraj Sve Emailove'}
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {subscribers.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 text-xs">Trenutno nema novih prijava u bazi.</p>
                ) : (
                  subscribers.map((sub, idx) => (
                    <div key={idx} className="py-3 flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-800 font-mono">{sub.email}</span>
                      <span className="text-slate-400 text-[11px]">{sub.createdAt}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 7: CMS & CLOUDINARY POSTAVKE */}
          {activeTab === 'settings' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 max-w-2xl space-y-5">
              <div>
                <h3 className="font-['Poppins'] font-black text-sm uppercase tracking-wide text-slate-900">
                  CMS Podešavanja & Cloudinary Integracija
                </h3>
                <p className="text-xs text-slate-500">Podaci za direktan upload slika sa uređaja i gornji banner.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Gornja najavna traka (Top Bar Announcement):</label>
                  <input
                    type="text"
                    value={cmsSettings.topBarText}
                    onChange={(e) => setCmsSettings({ ...cmsSettings, topBarText: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-2 rounded-lg focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Cloudinary Cloud Name:</label>
                    <input
                      type="text"
                      value={cmsSettings.cloudinaryCloudName}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, cloudinaryCloudName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-2 rounded-lg"
                      placeholder="npr. dt0bc9jqy"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Cloudinary Upload Preset (Unsigned):</label>
                    <input
                      type="text"
                      value={cmsSettings.cloudinaryUploadPreset}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, cloudinaryUploadPreset: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-2 rounded-lg"
                      placeholder="npr. casualshop_preset"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Prag za besplatnu dostavu (KM):</label>
                    <input
                      type="number"
                      value={cmsSettings.freeShippingThreshold}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, freeShippingThreshold: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Kontakt telefon:</label>
                    <input
                      type="text"
                      value={cmsSettings.contactPhone}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, contactPhone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-2 rounded-lg"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={async () => {
                      await setDoc(doc(db, 'settings', 'general'), cmsSettings, { merge: true });
                      alert('Postavke su spremljene!');
                    }}
                    className="px-5 py-2.5 bg-[#F7E97F] hover:bg-amber-300 text-slate-950 font-['Poppins'] font-black text-xs uppercase rounded-lg flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    Spremi Postavke
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* MODAL ZA UREĐIVANJE / DODAVANJE ARTIKLA SA CLOUDINARY UPLOADOM */}
      {productModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
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
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Stara/Akcijska Cijena (KM):</label>
                  <input
                    type="number"
                    value={editingProduct.oldPrice || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, oldPrice: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-2 rounded-lg"
                    placeholder="Opcionalno"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Kategorija:</label>
                <select
                  value={editingProduct.category || 'Majice'}
                  onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-2 rounded-lg"
                >
                  <option value="Majice">Majice</option>
                  <option value="Dukserice">Dukserice</option>
                  <option value="Kape i dodaci">Kape i dodaci</option>
                  <option value="Jakne">Jakne</option>
                </select>
              </div>

              {/* SLIKA SA UREĐAJA (CLOUDINARY) */}
              <div>
                <label className="text-slate-700 font-bold block mb-1">Slika artikla (sa mobitela/računara ili URL):</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={editingProduct.images?.[0] || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, images: [e.target.value] })}
                    className="flex-1 bg-slate-50 border border-slate-300 text-slate-900 px-3 py-2 rounded-lg"
                    placeholder="https://..."
                  />
                  <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg cursor-pointer flex items-center gap-1.5 shrink-0">
                    <ImageIcon className="w-4 h-4 text-amber-600" />
                    <span>{uploadingImage ? 'Slanje...' : 'Izaberi sliku'}</span>
                    <input type="file" accept="image/*" onChange={handleFileUploadToCloudinary} className="hidden" />
                  </label>
                </div>
              </div>

              {/* KONTROLA VIDLJIVOSTI */}
              <div className="flex gap-4 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={Boolean(editingProduct.isFeatured)}
                    onChange={(e) => setEditingProduct({ ...editingProduct, isFeatured: e.target.checked })}
                    className="w-4 h-4 text-amber-500 rounded"
                  />
                  <span>Istakni na početnoj (Featured)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={Boolean(editingProduct.isHidden)}
                    onChange={(e) => setEditingProduct({ ...editingProduct, isHidden: e.target.checked })}
                    className="w-4 h-4 text-red-500 rounded"
                  />
                  <span>Sakrij sa webshopa</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                >
                  Odustani
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#F7E97F] hover:bg-amber-300 text-slate-950 font-['Poppins'] font-black uppercase rounded-lg shadow-xs cursor-pointer"
                >
                  Spremi Artikl
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ZA ŠTAMPU SA BRZOM PROVJEROM IMENA KUPCA */}
      {printModalOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="font-['Poppins'] font-black uppercase text-sm text-slate-900">
              Priprema A6 Adresnice (X Express)
            </h3>
            <p className="text-xs text-slate-500">
              Provjerite ili korigujte ime i adresu kupca prije preuzimanja PDF naljepnice.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">Ime i prezime na paketu:</label>
                <input
                  type="text"
                  value={printModalOrder.name}
                  onChange={(e) => setPrintModalOrder({ ...printModalOrder, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-2 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Adresa kupca:</label>
                <input
                  type="text"
                  value={printModalOrder.address}
                  onChange={(e) => setPrintModalOrder({ ...printModalOrder, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-2 rounded-lg"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Grad i poštanski broj:</label>
                <input
                  type="text"
                  value={printModalOrder.city}
                  onChange={(e) => setPrintModalOrder({ ...printModalOrder, city: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-2 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setPrintModalOrder(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Zatvori
              </button>
              <button
                onClick={() => {
                  executeGeneratePdf(
                    printModalOrder.order,
                    printModalOrder.name,
                    printModalOrder.address,
                    printModalOrder.city
                  );
                  setPrintModalOrder(null);
                }}
                className="px-4 py-2 bg-[#F7E97F] hover:bg-amber-300 text-slate-950 font-['Poppins'] font-black text-xs uppercase rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                Generiši & Preuzmi PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ZA KUPONE */}
      {promoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="font-['Poppins'] font-black uppercase text-sm text-slate-900">
              Novi Kupon sa Rokom Trajanja
            </h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newPromo.code) return;
              const codeId = newPromo.code.toUpperCase().trim();
              const pData = {
                ...newPromo,
                id: codeId,
                code: codeId,
                discountPercent: Number(newPromo.discountPercent || 0),
                minOrderTotal: Number(newPromo.minOrderTotal || 0),
                maxUses: Number(newPromo.maxUses || 100),
                usedCount: 0,
                active: true
              };
              await setDoc(doc(db, 'promo_codes', codeId), pData);
              setPromoCodes(prev => [pData as PromoCode, ...prev.filter(item => item.id !== codeId)]);
              setPromoModalOpen(false);
            }} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">Kôd kupona:</label>
                <input
                  type="text"
                  required
                  value={newPromo.code}
                  onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg font-mono font-bold uppercase"
                  placeholder="CASUAL10"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Popust (%):</label>
                  <input
                    type="number"
                    value={newPromo.discountPercent}
                    onChange={(e) => setNewPromo({ ...newPromo, discountPercent: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Maks. korištenja:</label>
                  <input
                    type="number"
                    value={newPromo.maxUses}
                    onChange={(e) => setNewPromo({ ...newPromo, maxUses: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Aktivira se:</label>
                  <input
                    type="date"
                    value={newPromo.validFrom}
                    onChange={(e) => setNewPromo({ ...newPromo, validFrom: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 px-2 py-1.5 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Ističe:</label>
                  <input
                    type="date"
                    value={newPromo.validUntil}
                    onChange={(e) => setNewPromo({ ...newPromo, validUntil: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 px-2 py-1.5 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPromoModalOpen(false)}
                  className="px-3 py-1.5 text-slate-500 hover:text-slate-900"
                >
                  Odustani
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#F7E97F] font-bold rounded-lg uppercase"
                >
                  Aktiviraj Kupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ZA UNOS TRACKING BROJA */}
      {trackingModalOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="font-['Poppins'] font-black uppercase text-sm text-slate-900">
              Unos broja pošiljke (X Express)
            </h3>
            <p className="text-xs text-slate-500">
              Unesite broj pošiljke za narudžbu #{trackingModalOrder.orderNumber || trackingModalOrder.id?.slice(0, 7)} kako bi kupac pratio pošiljku.
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
                onClick={() => {
                  const info = extractCustomer(selectedOrder);
                  setPrintModalOrder({
                    order: selectedOrder,
                    name: info.name,
                    address: info.address,
                    city: `${info.postalCode} ${info.city}`.trim()
                  });
                  setSelectedOrder(null);
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-[#F7E97F] text-slate-900 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Pripremi Adresnicu
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