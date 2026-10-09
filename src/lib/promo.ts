import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';

export interface PromoCode {
  code: string;
  discountPercent: number; // npr. 10 za 10%
  expiresAt: string; // ISO Datum
  used: boolean;
  active: boolean;
  type: 'abandoned_cart' | 'post_purchase' | 'first_100';
  createdForEmail?: string;
  usageCount?: number;
  maxUsage?: number;
}

export function generateUniqueCode(prefix = 'CASUAL10'): string {
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${random}`;
}

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
    active: true,
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

export async function validateAndApplyPromoCode(
  code: string
): Promise<{ valid: boolean; discountPercent: number; message: string }> {
  if (!code || !code.trim()) {
    return { valid: false, discountPercent: 0, message: 'Unesite promo kod.' };
  }

  const cleanCode = code.trim().toUpperCase();

  // Posebno pravilo za promotivni kod od prvih 100 narudžbi
  if (cleanCode === 'FIRST100') {
    try {
      const promoRef = doc(db, 'promo_codes', 'FIRST100');
      const snap = await getDoc(promoRef);

      if (snap.exists()) {
        const data = snap.data() as PromoCode;
        if (data.usageCount && data.maxUsage && data.usageCount >= data.maxUsage) {
          return { valid: false, discountPercent: 0, message: 'Iskorišten je maksimalan broj upotreba (100/100).' };
        }
      } else {
        // Inicijalizacija koda ako ne postoji u bazi
        await setDoc(promoRef, {
          code: 'FIRST100',
          discountPercent: 10,
          expiresAt: '2027-01-01T00:00:00.000Z',
          used: false,
          active: true,
          type: 'first_100',
          usageCount: 0,
          maxUsage: 100,
        });
      }

      return {
        valid: true,
        discountPercent: 10,
        message: 'Promotivni kod za prvih 100 narudžbi prihvaćen! (10% popusta)',
      };
    } catch (e) {
      console.warn('FIRST100 provjera neuspješna:', e);
      return { valid: false, discountPercent: 0, message: 'Kod trenutno nije moguće provjeriti. Pokušajte ponovo.' };
    }
  }

  try {
    const promoRef = doc(db, 'promo_codes', cleanCode);
    const snap = await getDoc(promoRef);

    if (!snap.exists()) {
      return { valid: false, discountPercent: 0, message: 'Uneseni promo kod ne postoji.' };
    }

    const promo = snap.data() as PromoCode;

    if (promo.active === false) {
      return { valid: false, discountPercent: 0, message: 'Ovaj promo kod trenutno nije aktivan.' };
    }

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

export async function markPromoCodeAsUsed(code: string): Promise<void> {
  if (!code) return;
  const cleanCode = code.trim().toUpperCase();

  try {
    const promoRef = doc(db, 'promo_codes', cleanCode);
    if (cleanCode === 'FIRST100') {
      await updateDoc(promoRef, { usageCount: increment(1) });
    } else {
      await updateDoc(promoRef, { used: true, usedAt: new Date().toISOString() });
    }
  } catch (error) {
    console.warn('Greška pri označavanju promo koda:', error);
  }
}
