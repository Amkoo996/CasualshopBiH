import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loginWithEmail: (email: string, pass: string, remember: boolean) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function checkIsAdmin(user: User | null): boolean {
  if (!user) return false;
  const envUids = process.env.NEXT_PUBLIC_ADMIN_UIDS;
  if (envUids) {
    return envUids.split(',').map(id => id.trim()).includes(user.uid);
  }
  // ISPRAVLJENO N-2: Sada podrazumijevano vraća false. 
  // Niko se ne može ulogovati dok se ne postavi NEXT_PUBLIC_ADMIN_UIDS.
  return false; 
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      const ok = checkIsAdmin(currentUser);
      if (ok) {
        setUser(currentUser);
        setIsAdmin(true);
      } else {
        await firebaseSignOut(auth);
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string, remember: boolean) => {
    await setPersistence(
      auth,
      remember ? browserLocalPersistence : browserSessionPersistence
    );
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    const ok = checkIsAdmin(cred.user);
    if (!ok) {
      await firebaseSignOut(auth);
      throw new Error('Nemate dozvolu za pristup admin panelu.');
    }
    setUser(cred.user);
    setIsAdmin(true);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loginWithEmail, signOut }}>
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