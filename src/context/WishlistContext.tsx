import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getUserWishlist, saveUserWishlist } from '../lib/db';

interface WishlistContextType {
  wishlistIds: string[];
  wishlistCount: number;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<boolean>;
  removeFromWishlist: (productId: string) => Promise<void>;
  clearWishlist: () => Promise<void>;
  toastMessage: string | null;
  clearToast: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load wishlist when user changes
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const ids = await getUserWishlist(user?.uid);
        if (isMounted) {
          setWishlistIds(ids);
        }
      } catch (err) {
        console.warn('Error loading wishlist:', err);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  const isInWishlist = (productId: string): boolean => {
    return wishlistIds.includes(productId);
  };

  const toggleWishlist = async (productId: string): Promise<boolean> => {
    const isSaved = wishlistIds.includes(productId);
    let updated: string[];

    if (isSaved) {
      updated = wishlistIds.filter((id) => id !== productId);
      showToast('Artikal uklonjen iz liste želja.');
    } else {
      updated = [...wishlistIds, productId];
      if (user) {
        showToast('Artikal spremljen na vaš profil u listu želja! ❤️');
      } else {
        showToast('Artikal spremljen! Prijavite se kako bi lista bila trajno sačuvana na vašem profilu. ❤️');
      }
    }

    setWishlistIds(updated);
    await saveUserWishlist(user?.uid, updated);
    return !isSaved;
  };

  const removeFromWishlist = async (productId: string): Promise<void> => {
    const updated = wishlistIds.filter((id) => id !== productId);
    setWishlistIds(updated);
    await saveUserWishlist(user?.uid, updated);
    showToast('Artikal uklonjen iz liste želja.');
  };

  const clearWishlist = async (): Promise<void> => {
    setWishlistIds([]);
    await saveUserWishlist(user?.uid, []);
    showToast('Lista želja je ispražnjena.');
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistIds,
        wishlistCount: wishlistIds.length,
        isInWishlist,
        toggleWishlist,
        removeFromWishlist,
        clearWishlist,
        toastMessage,
        clearToast: () => setToastMessage(null),
      }}
    >
      {children}
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0A0A0A] text-white border-2 border-[#F7E97F] px-4 py-3 shadow-2xl flex items-center gap-3 animate-slideUp font-['Inter'] text-xs max-w-sm">
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-neutral-400 hover:text-white font-bold ml-auto"
          >
            ✕
          </button>
        </div>
      )}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
