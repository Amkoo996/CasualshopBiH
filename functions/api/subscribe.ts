interface Env {
  BREVO_API_KEY?: string;
  BREVO_LIST_ID?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_SERVICE_ACCOUNT?: string;
  [key: string]: any;
}

const ALLOWED_ORIGINS = [
  'https://casualshopbih.pages.dev',
  'https://casualshop.ba',
  'https://www.casualshop.ba',
  'http://localhost:3000',
];

async function getFirestoreAccessToken(serviceAccountJson: string): Promise<string> {
  let sa: any;
  try {
    sa = typeof serviceAccountJson === 'string' ? JSON.parse(serviceAccountJson) : serviceAccountJson;
    if (typeof sa === 'string') sa = JSON.parse(sa);
  } catch (err: any) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT greška.');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const base64UrlEncode = (obj: any) =>
    btoa(JSON.stringify(obj)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

  const dataToSign = `${base64UrlEncode(header)}.${base64UrlEncode(payload)}`;
  const pemContents = (sa.private_key || '').replace(/-----BEGIN PRIVATE KEY-----/g, '').replace(/-----END PRIVATE KEY-----/g, '').replace(/\\r/g, '').replace(/\\n/g, '').replace(/[\r\n\s]/g, '');

  let binaryDer = new Uint8Array(0);
  try {
    const binaryString = atob(pemContents);
    binaryDer = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) binaryDer[i] = binaryString.charCodeAt(i);
  } catch {}

  const key = await crypto.subtle.importKey('pkcs8', binaryDer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(dataToSign));
  
  let binarySig = '';
  const sigBytes = new Uint8Array(signature);
  for (let i = 0; i < sigBytes.length; i++) binarySig += String.fromCharCode(sigBytes[i]);

  const encodedSignature = btoa(binarySig).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwt = `${dataToSign}.${encodedSignature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokens: any = await res.json();
  return tokens.access_token;
}

function isOriginAllowed(request: Request): boolean {
  const origin = request.headers.get('Origin') || '';
  const referer = request.headers.get('Referer') || '';
  const checkUrl = (urlStr: string): boolean => {
    try {
      const host = new URL(urlStr).hostname;
      return ['casualshop.ba', 'www.casualshop.ba', 'casualshopbih.pages.dev', 'localhost', '127.0.0.1'].includes(host) || host.endsWith('.casualshopbih.pages.dev');
    } catch {}
    return false;
  };
  return (origin && checkUrl(origin)) || (!origin && referer && checkUrl(referer)) || false;
}

export const onRequestOptions = async (context: { request: Request }) => {
  const origin = context.request.headers.get('Origin') || '';
  const allowOrigin = isOriginAllowed(context.request) ? (origin || ALLOWED_ORIGINS[0]) : ALLOWED_ORIGINS[0];
  return new Response(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': allowOrigin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
  });
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  if (!isOriginAllowed(request)) {
    return new Response(JSON.stringify({ error: 'Zabranjeno.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const responseHeaders = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin || ALLOWED_ORIGINS[0] };

  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = body.email?.trim().toLowerCase();
    
    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Neispravna email adresa.' }), { status: 400, headers: responseHeaders });
    }

    // LISTA ZADATAKA: Umjesto da čekamo jedan pa drugi, stavljamo ih na listu da se pokrenu zajedno
    const tasks: Promise<any>[] = [];

    // ZADATAK 1: BREVO (Veoma brz proces, završi se za 0.5 sec)
    const apiKey = env.BREVO_API_KEY?.trim();
    if (apiKey) {
      const listId = parseInt(env.BREVO_LIST_ID?.trim() || '2', 10);
      const brevoTask = fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          email: email,
          listIds: [listId],
          updateEnabled: true,
          emailBlacklisted: false
        }),
      }).then(async (res) => {
        const text = await res.text();
        console.log('Brevo status:', res.status, text); // Ovo će ostati u Cloudflare logovima
      }).catch(err => console.error('Brevo network greška:', err));
      
      tasks.push(brevoTask);
    }

    // ZADATAK 2: FIREBASE (Spor proces zbog generisanja kriptografskih ključeva)
    const projectId = env.FIREBASE_PROJECT_ID;
    const sa = env.FIREBASE_SERVICE_ACCOUNT;
    if (projectId && sa) {
      const firebaseTask = (async () => {
        const accessToken = await getFirestoreAccessToken(sa);
        const isoDate = new Date().toISOString();
        const firestoreBody = {
          fields: {
            email: { stringValue: email },
            subscribedAt: { stringValue: isoDate },
            createdAt: { stringValue: isoDate },
            consent: { booleanValue: true }
          }
        };
        await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/subscribers/${email}?updateMask.fieldPaths=email&updateMask.fieldPaths=subscribedAt&updateMask.fieldPaths=createdAt&updateMask.fieldPaths=consent`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
          body: JSON.stringify(firestoreBody)
        });
      })().catch(err => console.error('Firebase upis error:', err));
      
      tasks.push(firebaseTask);
    }

    // POKRETANJE ISTOVREMENO: Promise.allSettled osigurava da oba procesa teku paralelno, 
    // pa ako je Firebase spor, Brevo će svejedno uspjeti proći prije nego što funkcija stane.
    await Promise.allSettled(tasks);

    // Frontendu se odmah vraća success čim se pošalju zahtjevi (ubrzava dugme "Prijava")
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: responseHeaders });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Server greška.' }), { status: 500, headers: responseHeaders });
  }
};
