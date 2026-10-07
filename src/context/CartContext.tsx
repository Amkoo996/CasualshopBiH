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
}

const CART_STORAGE_KEY = 'casualshop_bih_cart';

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const refreshSettings = async () => {
    try {
      const s = await getStoreSettings();
      setSettings(s);
    } catch (e) {
      console.warn('Could not load settings:', e);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [items]);

  const addToCart = (product: Product, size: Size, quantity: number = 1) => {
    const availableStock = product.sizes[size] ?? 0;
    if (availableStock <= 0) return;

    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.id === product.id && item.size === size
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = Math.min(
          updated[existingIndex].quantity + quantity,
          availableStock
        );
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          maxStock: availableStock,
        };
        trackAddToCart(updated[existingIndex]);
        recordAddToCartEvent({
          id: product.id,
          name: product.name,
          price: product.price,
          size,
        });
        saveCartSession({ items: updated, subtotal: updated.reduce((s, i) => s + i.price * i.quantity, 0) });
        return updated;
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
        trackAddToCart(newItem);
        recordAddToCartEvent({
          id: product.id,
          name: product.name,
          price: product.price,
          size,
        });
        const nextItems = [...prev, newItem];
        saveCartSession({ items: nextItems, subtotal: nextItems.reduce((s, i) => s + i.price * i.quantity, 0) });
        return nextItems;
      }
    });

    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string, size: Size) => {
    setItems((prev) =>
      prev.filter((item) => !(item.id === productId && item.size === size))
    );
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

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const freeThreshold = settings.freeShippingThreshold || 100.0;
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
