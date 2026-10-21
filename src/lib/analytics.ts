/**
 * Google Analytics 4 & Meta Pixel integration for Casual Shop BiH
 * Event tracking: view_item, add_to_cart, begin_checkout, purchase
 */

import { CartItem, Product, Order } from '../types';

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

const getEnv = (key: string): string => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  return '';
};

// Koristimo isti ključ kao u layout.tsx (bez hardkodiranog ID-a)
const META_PIXEL_ID = getEnv('NEXT_PUBLIC_META_PIXEL_ID') || getEnv('VITE_META_PIXEL_ID');

export const initAnalytics = (consentGranted: boolean) => {
  if (!consentGranted || typeof window === 'undefined') return;

  // ISPRAVLJENO P1-4: Skripta je već učitana u layout.tsx sa zabranom praćenja.
  // Ovdje samo šaljemo signal da je korisnik dao pristanak ("update").
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      'analytics_storage': 'granted',
      'ad_storage': 'granted',
      'ad_user_data': 'granted',
      'ad_personalization': 'granted'
    });
  }

  // Initialize Meta Pixel
  if (META_PIXEL_ID && !document.getElementById('meta-pixel-script')) {
    const pixelScript = document.createElement('script');
    pixelScript.id = 'meta-pixel-script';
    pixelScript.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${META_PIXEL_ID}');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(pixelScript);
  }
};

export const trackViewItem = (product: Product) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'view_item', {
      currency: 'BAM',
      value: product.price,
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          item_category: product.category,
          price: product.price,
        },
      ],
    });
  }

  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'ViewContent', {
      content_name: product.name,
      content_ids: [product.id],
      content_type: 'product',
      value: product.price,
      currency: 'BAM',
    });
  }
};

export const trackAddToCart = (item: CartItem) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'add_to_cart', {
      currency: 'BAM',
      value: item.price * item.quantity,
      items: [
        {
          item_id: item.id,
          item_name: item.name,
          price: item.price,
          quantity: item.quantity,
          item_variant: item.size,
        },
      ],
    });
  }

  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'AddToCart', {
      content_name: item.name,
      content_ids: [item.id],
      content_type: 'product',
      value: item.price * item.quantity,
      currency: 'BAM',
    });
  }
};

export const trackBeginCheckout = (items: CartItem[], total: number) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'begin_checkout', {
      currency: 'BAM',
      value: total,
      items: items.map((item) => ({
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
        item_variant: item.size,
      })),
    });
  }

  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'InitiateCheckout', {
      num_items: items.length,
      value: total,
      currency: 'BAM',
    });
  }
};

export const trackPurchase = (order: Order) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'purchase', {
      transaction_id: order.orderNumber,
      value: order.total,
      currency: 'BAM',
      shipping: order.shippingFee,
      items: order.items.map((item) => ({
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
        item_variant: item.size,
      })),
    });
  }

  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'Purchase', {
      value: order.total,
      currency: 'BAM',
      content_type: 'product',
      num_items: order.items.length,
      order_id: order.orderNumber,
    });
  }
};