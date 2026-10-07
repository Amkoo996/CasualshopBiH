import React from 'react';
import { ArrowRight, Instagram, Sparkles, TrendingUp, ShieldCheck, Truck, RefreshCw } from 'lucide-react';
import { Product } from '../types';
import { ProductCard } from '../components/shop/ProductCard';
import { NewsletterSection } from '../components/common/NewsletterSection';
import { useCart } from '../context/CartContext';

interface HomePageProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onNavigateToShop: (category?: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  products,
  onSelectProduct,
  onNavigateToShop,
}) => {
  const { settings } = useCart();

  // Filter Novo u ponudi: unutar 30 dana ili isNew === true
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const newProducts = products.filter(
    (p) => !p.isHidden && (p.isNew || (p.createdAt && new Date(p.createdAt).getTime() >= thirtyDaysAgo))
  ).slice(0, 4);

  // Istaknuti proizvodi (featured)
  const featuredProducts = products.filter((p) => !p.isHidden && p.featured).slice(0, 4);

  return (
    <div className="space-y-16 sm:space-y-24 pb-12">
      {/* HERO SECTION */}
      <section className="relative bg-[#0A0A0A] text-white min-h-[75vh] sm:min-h-[82vh] flex items-center overflow-hidden border-b-2 border-[#F7E97F]">
        {/* Background Image with Streetwear Mood */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=2000&q=85"
            alt="Casual Shop BiH Streetwear"
            className="w-full h-full object-cover object-top opacity-30 filter grayscale contrast-125"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/50 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-28 w-full">
          <div className="max-w-2xl space-y-6">
            {/* Yellow accent tag */}
            <div className="inline-flex items-center gap-2 border-2 border-[#F7E97F] bg-[#0A0A0A]/90 px-3.5 py-1 text-xs font-['Poppins'] uppercase tracking-[0.2em] text-[#F7E97F]">
              <span className="w-2 h-2 rounded-full bg-[#F7E97F] animate-ping" />
              <span>Službena BiH Online Prodavnica</span>
            </div>

            {/* Slogan & Titles */}
            <div className="space-y-3">
              <h1 className="font-['Poppins'] text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight leading-[0.95] text-white">
                CASUAL. <br />
                <span className="text-[#F7E97F]">SVAKI DAN.</span>
              </h1>
              <p className="font-['Poppins'] text-lg sm:text-xl font-bold uppercase tracking-wider text-neutral-300">
                Udobna odjeća za svaki dan.
              </p>
            </div>

            <p className="text-xs sm:text-sm text-neutral-300 max-w-lg leading-relaxed font-['Inter']">
              Urbani krojevi, kvalitetan češljani pamuk i autentični dizajn inspirisan ulicom.
              Plaćanje pouzećem gotovinom prilikom preuzimanja od kurira.
            </p>

            {/* CTA Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button
                onClick={() => onNavigateToShop()}
                className="px-8 py-4 bg-[#F7E97F] text-[#0A0A0A] font-['Poppins'] font-black uppercase tracking-[0.2em] text-xs hover:bg-[#ebd965] transition-all flex items-center justify-center gap-2 group shadow-xl active:scale-95"
              >
                <span>Pogledaj kolekciju</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              <a
                href={settings.instagramUrl || 'https://www.instagram.com/casualshop.bih'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-4 bg-[#171717] border border-neutral-700 text-white font-['Poppins'] font-bold uppercase tracking-[0.15em] text-xs hover:border-[#F7E97F] hover:text-[#F7E97F] transition-all flex items-center justify-center gap-2"
              >
                <Instagram className="w-4 h-4 text-[#F7E97F]" />
                <span>Instagram @casualshop.bih</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK BENEFIT STRIP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border-2 border-[#F7E97F] p-6 sm:p-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-neutral-200">
            <div className="flex flex-col items-center p-2">
              <Truck className="w-6 h-6 text-[#0A0A0A] mb-2" />
              <h3 className="font-['Poppins'] text-xs font-bold uppercase tracking-wider text-black">
                Dostava {settings.shippingFee} KM • Besplatna preko {settings.freeShippingThreshold} KM
              </h3>
              <p className="text-[11px] text-neutral-500 mt-1">Brzom poštom u roku 2–5 radnih dana u sve gradove BiH</p>
            </div>
            <div className="flex flex-col items-center p-2 pt-4 md:pt-2">
              <ShieldCheck className="w-6 h-6 text-[#0A0A0A] mb-2" />
              <h3 className="font-['Poppins'] text-xs font-bold uppercase tracking-wider text-black">
                100% Plaćanje pouzećem
              </h3>
              <p className="text-[11px] text-neutral-500 mt-1">Bez unosa kartice. Plaćaš gotovinom kuriru pri preuzimanju.</p>
            </div>
            <div className="flex flex-col items-center p-2 pt-4 md:pt-2">
              <RefreshCw className="w-6 h-6 text-[#0A0A0A] mb-2" />
              <h3 className="font-['Poppins'] text-xs font-bold uppercase tracking-wider text-black">
                Jednostavna zamjena veličine
              </h3>
              <p className="text-[11px] text-neutral-500 mt-1">Niste sigurni u kroj? Obezbjeđujemo zamjenu u roku 14 dana.</p>
            </div>
          </div>
        </div>
      </section>

      {/* KATEGORIJE HIGHLIGHT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              title: 'Majice',
              category: 'Majice',
              image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80',
            },
            {
              title: 'Duksevi i hoodice',
              category: 'Duksevi i hoodice',
              image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80',
            },
            {
              title: 'Pantalone i trenerke',
              category: 'Pantalone i trenerke',
              image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=600&q=80',
            },
            {
              title: 'Kape i šeširi',
              category: 'Kape i šeširi',
              image: 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&w=600&q=80',
            },
          ].map((cat) => (
            <div
              key={cat.title}
              onClick={() => onNavigateToShop(cat.category)}
              className="group relative h-48 sm:h-64 overflow-hidden bg-[#0A0A0A] cursor-pointer border-2 border-neutral-200 hover:border-[#F7E97F] transition-all"
            >
              <img
                src={cat.image}
                alt={cat.title}
                loading="lazy"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 opacity-75 group-hover:opacity-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-4">
                <span className="font-['Poppins'] text-white text-xs sm:text-sm font-black uppercase tracking-wider">
                  {cat.title}
                </span>
                <span className="text-[#F7E97F] text-[10px] font-['Poppins'] font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1 group-hover:underline">
                  Pogledaj <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* NOVO U PONUDI (< 30 DANA) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b-2 border-neutral-300 gap-4">
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
            onClick={() => onNavigateToShop()}
            className="text-xs font-['Poppins'] font-bold uppercase tracking-[0.18em] text-[#0A0A0A] hover:text-neutral-600 transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>Pogledaj sve novitete</span>
            <ArrowRight className="w-4 h-4" />
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

      {/* YELLOW ACCENT STREETWEAR BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#0A0A0A] text-white p-8 sm:p-14 border-2 border-[#F7E97F] shadow-xl relative overflow-hidden">
          <div className="max-w-xl relative z-10 space-y-4">
            <span className="text-[11px] font-['Poppins'] font-black uppercase tracking-[0.3em] text-[#F7E97F]">
              KVALITET ZA SVAKI DAN
            </span>
            <h3 className="font-['Poppins'] text-2xl sm:text-4xl font-black uppercase tracking-tight text-white leading-tight">
              UDOBNA ODJEĆA ZA SVAKI DAN.
            </h3>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-['Inter']">
              Biramo komade koje ćeš voljeti nositi i koji se uklapaju u svaku priliku.
              Uživaj u postojanosti materijala i besprijekornoj udobnosti.
            </p>
            <div className="pt-2">
              <button
                onClick={() => onNavigateToShop()}
                className="px-6 py-3.5 bg-[#F7E97F] text-[#0A0A0A] font-['Poppins'] font-black uppercase tracking-widest text-xs hover:bg-[#ebd965] transition-colors"
              >
                Istraži ponudu
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ISTAKNUTI ARTIKLI */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b-2 border-neutral-300 gap-4">
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
            onClick={() => onNavigateToShop()}
            className="text-xs font-['Poppins'] font-bold uppercase tracking-[0.18em] text-[#0A0A0A] hover:text-neutral-600 transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>Pregledaj sve</span>
            <ArrowRight className="w-4 h-4" />
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

      {/* INSTAGRAM BANNER */}
      <section className="bg-white py-12 px-4 sm:px-6 lg:px-8 border-y-2 border-neutral-200">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-[#0A0A0A] px-4 py-1.5 border border-[#F7E97F]">
            <Instagram className="w-4 h-4 text-[#F7E97F]" />
            <span className="text-xs font-['Poppins'] font-black uppercase tracking-wider text-white">
              @casualshop.bih
            </span>
          </div>
          <h2 className="font-['Poppins'] text-2xl font-black uppercase tracking-tight text-[#0A0A0A]">
            PRATI NAS NA INSTAGRAMU
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 max-w-md mx-auto font-['Inter']">
            Pogledaj najnovije kombinacije, priče iza dropova i označi nas u svojim objavama.
          </p>
          <div className="pt-2">
            <a
              href={settings.instagramUrl || 'https://www.instagram.com/casualshop.bih'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-bold uppercase tracking-widest transition-colors"
            >
              <span>Posjeti profil</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <NewsletterSection />
    </div>
  );
};
