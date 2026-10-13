// Telefon: BiH formati i međunarodni (dijaspora)
export function normalizePhone(raw: string): string | null {
  if (!raw) return null;

  // Uklanjanje razmaka, crtica, kosih crta i zagrada
  let p = raw.replace(/[\s\-().\/]/g, '');

  // Pretvaranje 00 u +
  if (p.startsWith('00')) p = '+' + p.slice(2);

  // Normalizacija BiH prefiksa u lokalni format (06x ili 03x/05x)
  if (p.startsWith('+387')) p = '0' + p.slice(4);
  else if (p.startsWith('387')) p = '0' + p.slice(3);

  // BiH format (fiksni i mobilni brojevi sa 8 ili 9 cifara, npr. 061123456 ili 033123456)
  if (/^0[3-7][0-9]{7,8}$/.test(p)) return p;

  // Međunarodni format za dijasporu (npr. +491512345678, +43660123456)
  if (/^\+[1-9][0-9]{7,14}$/.test(p)) return p;

  return null;
}

// Funkcija za brzu provjeru da li je uneseni telefon validan
export const isValidPhone = (v: string): boolean => {
  return normalizePhone(v) !== null;
};

// Validacija email adrese
export const isValidEmail = (v: string): boolean => 
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

const TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.con': 'gmail.com',
  'gmail.co': 'gmail.com', 'hotmial.com': 'hotmail.com', 'hotnail.com': 'hotmail.com',
  'yaho.com': 'yahoo.com', 'outlok.com': 'outlook.com',
};

export function suggestEmail(v: string): string | null {
  const [user, domain] = v.trim().toLowerCase().split('@');
  return domain && TYPOS[domain] ? user + '@' + TYPOS[domain] : null;
}

// Validacija imena i prezimena
export const isValidName = (v: string): boolean => 
  /^[\p{L}][\p{L} .'-]{1,49}$/u.test(v.trim());

// Validacija poštanskog broja - tačno 5 cifara (BiH standard)
export const isValidPostalCode = (v: string): boolean => 
  /^\d{5}$/.test(v.trim());
