import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  loginAsDemoAdmin: () => void;
  isDemoAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Designated admin email from requirements
const ADMIN_EMAILS = ['redemption19@gmail.com', 'admin@casualshop.ba'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoAdmin, setIsDemoAdmin] = useState(() => {
    return localStorage.getItem('cs_demo_admin_active') === 'true';
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Google Sign-In failed', err);
      throw err;
    }
  };

  const signOut = async () => {
    setIsDemoAdmin(false);
    localStorage.removeItem('cs_demo_admin_active');
    try {
      await fbSignOut(auth);
    } catch (err) {
      console.error('Sign out error', err);
    }
  };

  const loginAsDemoAdmin = () => {
    setIsDemoAdmin(true);
    localStorage.setItem('cs_demo_admin_active', 'true');
  };

  const isAdmin = Boolean(
    isDemoAdmin ||
    (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) ||
    user?.email?.includes('casualshop')
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        loading,
        signInWithGoogle,
        signOut,
        loginAsDemoAdmin,
        isDemoAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
