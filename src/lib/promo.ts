import { doc, getDoc, setDoc, updateDoc, deleteDoc, increment, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export interface PromoCode {
  code: string;
  discountPercent: number; // npr. 10 za 10%
  expiresAt: string; // ISO Datum isteka
  activatedAt?: string; // ISO Datum aktivacije
  used: boolean;
  usedAt?: string; // Tacno vrijeme kada je kod iskoriSten
  active: boolean;
  type: 'abandoned_cart' | 'post_purchase' | 'first_100' | 'manual' | string;
  createdForEmail?: string;
  usageCount?: number;
  maxUsage?: number; // Maksimalan broj dozvoljenih narudzbi
}

export function generateUniqueCode(prefix = 'CASUAL10'): string {
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${random}`;
}

// Dohvatanje svih promo kodova za Admin Dashboard
export async function getPromoCodes(): Promise<PromoCode[]> {
  try {
    const snap = await getDocs(collection(db, 'promo_codes'));
    const codes: PromoCode[] = [];
    snap.forEach((d) => {
      codes.push({ code: d.id, ...d.data() } as PromoCode);
    });
    return codes;
  } catch (error) {
    console.error('GreSka pri dohvatanju promo kodova:', error);
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
    console.error('GreSka pri promjeni statusa promo koda:', error);
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
    console.error('GreSka pri brisanju promo koda:', error);
  }
}

// Kreiranje promo koda sa definisanim trajanjem ili limitom upotreba
export async function createPromoCode(
  emailOrCode: string,
  type: 'abandoned_cart' | 'post_purchase' | 'manual' | string = 'manual',
  durationHoursOrPercent: number = 720,
  manualDiscount?: number,
  maxUsage: number = 1
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

  const now = new Date();
  const activatedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000).toISOString();

  const promoData: PromoCode = {
    code,
    discountPercent,
    activatedAt,
    expiresAt,
    used: false,
    active: true,
    type,
    usageCount: 0,
    maxUsage: maxUsage || 1,
    ...(emailOrCode.includes('@') ? { createdForEmail: emailOrCode.toLowerCase().trim() } : {}),
  };

  try {
    const promoRef = doc(db, 'promo_codes', code);
    await setDoc(promoRef, promoData);
  } catch (error) {
    console.error('GreSka pri kreiranju promo koda:', error);
  }

  return promoData;
}

// Validacija promo koda (Aktivacija, Istek, Max upotreba)
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

    // 1. Provjera rucne deaktivacije
    if (promo.active === false) {
      return { valid: false, discountPercent: 0, message: 'Ovaj promo kod viSe nije aktivan.' };
    }

    // 2. Provjera da li je jedokratan i vec iskoriSten
    if (promo.used && (!promo.maxUsage || promo.maxUsage <= 1)) {
      return { valid: false, discountPercent: 0, message: 'Ovaj promo kod je vec iskoriSten.' };
    }

    // 3. Provjera maksimalnog broja narudzbi
    if (promo.maxUsage && promo.usageCount && promo.usageCount >= promo.maxUsage) {
      return { valid: false, discountPercent: 0, message: `Dostignut je maksimalan broj iskoriStenosti (${promo.maxUsage}/${promo.maxUsage}).` };
    }

    // 4. Provjera vremenske aktivacije i isteka
    const now = Date.now();
    if (promo.activatedAt && new Date(promo.activatedAt).getTime() > now) {
      return { valid: false, discountPercent: 0, message: 'Ovaj promo kod joS uvijek nije aktiviran.' };
    }

    if (promo.expiresAt && new Date(promo.expiresAt).getTime() < now) {
      return { valid: false, discountPercent: 0, message: 'Ovaj promo kod je istekao.' };
    }

    return {
      valid: true,
      discountPercent: promo.discountPercent,
      message: `Promo kod prihvacen! Ostvarili ste ${promo.discountPercent}% popusta.`,
    };
  } catch (error) {
    console.error('GreSka pri provjeri promo koda:', error);
    return { valid: false, discountPercent: 0, message: 'GreSka pri provjeri promo koda. PokuSajte ponovo.' };
  }
}

// Oznacavanje koda kao iskoriStenog pri narudzbi + Automatsko gaSenje ako je dostignut limit
export async function markPromoCodeAsUsed(code: string): Promise<void> {
  if (!code) return;
  const cleanCode = code.trim().toUpperCase();

  try {
    const promoRef = doc(db, 'promo_codes', cleanCode);
    const snap = await getDoc(promoRef);

    if (snap.exists()) {
      const promo = snap.data() as PromoCode;
      const currentUsage = (promo.usageCount || 0) + 1;
      const maxUsage = promo.maxUsage || 1;
      const nowISO = new Date().toISOString();

      const shouldDeactivate = currentUsage >= maxUsage;

      await updateDoc(promoRef, {
        usageCount: increment(1),
        usedAt: nowISO,
        used: shouldDeactivate ? true : promo.used,
        active: shouldDeactivate ? false : promo.active,
      });
    }
  } catch (error) {
    console.warn('Upozorenje: Oznacavanje promo koda nije zapisano na Firestore:', error);
  }
}

// Pomocna funkcija za izracunavanje preostalog vremena koda (za Admin Odbrojavanje)
export function getPromoRemainingTime(expiresAt: string): { expired: boolean; hours: number; minutes: number; seconds: number; formatted: string } {
  const diff = new Date(expiresAt).getTime() - Date.now();

  if (diff <= 0) {
    return { expired: true, hours: 0, minutes: 0, seconds: 0, formatted: 'Istekao' };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const formatted = `${hours}h ${minutes}m ${seconds}s`;

  return { expired: false, hours, minutes, seconds, formatted };
}
