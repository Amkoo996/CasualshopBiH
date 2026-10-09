// Telefon: BiH formati i međunarodni (dijaspora)
export function normalizePhone(raw: string): string | null {
  let p = raw.replace(/[\s\-().\/]/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  if (p.startsWith('+387')) p = '0' + p.slice(4);
  else if (p.startsWith('387')) p = '0' + p.slice(3);
  
  if (/^0[3-7][0-9]{7,8}$/.test(p)) return p;       // BiH, npr. 061123456
  if (/^\+[1-9][0-9]{7,14}$/.test(p)) return p;     // inostrani broj
  return null;
}

export const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

const TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.con': 'gmail.com',
  'gmail.co': 'gmail.com', 'hotmial.com': 'hotmail.com', 'hotnail.com': 'hotmail.com',
  'yaho.com': 'yahoo.com', 'outlok.com': 'outlook.com',
};

export function suggestEmail(v: string): string | null {
  const [user, domain] = v.trim().toLowerCase().split('@');
  return domain && TYPOS[domain] ? user + '@' + TYPOS[domain] : null;
}

export const isValidName = (v: string) => /^[\p{L}][\p{L} .'-]{1,49}$/u.test(v.trim());
