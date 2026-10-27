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
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loginWithEmail: (email: string, pass: string, remember: boolean) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Potpuno nova, sigurna validacija preko Firestore baze umjesto preko klijentskih varijabli
async function checkIsAdmin(user: User | null): Promise<boolean> {
  if (!user) return false;
  
  try {
    // Pokušaj čitanja dokumenta iz 'orders' kolekcije. 
    // Prema firestore.rules, samo stvarni admini mogu čitati ovu kolekciju.
    // Ako Firebase ne baci grešku "Permission denied", korisnik je potvrđeni admin.
    const testDocRef = doc(db, 'orders', 'admin_verification_test');
    await getDoc(testDocRef);
    return true;
  } catch (error: any) {
    // Greška ukazuje na to da korisnik nema admin prava u bazi
    console.error('Firebase validacija odbijena:', error.message);
    return false;
  }
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
      
      const ok = await checkIsAdmin(currentUser);
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
    
    const ok = await checkIsAdmin(cred.user);
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
      {!loading && children}
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
