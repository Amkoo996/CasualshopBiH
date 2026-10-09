import React, { createContext, useContext, useState, useEffect } from 'react';

interface WishlistContextType {
  wishlistIds: string[];
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('casualshop_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('casualshop_wishlist', JSON.stringify(wishlistIds));
    } catch (e) {
      console.error('Wishlist storage error:', e);
    }
  }, [wishlistIds]);

  const toggleWishlist = (productId: string) => {
    if (!productId) return;
    const cleanId = String(productId).trim();
    setWishlistIds((prev) =>
      prev.includes(cleanId) ? prev.filter((id) => id !== cleanId) : [...prev, cleanId]
    );
  };

  const isInWishlist = (productId: string) => {
    if (!productId) return false;
    return wishlistIds.includes(String(productId).trim());
  };

  const clearWishlist = () => {
    setWishlistIds([]);
    localStorage.removeItem('casualshop_wishlist');
  };

  return (
    <WishlistContext.Provider value={{ wishlistIds, toggleWishlist, isInWishlist, clearWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within WishlistProvider');
  return context;
};
