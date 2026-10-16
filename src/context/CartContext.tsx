"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, Size, StoreSettings, DEFAULT_STORE_SETTINGS } from '../types';
import { trackAddToCart } from '../lib/analytics';
import { recordAddToCartEvent, saveCartSession } from '../lib/tracking';
import { getStoreSettings } from '../lib/db';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, size: Size, quantity?: number) => void;
  removeFromCart: (productId: string, size: Size) => void;
  updateQuantity: (productId: string, size: Size, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  shippingFee: number;
  freeShippingThreshold: number;
  total: number;
  totalCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  settings: StoreSettings;
  refreshSettings: () => Promise<void>;
  isMounted: boolean;
}

const CART_STORAGE_KEY = 'casualshop_bih_cart';

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const refreshSettings = async () => {
    try {
      const s = await getStoreSettings();
      setSettings(s);
    } catch (e) {
      console.warn('Could not load settings:', e);
    }
  };

  // Učitavanje iz localStorage nakon prvog rendera (Rješava Q1 Hydration problem)
  useEffect(() => {
    setIsMounted(true);
    refreshSettings();
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) setItems(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to parse cart from localStorage', e);
    }
  }, []);

  // Snimanje korpe prilikom svake promjene i ažuriranje napuštenih korpi
  useEffect(() => {
    if (isMounted) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
        
        // Ažuriranje sesije napuštene korpe i pri promjeni količine/brisanju (Q1 Fix)
        if (items.length > 0) {
          const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
          saveCartSession({ items, subtotal }).catch(() => {});
        }
      } catch (e) {
        console.error('Failed to save cart to localStorage', e);
      }
    }
  }, [items, isMounted]);

  const addToCart = (product: Product, size: Size, quantity: number = 1) => {
    const availableStock = product.sizes[size] ?? 0;
    if (availableStock <= 0) return;

    const existingIndex = items.findIndex(
      (item) => item.id === product.id && item.size === size
    );

    let newItems = [...items];

    // Nečiste funkcije i analitika izvučeni iz updatera (Q1 Fix)
    if (existingIndex > -1) {
      const newQty = Math.min(newItems[existingIndex].quantity + quantity, availableStock);
      newItems[existingIndex] = {
        ...newItems[existingIndex],
        quantity: newQty,
        maxStock: availableStock,
      };
      trackAddToCart(newItems[existingIndex]);
    } else {
      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images[0] || '',
        size,
        quantity: Math.min(quantity, availableStock),
        maxStock: availableStock,
      };
      newItems.push(newItem);
      trackAddToCart(newItem);
    }

    recordAddToCartEvent({
      id: product.id,
      name: product.name,
      price: product.price,
      size,
    });

    setItems(newItems);
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string, size: Size) => {
    setItems((prev) => prev.filter((item) => !(item.id === productId && item.size === size)));
  };

  const updateQuantity = (productId: string, size: Size, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, size);
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === productId && item.size === size) {
          const clampedQty = Math.min(quantity, item.maxStock);
          return { ...item, quantity: clampedQty };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Q1 Fix: Promijenjeno || na ?? da prag dostave od 0 KM ne preskoči na 100 KM
  const freeThreshold = settings.freeShippingThreshold ?? 100.0;
  const standardFee = settings.shippingFee ?? 10.0;

  const shippingFee =
    subtotal === 0
      ? 0
      : subtotal >= freeThreshold
      ? 0
      : standardFee;

  const total = subtotal + shippingFee;
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        subtotal,
        shippingFee,
        freeShippingThreshold: freeThreshold,
        total,
        totalCount,
        isCartOpen,
        setIsCartOpen,
        settings,
        refreshSettings,
        isMounted,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};