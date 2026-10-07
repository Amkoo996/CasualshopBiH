import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { CartDrawer } from './components/cart/CartDrawer';
import { FloatingActions } from './components/layout/FloatingActions';
import { CookieConsent } from './components/common/CookieConsent';
import { NewsletterPopup } from './components/common/NewsletterPopup';
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderSuccessPage } from './pages/OrderSuccessPage';
import { StaticPages } from './pages/StaticPages';
import { AdminDashboard } from './pages/AdminDashboard';
import { Product, Order } from './types';
import { getProducts } from './lib/db';
import { trackVisit } from './lib/tracking';

export function AppContent() {
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [shopCategory, setShopCategory] = useState<string>('Sve');

  // Load products on mount
  useEffect(() => {
    trackVisit();
    const fetchCatalog = async () => {
      try {
        const data = await getProducts(false);
        setProducts(data);
      } catch (e) {
        console.error('Error fetching catalog:', e);
      }
    };
    fetchCatalog();
  }, []);

  // Sync document title dynamically for SEO
  useEffect(() => {
    const titles: Record<string, string> = {
      home: 'Casual Shop BiH | Casual odjeća online',
      shop: 'Kolekcija | Casual Shop BiH',
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

  // Handle URL hash changes or direct deep-links (e.g. #/admin)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '');
      if (['admin', 'shop', 'about', 'contact', 'shipping', 'terms', 'privacy'].includes(hash)) {
        setCurrentTab(hash);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setCurrentTab('product-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToShop = (category: string = 'Sve') => {
    setShopCategory(category);
    setSearchTerm('');
    setSelectedProduct(null);
    setCurrentTab('shop');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setSelectedProduct(null);
    setCurrentTab('shop');
  };

  const handleOrderSuccess = (order: Order) => {
    setLastOrder(order);
    setCurrentTab('order-success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F2EC] text-[#111111] font-['Inter'] antialiased selection:bg-[#F7E97F] selection:text-[#0A0A0A]">
      {/* Sticky Header */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setSelectedProduct(null);
          setCurrentTab(tab);
        }}
        onSearch={handleSearch}
        onSelectCategory={handleNavigateToShop}
      />

      {/* Main Content Area */}
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
            onBack={() => setCurrentTab('shop')}
          />
        )}

        {currentTab === 'checkout' && (
          <CheckoutPage
            onBack={() => setCurrentTab('shop')}
            onOrderSuccess={handleOrderSuccess}
            onNavigateToPage={(p) => {
              setCurrentTab(p);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentTab === 'order-success' && lastOrder && (
          <OrderSuccessPage
            order={lastOrder}
            onContinueShopping={() => handleNavigateToShop()}
          />
        )}

        {['about', 'contact', 'shipping', 'terms', 'privacy'].includes(currentTab) && (
          <StaticPages page={currentTab as any} />
        )}

        {currentTab === 'admin' && <AdminDashboard />}
      </main>

      {/* Footer */}
      <Footer
        onNavigate={(tab) => {
          setSelectedProduct(null);
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Cart Slide-Over Drawer */}
      <CartDrawer onCheckout={() => setCurrentTab('checkout')} />

      {/* Floating Instagram & WhatsApp Action */}
      <FloatingActions />

      {/* Cookie Consent Banner */}
      <CookieConsent />

      {/* Newsletter Popup (15 seconds) */}
      <NewsletterPopup />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AuthProvider>
  );
}
