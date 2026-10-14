"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider } from '../src/context/AuthContext';
import { CartProvider, useCart } from '../src/context/CartContext';
import { WishlistProvider } from '../src/context/WishlistContext';
import { Navbar } from '../src/components/layout/Navbar';
import { Footer } from '../src/components/layout/Footer';
import { CartDrawer } from '../src/components/cart/CartDrawer';
import { FloatingActions } from '../src/components/layout/FloatingActions';
import { CookieConsent } from '../src/components/common/CookieConsent';
import { NewsletterPopup } from '../src/components/common/NewsletterPopup';

// Omotač koji povezuje korpu sa Next.js ruterom za checkout
function CartDrawerWithRouter() {
  const router = useRouter();
  const { setIsCartOpen } = useCart();

  return (
    <CartDrawer
      onCheckout={() => {
        setIsCartOpen(false);
        router.push('/checkout');
      }}
    />
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <Navbar />
          <CartDrawerWithRouter />
          <main className="min-h-screen">
            {children}
          </main>
          <FloatingActions />
          <NewsletterPopup />
          <CookieConsent />
          <Footer />
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}