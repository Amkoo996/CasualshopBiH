import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface PromoCode {
  code: string;
  discountPercent: number; // npr. 10 za 10%
  expiresAt: string; // ISO Datum
  used: boolean;
  type: 'abandoned_cart' | 'post_purchase';
  createdForEmail?: string;
}

// Pomoćna funkcija za generisanje jedinstvenog koda (npr. WELCOME10-8X2A ili THANKS10-9B1C)
export function generateUniqueCode(prefix = 'CASUAL10'): string {
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${random}`;
}

// Generisanje i spremanje promo koda u Firestore bazu
export async function createPromoCode(
  email: string,
  type: 'abandoned_cart' | 'post_purchase',
  durationHours: number
): Promise<PromoCode> {
  const prefix = type === 'abandoned_cart' ? 'WELCOME10' : 'THANKS10';
  const code = generateUniqueCode(prefix);
  const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();

  const promoData: PromoCode = {
    code,
    discountPercent: 10,
    expiresAt,
    used: false,
    type,
    createdForEmail: email.toLowerCase().trim(),
  };

  try {
    const promoRef = doc(db, 'promo_codes', code);
    await setDoc(promoRef, promoData);
  } catch (error) {
    console.error('Greška pri kreiranju promo koda:', error);
  }

  return promoData;
}

// Provjera i primjena promo koda na checkoutu
export async function validateAndApplyPromoCode(
  code: string
): Promise<{ valid: boolean; discountPercent: number; message: string }> {
  if (!code || !code.trim()) {
    return { valid: false, discountPercent: 0, message: 'Unesite promo kod.' };
  }

  const cleanCode = code.trim().toUpperCase();

  try {
    const promoRef = doc(db, 'promo_codes', cleanCode);
    const snap = await getDoc(promoRef);

    if (!snap.exists()) {
      return { valid: false, discountPercent: 0, message: 'Uneseni promo kod ne postoji.' };
    }

    const promo = snap.data() as PromoCode;

    if (promo.used) {
      return { valid: false, discountPercent: 0, message: 'Ovaj promo kod je već iskorišten.' };
    }

    if (new Date(promo.expiresAt).getTime() < Date.now()) {
      return { valid: false, discountPercent: 0, message: 'Ovaj promo kod je istekao.' };
    }

    return {
      valid: true,
      discountPercent: promo.discountPercent,
      message: `Promo kod prihvaćen! Ostvarili ste ${promo.discountPercent}% popusta.`,
    };
  } catch (error) {
    console.error('Greška pri provjeri promo koda:', error);
    return { valid: false, discountPercent: 0, message: 'Greška pri provjeri promo koda.' };
  }
}

// Označavanje koda kao iskorištenog nakon uspješne kupovine
export async function markPromoCodeAsUsed(code: string): Promise<void> {
  if (!code) return;
  try {
    const promoRef = doc(db, 'promo_codes', code.trim().toUpperCase());
    await updateDoc(promoRef, { used: true, usedAt: new Date().toISOString() });
  } catch (error) {
    console.warn('Greška pri označavanju promo koda kao iskorištenog:', error);
  }
}
