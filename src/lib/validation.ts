// 1. Provjera i normalizacija e-mail adrese (podržava brojeve, točke, crtice i podvlake)
export const isValidEmail = (v: string): boolean => {
  if (!v || typeof v !== 'string') return false;
  const trimmed = v.trim();
  if (trimmed.length < 5 || trimmed.length > 100) return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed);
};

// 2. Normalizacija i provjera brojeva telefona
export function normalizePhone(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (trimmed.length < 6) return null;

  let p = trimmed.replace(/[\s\-().\/]/g, '');

  if (p.startsWith('00')) p = '+' + p.slice(2);
  if (p.startsWith('+387')) p = '0' + p.slice(4);
  else if (p.startsWith('387')) p = '0' + p.slice(3);

  const digitsOnly = p.replace(/\D/g, '');
  if (digitsOnly.length >= 6 && digitsOnly.length <= 15) {
    return p;
  }

  return null;
}

export const isValidPhone = (v: string): boolean => {
  if (!v || !v.trim()) return false;
  return normalizePhone(v) !== null;
};

// 3. Provjera imena i prezimena (podržava slova č, ć, ž, š, đ)
export const isValidName = (v: string): boolean => {
  if (!v || typeof v !== 'string') return false;
  const trimmed = v.trim();
  if (trimmed.length < 2 || trimmed.length > 60) return false;

  try {
    return new RegExp("^[\\p{L}][\\p{L} .'-]{1,59}$", "u").test(trimmed);
  } catch {
    return /^[a-zA-ZčćžšđČĆŽŠĐ][a-zA-ZčćžšđČĆŽŠĐ .'-]{1,59}$/i.test(trimmed);
  }
};

// 4. Provjera poštanskog broja (5 znamenki za BiH)
export const isValidPostalCode = (v: string): boolean => {
  if (!v) return false;
  const digits = v.trim().replace(/\D/g, '');
  return digits.length === 5;
};

// 5. Sugestija za tipfelere u e-mail domenama
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

// 6. SHA-256 Hash funkcija
export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}