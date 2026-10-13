import React, { useState, useEffect } from 'react';
import { ArrowRight, Instagram, Sparkles, TrendingUp, ShieldCheck, Truck, RefreshCw, ArrowUpRight, Copy, Check } from 'lucide-react';
import { Product, CATEGORIES, Category, HomeCMSContent, DEFAULT_CMS_CONTENT } from '../types';
import { ProductCard } from '../components/shop/ProductCard';
import { NewsletterSection } from '../components/common/NewsletterSection';
import { useCart } from '../context/CartContext';
import { getCMSContent } from '../lib/db';

interface HomePageProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onNavigateToShop: (category?: string) => void;
}

const OPTIMIZED_FALLBACK_IMAGE = 'https://res.cloudinary.com/rvlsak2u/image/upload/f_webp,q_auto,w_800,c_limit/v1791551969/xpzi3atps6zrnkflak3c.jpg';

const FALLBACK_CATEGORY_IMAGES: Record<string, string> = {
  'Majice': OPTIMIZED_FALLBACK_IMAGE,
  'Duksevi i hoodice': 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80',
  'Jakne': 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80',
  'Pantalone i trenerke': 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=600&q=80',
  'Šorcevi': 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=600&q=80',
  'Kape i šeširi': 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&w=600&q=80',
  'Dodaci (Accessories)': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
};

const getOptimizedCloudinaryVideoUrl = (rawUrl?: string): string => {
  const defaultVideo = 'https://res.cloudinary.com/rvlsak2u/video/upload/f_auto,q_auto,w_1280,vc_h264/v1791897813/hero-video.mp4';
  const targetUrl = rawUrl || defaultVideo;

  if (targetUrl.includes('res.cloudinary.com') && targetUrl.includes('/upload/')) {
    if (targetUrl.includes('/f_auto,q_auto')) return targetUrl;
    return targetUrl.replace('/upload/', '/upload/f_auto,q_auto,w_1280,vc_h264/');
  }

  return targetUrl;
};

export const HomePage: React.FC<HomePageProps> = ({
  products = [],
  onSelectProduct,
  onNavigateToShop,
}) => {
  const { settings } = useCart();
  const [cms, setCms] = useState<HomeCMSContent>(DEFAULT_CMS_CONTENT);
  const [bannerCopied, setBannerCopied] = useState(false);

  useEffect(() => {
    const loadCMS = async () => {
      try {
        const data = await getCMSContent();
        setCms(data);
      } catch (e) {
        console.error('Greška pri učitavanju CMS koda:', e);
      }
    };
    loadCMS();
  }, []);

  const targetDate = new Date(cms.topBar.targetDate || '2026-11-01T12:00:00+02:00').getTime();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!cms.topBar.showTimer) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      } else {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [cms.topBar.targetDate, cms.topBar.showTimer]);

  const handleBannerCopy = () => {
    const match = cms.topBar.promoText.match(/Kod:\s*([A-Z0-9]+)/i) || cms.topBar.promoText.match(/([A-Z0-9]{4,15})/);
    const codeToCopy = match ? match[1] : 'FIRST100';

    if (navigator.clipboard) {
      navigator.clipboard.writeText(codeToCopy);
    }
    setBannerCopied(true);
    setTimeout(() => setBannerCopied(false), 3000);
  };

  const hiddenCats = settings?.hiddenCategories || [];
  const visibleCategoryNames = CATEGORIES.filter(
    (cat) => cat !== 'Rasprodano' && !hiddenCats.includes(cat as Category)
  );

  const categoryData = visibleCategoryNames.map((cat) => {
    const activeProducts = products.filter((p) => {
      const totalStock = Object.values(p.sizes || {}).reduce((s, v) => s + (v || 0), 0);
      return p.category === cat && totalStock > 0 && !p.isHidden;
    });

    const firstProduct = activeProducts.find((p) => p.images?.[0]);
    const image = firstProduct?.images[0] || FALLBACK_CATEGORY_IMAGES[cat] || OPTIMIZED_FALLBACK_IMAGE;

    return { title: cat, category: cat, count: activeProducts.length, image };
  });

  let displayCategories = [...categoryData];
  if (displayCategories.length > 4) {
    displayCategories = displayCategories
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }

  const getGridClass = (count: number) => {
    if (count === 1) return 'grid-cols-1 max-w-md mx-auto';
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2 max-w-4xl mx-auto';
    if (count === 3) return 'grid-cols-1 sm:grid-cols-3 max-w-6xl mx-auto';
    return 'grid-cols-2 md:grid-cols-4';
  };

  const activeProductsWithStock = products.filter((p) => {
    const totalStock = Object.values(p.sizes || {}).reduce((s, v) => s + (v || 0), 0);
    return !p.isHidden && totalStock > 0;
  });

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const newProducts = activeProductsWithStock.filter(
    (p) => p.isNew || (p.createdAt && new Date(p.createdAt).getTime() >= thirtyDaysAgo)
  ).slice(0, 4);

  const featuredProducts = activeProductsWithStock.filter(
    (p) => p.featured === true || String(p.featured) === 'true'
  ).slice(0, 4);

  const heroVideoSrc = getOptimizedCloudinaryVideoUrl(cms.hero.videoUrl);

  return (
    <div className="pb-0 bg-[#0A0A0A] w-full font-['Inter']">
      {/* 1. TOP BANER */}
      {cms.topBar.enabled && (
        <section 
          onClick={handleBannerCopy}
          className="bg-[#0A0A0A] text-[#F7E97F] border-b border-[#F7E97F]/20 py-2.5 px-4 shadow-lg w-full relative z-20 cursor-pointer hover:bg-[#121212] transition-colors group"
          title="Klikni da kopiraš promo kod"
        >
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 text-center md:text-left">
            <div className="flex items-center gap-2.5 font-['Poppins'] text-xs font-bold uppercase tracking-wider">
              <span className="bg-[#F7E97F] text-[#0A0A0A] px-2 py-0.5 font-black text-[10px] tracking-widest rounded-xs shadow-xs group-hover:scale-105 transition-transform">
                {cms.topBar.tagText}
              </span>
              <span className="text-neutral-200 group-hover:text-[#F7E97F] transition-colors flex items-center gap-1.5">
                {cms.topBar.promoText}
                {bannerCopied ? (
                  <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1 bg-emerald-950/80 px-2 py-0.5 border border-emerald-500/30 rounded-xs">
                    <Check className="w-3 h-3" /> KOD KOPIRAN!
                  </span>
                ) : (
                  <span className="text-[10px] text-[#F7E97F] underline ml-1 font-mono flex items-center gap-1">
                    <Copy className="w-3 h-3" /> (Klikni za kopiranje)
                  </span>
                )}
              </span>
            </div>

            {cms.topBar.showTimer && (
              <div className="flex items-center gap-2 font-mono font-bold bg-[#141414] px-3.5 py-1 border border-[#F7E97F]/40 text-[11px] text-[#ffffff] shadow-inner rounded-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F7E97F] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F7E97F]"></span>
                </span>
                <span className="text-neutral-300">OTVARANJE:</span>
                <span className="text-[#F7E97F]">
                  {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 2. HERO SEKCIJA (OPTIMIZOVANO ZA MOBILNI + DESKTOP TCF SCORE) */}
      <section className="relative bg-[#0A0A0A] text-white w-full min-h-[75vh] lg:min-h-[85vh] flex items-center justify-center overflow-hidden border-b-2 border-[#F7E97F]">
        <div className="absolute inset-0 z-0">
          {/* Slika za mobilne uređaje (Smanjuje LCP na mobilnim telefonima na ~1.5s) */}
          <img
            src={OPTIMIZED_FALLBACK_IMAGE}
            alt="Hero Background"
            className="block md:hidden w-full h-full object-cover opacity-45 filter contrast-125"
            fetchPriority="high"
          />

          {/* Video samo za desktop računare */}
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="none"
            className="hidden md:block w-full h-full object-cover opacity-45 filter contrast-125 scale-105 transition-transform duration-10000 ease-out"
          >
            <source src={heroVideoSrc} type="video/mp4" />
          </video>

          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-80" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-12 sm:py-20">
          <div className="max-w-2xl space-y-6">
            <div className="space-y-3">
              <h1 className="font-['Poppins'] text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight leading-[0.92] text-white">
                {cms.hero.titleLine1} <br />
                <span className="text-[#F7E97F] drop-shadow-[0_2px_10px_rgba(247,233,127,0.15)]">
                  {cms.hero.titleLine2}
                </span>
              </h1>
              <p className="font-['Poppins'] text-base sm:text-lg font-bold uppercase tracking-widest text-neutral-300">
                {cms.hero.subtitle}
              </p>
            </div>

            <p className="text-xs sm:text-sm text-neutral-300/90 max-w-lg leading-relaxed font-['Inter'] font-normal">
              {cms.hero.description}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button
                onClick={() => onNavigateToShop('Sve')}
                className="px-8 py-4 bg-[#F7E97F] text-[#0A0A0A] font-['Poppins'] font-black uppercase tracking-[0.2em] text-xs hover:bg-[#ebd965] hover:shadow-[0_0_20px_rgba(247,233,127,0.3)] transition-all flex items-center justify-center gap-2.5 group active:scale-95 cursor-pointer rounded-xs"
              >
                <span>{cms.hero.ctaPrimaryText}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1.5" />
              </button>

              <a
                href={settings.instagramUrl || 'https://www.instagram.com/casualshop.bih'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-4 bg-[#141414]/90 backdrop-blur-md border border-neutral-700 text-white font-['Poppins'] font-bold uppercase tracking-[0.15em] text-xs hover:border-[#F7E97F] hover:text-[#F7E97F] transition-all flex items-center justify-center gap-2 group cursor-pointer rounded-xs"
              >
                <Instagram className="w-4 h-4 text-[#F7E97F] group-hover:scale-110 transition-transform" />
                <span>{cms.hero.ctaSecondaryText}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 3. OSTALI SADRŽAJ */}
      <div className="bg-[#F4F2EC] pt-12 pb-0 w-full">
        <div className="space-y-14 sm:space-y-20 pb-14">
          
          {/* BENEFITI CARDS */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white border-2 border-[#F7E97F] p-6 sm:p-8 shadow-md rounded-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-neutral-200">
                <div className="flex flex-col items-center p-3 group">
                  <div className="w-12 h-12 bg-[#0A0A0A] text-[#F7E97F] flex items-center justify-center rounded-full mb-3 group-hover:scale-110 transition-transform">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="font-['Poppins'] text-xs font-black uppercase tracking-wider text-black">
                    {cms.benefits.shippingTitle}
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1.5 leading-snug">{cms.benefits.shippingSub}</p>
                </div>

                <div className="flex flex-col items-center p-3 pt-6 md:pt-3 group">
                  <div className="w-12 h-12 bg-[#0A0A0A] text-[#F7E97F] flex items-center justify-center rounded-full mb-3 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="font-['Poppins'] text-xs font-black uppercase tracking-wider text-black">
                    {cms.benefits.paymentTitle}
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1.5 leading-snug">{cms.benefits.paymentSub}</p>
                </div>

                <div className="flex flex-col items-center p-3 pt-6 md:pt-3 group">
                  <div className="w-12 h-12 bg-[#0A0A0A] text-[#F7E97F] flex items-center justify-center rounded-full mb-3 group-hover:scale-110 transition-transform">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div className="font-['Poppins'] text-xs font-black uppercase tracking-wider text-black">
                    {cms.benefits.inspectionTitle}
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1.5 leading-snug">{cms.benefits.inspectionSub}</p>
                </div>
              </div>
            </div>
          </section>

          {/* KATEGORIJE SEKCIJA */}
          {displayCategories.length > 0 && (
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
              <div className="flex justify-between items-end border-b-2 border-neutral-300 pb-3">
                <div>
                  <span className="text-[10px] font-['Poppins'] font-black uppercase tracking-[0.25em] text-neutral-500 block mb-1">
                    Katalog
                  </span>
                  <h2 className="font-['Poppins'] text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#0A0A0A]">
                    Odaberite kategoriju
                  </h2>
                </div>
                {visibleCategoryNames.length > displayCategories.length && (
                  <button
                    onClick={() => onNavigateToShop('Sve')}
                    className="text-xs font-['Poppins'] font-bold uppercase tracking-[0.18em] text-[#0A0A0A] hover:text-neutral-600 transition-colors inline-flex items-center gap-1.5 cursor-pointer group"
                  >
                    <span>Vidi sve kategorije</span>
                    <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </button>
                )}
              </div>

              <div className={`grid gap-5 ${getGridClass(displayCategories.length)}`}>
                {displayCategories.map((cat) => (
                  <div
                    key={cat.title}
                    onClick={() => onNavigateToShop(cat.category)}
                    className="group relative h-56 sm:h-72 overflow-hidden bg-[#0A0A0A] cursor-pointer border-2 border-neutral-300 hover:border-[#F7E97F] transition-all shadow-sm hover:shadow-xl hover:-translate-y-1 rounded-xs"
                  >
                    <img
                      src={cat.image}
                      alt={cat.title}
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = OPTIMIZED_FALLBACK_IMAGE;
                      }}
                      className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700 ease-out opacity-80 group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent flex flex-col justify-end p-5 transition-opacity">
                      <span className="font-['Poppins'] text-white text-sm sm:text-base font-black uppercase tracking-wider group-hover:text-[#F7E97F] transition-colors">
                        {cat.title}
                      </span>
                      <span className="text-[#F7E97F] text-[11px] font-['Poppins'] font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5 opacity-90 group-hover:opacity-100">
                        <span>Pogledaj ({cat.count})</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* NOVO U PONUDI */}
          {newProducts.length > 0 && (
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-3 border-b-2 border-neutral-300 gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-['Poppins'] font-black uppercase tracking-[0.2em] text-neutral-500 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#0A0A0A]" />
                    <span>Najnoviji dropovi</span>
                  </div>
                  <h2 className="font-['Poppins'] text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#0A0A0A]">
                    Novo u ponudi
                  </h2>
                </div>

                <button
                  onClick={() => onNavigateToShop('Sve')}
                  className="text-xs font-['Poppins'] font-bold uppercase tracking-[0.18em] text-[#0A0A0A] hover:text-neutral-600 transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer group"
                >
                  <span>Pogledaj sve novitete</span>
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                {newProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={onSelectProduct}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ISTAKNUTI ARTIKLI */}
          {featuredProducts.length > 0 && (
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-3 border-b-2 border-neutral-300 gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-['Poppins'] font-black uppercase tracking-[0.2em] text-neutral-500 mb-1">
                    <TrendingUp className="w-3.5 h-3.5 text-[#0A0A0A]" />
                    <span>Preporučujemo</span>
                  </div>
                  <h2 className="font-['Poppins'] text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#0A0A0A]">
                    Istaknuti proizvodi
                  </h2>
                </div>

                <button
                  onClick={() => onNavigateToShop('Sve')}
                  className="text-xs font-['Poppins'] font-bold uppercase tracking-[0.18em] text-[#0A0A0A] hover:text-neutral-600 transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer group"
                >
                  <span>Pregledaj sve</span>
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                {featuredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={onSelectProduct}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* NEWSLETTER NALIJEŽE DIREKTNO NA FOOTER */}
        <div className="bg-[#0A0A0A] -mb-12">
          <NewsletterSection />
        </div>
      </div>
    </div>
  );
};
