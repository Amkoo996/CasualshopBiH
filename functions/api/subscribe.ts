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

// Generisanje Firestore Access Tokena (isto kao kod narudžbi)
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

  const pemContents = (sa.private_key || '')
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\\r/g, '')
    .replace(/\\n/g, '')
    .replace(/[\r\n\s]/g, '');

  let binaryDer = new Uint8Array(0);
  try {
    const binaryString = atob(pemContents);
    binaryDer = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) binaryDer[i] = binaryString.charCodeAt(i);
  } catch {}

  const key = await crypto.subtle.importKey(
    'pkcs8', binaryDer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );

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
      const parsed = new URL(urlStr);
      const host = parsed.hostname;
      if (
        host === 'casualshop.ba' ||
        host === 'www.casualshop.ba' ||
        host === 'casualshopbih.pages.dev' ||
        host.endsWith('.casualshopbih.pages.dev') ||
        host === 'localhost' ||
        host === '127.0.0.1'
      ) {
        return true;
      }
    } catch {}
    return false;
  };

  if (origin && checkUrl(origin)) return true;
  if (!origin && referer && checkUrl(referer)) return true;

  return false;
}

export const onRequestOptions = async (context: { request: Request }) => {
  const origin = context.request.headers.get('Origin') || '';
  const isAllowed = isOriginAllowed(context.request);
  const allowOrigin = isAllowed ? (origin || ALLOWED_ORIGINS[0]) : ALLOWED_ORIGINS[0];

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  if (!isOriginAllowed(request)) {
    return new Response(JSON.stringify({ error: 'Zabranjeno: Neprepoznat domen.' }), { 
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const responseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin || ALLOWED_ORIGINS[0],
  };

  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = body.email?.trim().toLowerCase();
    
    if (!email || !email.includes('@') || !email.includes('.')) {
      return new Response(
        JSON.stringify({ error: 'Neispravna email adresa.' }),
        { status: 400, headers: responseHeaders }
      );
    }

    const projectId = env.FIREBASE_PROJECT_ID;
    const sa = env.FIREBASE_SERVICE_ACCOUNT;
    
    // 1. Upis u Firebase bazu (Da bi se prikazalo u Admin -> Newsletter)
    if (projectId && sa) {
      try {
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

        await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/subscribers/${email}?updateMask.fieldPaths=email&updateMask.fieldPaths=subscribedAt&updateMask.fieldPaths=createdAt&updateMask.fieldPaths=consent`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(firestoreBody)
          }
        );
      } catch (fbErr) {
        console.error('Nije uspjelo upisivanje u Firebase:', fbErr);
        // Ne prekidamo funkciju ako Firebase padne, glavno je da ode na Brevo
      }
    }

    // 2. Slanje u Brevo
    const apiKey = env.BREVO_API_KEY?.trim();
    if (apiKey) {
      const listId = parseInt(env.BREVO_LIST_ID?.trim() || '2', 10);
      
      const res = await fetch('https://api.brevo.com/v3/contacts', {
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
        }),
      });

      const responseText = await res.text();
      
      if (!res.ok && res.status !== 201 && res.status !== 204 && !responseText.includes('duplicate_parameter') && !responseText.includes('already exists')) {
        console.error('Brevo API error:', res.status, responseText);
      }
    }

    // Vraćamo uspjeh bez obzira na sve, pod uvjetom da je email poslat u sistem
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: responseHeaders,
    });

  } catch (err: any) {
    console.error('Sistemska greška u Brevo Workeru:', err);
    return new Response(JSON.stringify({ error: 'Greška na serveru.' }), {
      status: 500,
      headers: responseHeaders,
    });
  }
};
