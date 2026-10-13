import { doc, getDoc, setDoc, updateDoc, deleteDoc, increment, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export interface PromoCode {
  code: string;
  discountPercent: number; // npr. 10 za 10%
  expiresAt: string; // ISO Datum
  used: boolean;
  active: boolean;
  type: 'abandoned_cart' | 'post_purchase' | 'first_100' | 'manual' | string;
  createdForEmail?: string;
  usageCount?: number;
  maxUsage?: number;
}

export function generateUniqueCode(prefix = 'CASUAL10'): string {
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${random}`;
}

// Dohvatanje svih promo kodova za Admin Dashboard (Samo za Admina)
export async function getPromoCodes(): Promise<PromoCode[]> {
  try {
    const snap = await getDocs(collection(db, 'promo_codes'));
    const codes: PromoCode[] = [];
    snap.forEach((d) => {
      codes.push({ code: d.id, ...d.data() } as PromoCode);
    });
    return codes;
  } catch (error) {
    console.error('Greška pri dohvatanju promo kodova:', error);
    return [];
  }
}

export const getAllPromoCodes = getPromoCodes;

// Promjena statusa (Aktivacija / Deaktivacija koda - Samo Admin)
export async function togglePromoCodeStatus(code: string, currentActiveState: boolean): Promise<void> {
  if (!code) return;
  const cleanCode = code.trim().toUpperCase();

  try {
    const promoRef = doc(db, 'promo_codes', cleanCode);
    await updateDoc(promoRef, { active: !currentActiveState });
  } catch (error) {
    console.error('Greška pri promjeni statusa promo koda:', error);
  }
}

// Potpuno brisanje promo koda (Samo Admin)
export async function deletePromoCode(code: string): Promise<void> {
  if (!code) return;
  const cleanCode = code.trim().toUpperCase();

  try {
    const promoRef = doc(db, 'promo_codes', cleanCode);
    await deleteDoc(promoRef);
  } catch (error) {
    console.error('Greška pri brisanju promo koda:', error);
  }
}

// Kreiranje promo koda (Zahtijeva Admin prava na Firestore-u)
export async function createPromoCode(
  emailOrCode: string,
  type: 'abandoned_cart' | 'post_purchase' | 'manual' | string = 'manual',
  durationHoursOrPercent: number = 720,
  manualDiscount?: number
): Promise<PromoCode> {
  let code = '';
  let discountPercent = 10;
  let durationHours = 720; // 30 dana default

  if (emailOrCode.includes('@')) {
    const prefix = type === 'abandoned_cart' ? 'WELCOME10' : 'THANKS10';
    code = generateUniqueCode(prefix);
    durationHours = durationHoursOrPercent;
  } else {
    code = emailOrCode.trim().toUpperCase();
    discountPercent = manualDiscount || durationHoursOrPercent || 10;
  }

  const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();

  const promoData: PromoCode = {
    code,
    discountPercent,
    expiresAt,
    used: false,
    active: true,
    type,
    ...(emailOrCode.includes('@') ? { createdForEmail: emailOrCode.toLowerCase().trim() } : {}),
  };

  try {
    const promoRef = doc(db, 'promo_codes', code);
    await setDoc(promoRef, promoData);
  } catch (error) {
    console.error('Greška pri kreiranju promo koda (potrebna Admin prava):', error);
  }

  return promoData;
}

// Validacija promo koda sa klijentske strane (Sigurna samo-čitanje operacija)
export async function validateAndApplyPromoCode(
  code: string
): Promise<{ valid: boolean; discountPercent: number; message: string }> {
  if (!code || !code.trim()) {
    return { valid: false, discountPercent: 0, message: 'Unesite promo kod.' };
  }

  const cleanCode = code.trim().toUpperCase();

  // Posebno pravilo za promo kod FIRST100
  if (cleanCode === 'FIRST100') {
    try {
      const promoRef = doc(db, 'promo_codes', 'FIRST100');
      const snap = await getDoc(promoRef);

      if (snap.exists()) {
        const data = snap.data() as PromoCode;
        if (data.active === false) {
          return { valid: false, discountPercent: 0, message: 'Promo kod FIRST100 je trenutno onemogućen.' };
        }
        if (data.usageCount && data.maxUsage && data.usageCount >= data.maxUsage) {
          return { valid: false, discountPercent: 0, message: 'Iskorišten je maksimalan broj upotreba (100/100).' };
        }
      }

      return {
        valid: true,
        discountPercent: 10,
        message: 'Promotivni kod za prvih 100 narudžbi prihvaćen! (10% popusta)',
      };
    } catch (e) {
      // Ako getDoc ne uspije, dozvoljavamo standardni popust bez obaranja narudžbe
      return {
        valid: true,
        discountPercent: 10,
        message: 'Promotivni kod FIRST100 prihvaćen! (10% popusta)',
      };
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

    if (promo.expiresAt && new Date(promo.expiresAt).getTime() < Date.now()) {
      return { valid: false, discountPercent: 0, message: 'Ovaj promo kod je istekao.' };
    }

    return {
      valid: true,
      discountPercent: promo.discountPercent,
      message: `Promo kod prihvaćen! Ostvarili ste ${promo.discountPercent}% popusta.`,
    };
  } catch (error) {
    console.error('Greška pri provjeri promo koda:', error);
    return { valid: false, discountPercent: 0, message: 'Greška pri provjeri promo koda. Pokušajte ponovo.' };
  }
}

// Označavanje koda kao iskorištenog pri narudžbi
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
    // Tiho hvatanje u slučaju nedovoljnih prava klijenta – narudžba se i dalje kompletira
    console.warn('Upozorenje: Označavanje promo koda nije zapisano na Firestore:', error);
  }
}
