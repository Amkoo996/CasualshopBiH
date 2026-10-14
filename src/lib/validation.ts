// 1. Normalizacija i fleksibilna provjera brojeva telefona (BiH i inostranstvo)
export function normalizePhone(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (trimmed.length < 6) return null;

  // Uklanjanje razmaka, crtica, tačaka, zagrada i kosa crta
  let p = trimmed.replace(/[\s\-().\/]/g, '');

  // Formatiranje međunarodnih prefiksa
  if (p.startsWith('00')) p = '+' + p.slice(2);
  if (p.startsWith('+387')) p = '0' + p.slice(4);
  else if (p.startsWith('387')) p = '0' + p.slice(3);

  // Provjera: dozvoljava sve validne BiH mobilne i fiksne brojeve (06x, 03x, 05x)
  // te dijaspora brojeve dužine između 6 i 15 cifara
  const digitsOnly = p.replace(/\D/g, '');
  if (digitsOnly.length >= 6 && digitsOnly.length <= 15) {
    return p;
  }

  return null;
}

// Brza provjera ispravnosti telefona
export const isValidPhone = (v: string): boolean => {
  if (!v || !v.trim()) return false;
  return normalizePhone(v) !== null;
};

// 2. Validacija e-mail adrese
export const isValidEmail = (v: string): boolean => {
  if (!v || !v.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}\$/.test(v.trim());
};

const TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.co': 'gmail.com',
  'hotmial.com': 'hotmail.com',
  'hotnail.com': 'hotmail.com',
  'yaho.com': 'yahoo.com',
  'outlok.com': 'outlook.com',
};

export function suggestEmail(v: string): string | null {
  if (!v || !v.includes('@')) return null;
  const [user, domain] = v.trim().toLowerCase().split('@');
  return domain && TYPOS[domain] ? `${user}@${TYPOS[domain]}` : null;
}

// 3. Validacija imena i prezimena (podržava naša slova č, ć, ž, š, đ)
export const isValidName = (v: string): boolean => {
  if (!v || typeof v !== 'string') return false;
  const trimmed = v.trim();
  if (trimmed.length < 2 || trimmed.length > 60) return false;

  try {
    return new RegExp("^[\\p{L}][\\p{L} .'-]{1,59}\$", "u").test(trimmed);
  } catch {
    return /^[a-zA-ZčćžšđČĆŽŠĐ][a-zA-ZčćžšđČĆŽŠĐ .'-]{1,59}\$/i.test(trimmed);
  }
};

// 4. Validacija poštanskog broja (tačno 5 cifara za BiH)
export const isValidPostalCode = (v: string): boolean => {
  if (!v) return false;
  return /^\d{5}\$/.test(v.trim());
};

// 5. SHA-256 Hashing za praćenje narudžbi
export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}