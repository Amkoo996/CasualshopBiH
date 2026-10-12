import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { CartDrawer } from './components/cart/CartDrawer';
import { FloatingActions } from './components/layout/FloatingActions';
import { CookieConsent } from './components/common/CookieConsent';
import { NewsletterPopup } from './components/common/NewsletterPopup';
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { WishlistPage } from './pages/WishlistPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderSuccessPage } from './pages/OrderSuccessPage';
import { StaticPages } from './pages/StaticPages';
import { Product, Order } from './types';
import { getProducts, getStoreSettings } from './lib/db';
import { trackVisit } from './lib/tracking';
import { applyTheme } from './utils/theme';

// LAZY LOADING: Admin Panel se učitava na zahtjev (Code Splitting za brže učitavanje sajta)
const AdminDashboard = lazy(() =>
  import('./pages/AdminDashboard').then((module) => ({
    default: module.AdminDashboard,
  }))
);

export function AppContent() {
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [shopCategory, setShopCategory] = useState<string>('Sve');

  useEffect(() => {
    trackVisit();

    const init = async () => {
      try {
        const settings = await getStoreSettings();
        if (settings) {
          applyTheme(settings);
        }
      } catch (e) {
        console.error('Greška pri učitavanju postavki teme:', e);
        applyTheme();
      }

      try {
        const data = await getProducts(false);
        setProducts(data);
      } catch (e) {
        console.error('Greška pri dohvatanju kataloga:', e);
      }
    };

    init();
  }, []);

  // Postavljanje naslova stranice
  useEffect(() => {
    const titles: Record<string, string> = {
      home: 'Casual Shop BiH | Casual odjeća online',
      shop: 'Kolekcija | Casual Shop BiH',
      wishlist: 'Moja lista želja | Casual Shop BiH',
      about: 'O nama | Casual Shop BiH',
      shipping: 'Dostava i povrat | Casual Shop BiH',
      terms: 'Uslovi korištenja | Casual Shop BiH',
      privacy: 'Politika privatnosti | Casual Shop BiH',
      contact: 'Kontakt | Casual Shop BiH',
      checkout: 'Checkout - Plaćanje pouzećem | Casual Shop BiH',
      'order-success': 'Potvrda narudžbe | Casual Shop BiH',
      admin: 'Admin Kontrolna Tabla | Casual Shop BiH',
    };
    if (selectedProduct && currentTab === 'product-detail') {
      document.title = `${selectedProduct.name} (${selectedProduct.price.toFixed(2)} KM) | Casual Shop BiH`;
    } else {
      document.title = titles[currentTab] || 'Casual Shop BiH | Casual odjeća online';
    }
  }, [currentTab, selectedProduct]);

  // NAUČENA NAVIGACIJA SA BROWSER HISTORY STACK-om (BACK BUTTON PODRŠKA)
  useEffect(() => {
    if (!window.history.state) {
      window.history.replaceState({ tab: 'home' }, '');
    }

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.tab) {
        setCurrentTab(event.state.tab);
        if (event.state.productId) {
          const prod = products.find((p) => p.id === event.state.productId);
          setSelectedProduct(prod || null);
        } else {
          setSelectedProduct(null);
        }
        if (event.state.category) {
          setShopCategory(event.state.category);
        }
      } else {
        const hash = window.location.hash.replace('#/', '').replace('#', '');
        if (hash) {
          setCurrentTab(hash);
        } else {
          setCurrentTab('home');
          setSelectedProduct(null);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [products]);

  // Centralna funkcija za prelazak na novu stranicu koja upisuje stazu u Historiju
  const navigateTo = (tab: string, extraData?: { product?: Product; category?: string }) => {
    setCurrentTab(tab);

    if (extraData?.product) {
      setSelectedProduct(extraData.product);
    } else if (tab !== 'product-detail') {
      setSelectedProduct(null);
    }

    if (extraData?.category !== undefined) {
      setShopCategory(extraData.category);
    }

    window.history.pushState(
      {
        tab,
        productId: extraData?.product?.id,
        category: extraData?.category || shopCategory,
      },
      '',
      tab === 'home' ? '/' : `#${tab}`
    );

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Univerzalna funkcija za gumb "Nazad"
  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigateTo('shop', { category: 'Sve' });
    }
  };

  const handleSelectProduct = (product: Product) => {
    navigateTo('product-detail', { product });
  };

  const handleNavigateToShop = (category: string = 'Sve') => {
    setSearchTerm('');
    navigateTo('shop', { category });
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    navigateTo('shop');
  };

  const handleOrderSuccess = (order: Order) => {
    setLastOrder(order);
    navigateTo('order-success');
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col antialiased selection:bg-yellow-brand selection:text-[#0A0A0A]">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => navigateTo(tab)}
        onSearch={handleSearch}
        onSelectCategory={handleNavigateToShop}
      />

      <main className="flex-1">
        {currentTab === 'home' && (
          <HomePage
            products={products}
            onSelectProduct={handleSelectProduct}
            onNavigateToShop={handleNavigateToShop}
          />
        )}

        {currentTab === 'shop' && (
          <ShopPage
            products={products}
            onSelectProduct={handleSelectProduct}
            initialCategory={shopCategory}
            searchTerm={searchTerm}
          />
        )}

        {currentTab === 'product-detail' && selectedProduct && (
          <ProductDetailPage
            product={selectedProduct}
            onBack={handleBack}
          />
        )}

        {currentTab === 'wishlist' && (
          <WishlistPage
            products={products}
            onSelectProduct={handleSelectProduct}
            onExploreProducts={() => handleNavigateToShop('Sve')}
          />
        )}

        {currentTab === 'checkout' && (
          <CheckoutPage
            onBack={handleBack}
            onOrderSuccess={handleOrderSuccess}
            onNavigateToPage={(p) => navigateTo(p)}
          />
        )}

        {currentTab === 'order-success' && lastOrder && (
          <OrderSuccessPage
            order={lastOrder}
            onContinueShopping={() => handleNavigateToShop('Sve')}
          />
        )}

        {['about', 'contact', 'shipping', 'terms', 'privacy'].includes(currentTab) && (
          <StaticPages page={currentTab as any} />
        )}

        {currentTab === 'admin' && (
          <Suspense fallback={<div className="p-12 text-center font-mono text-xs">Učitavanje Admin Panela...</div>}>
            <AdminDashboard />
          </Suspense>
        )}
      </main>

      <Footer onNavigate={(tab) => navigateTo(tab)} />

      <CartDrawer onCheckout={() => navigateTo('checkout')} />
      <FloatingActions />
      <CookieConsent />
      <NewsletterPopup />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <AppContent />
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}
