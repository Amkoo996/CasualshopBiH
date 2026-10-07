import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { auth } from '../lib/firebase';

// Lista dozvoljenih admin email adresa
const AUTHORIZED_ADMIN_EMAILS = [
  "reddemption19@gmail.com",
  "tarik.dizdar@gmail.com"
];

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isDemoAdmin: boolean;
  loginWithEmail: (email: string, pass: string, remember: boolean) => Promise<void>;
  loginAsDemoAdmin: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isDemoAdmin, setIsDemoAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && currentUser.email) {
        const userEmail = currentUser.email.trim().toLowerCase();
        const isAuthorized = AUTHORIZED_ADMIN_EMAILS.some(e => e.toLowerCase() === userEmail);

        if (isAuthorized) {
          setUser(currentUser);
          setIsDemoAdmin(false);
        } else {
          firebaseSignOut(auth);
          setUser(null);
          alert("Pristup odbijen! Vaša e-mail adresa nema admin privilegije.");
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string, remember: boolean) => {
    const cleanEmail = email.trim().toLowerCase();
    const isAuthorized = AUTHORIZED_ADMIN_EMAILS.some(e => e.toLowerCase() === cleanEmail);

    if (!isAuthorized) {
      throw new Error("Nemate dozvolu za pristup admin panelu sa ovom e-mail adresom.");
    }

    const persistence = remember ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistence);
    await signInWithEmailAndPassword(auth, email, pass);
    setIsDemoAdmin(false);
  };

  const loginAsDemoAdmin = () => {
    setIsDemoAdmin(true);
  };

  const signOut = async () => {
    setIsDemoAdmin(false);
    await firebaseSignOut(auth);
  };

  const isAdmin = isDemoAdmin || (
    user !== null && 
    user.email !== null && 
    AUTHORIZED_ADMIN_EMAILS.some(e => e.toLowerCase() === user.email?.trim().toLowerCase())
  );

  return (
    <AuthContext.Provider value={{ user, isAdmin, isDemoAdmin, loginWithEmail, loginAsDemoAdmin, signOut }}>
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
