interface Env {
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

// Pomoćna funkcija koja pretvara običan JS objekat u format koji zahtijeva Firestore REST API
function toFirestoreValue(val: any): any {
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: val } : { doubleValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === 'object' && val !== null) {
    const fields: any = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { nullValue: null };
}

// Funkcija za generisanje OAuth2 Tokena iz Firebase Service Accounta direktno u Cloudflare Workeru
async function getFirestoreAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const base64UrlEncode = (obj: any) => btoa(JSON.stringify(obj)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const dataToSign = `${base64UrlEncode(header)}.${base64UrlEncode(payload)}`;

  const pemContents = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
    
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(dataToSign));
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=+\$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwt = `${dataToSign}.${encodedSignature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  
  if (!res.ok) throw new Error('Greška pri kreiranju Firestore tokena');
  const tokens: any = await res.json();
  return tokens.access_token;
}

export const onRequestOptions = async (context: { request: Request }) => {
  const origin = context.request.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin);
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  if (!ALLOWED_ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ error: 'Zabranjeno' }), { status: 403 });
  }

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin,
  };

  try {
    const body: any = await request.json().catch(() => ({}));
    const { items, promoCode, shippingFee, clientTotal, customer, orderNumber, paymentMethod, subtotal } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'Korpa je prazna.' }), { status: 400, headers });
    }

    if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_SERVICE_ACCOUNT) {
      console.error('Nedostaju FIREBASE_PROJECT_ID ili FIREBASE_SERVICE_ACCOUNT varijable.');
      return new Response(JSON.stringify({ error: 'Sistemska greška na serveru.' }), { status: 500, headers });
    }

    const projectId = env.FIREBASE_PROJECT_ID;
    const accessToken = await getFirestoreAccessToken(env.FIREBASE_SERVICE_ACCOUNT);
    const authHeader = { 'Authorization': `Bearer ${accessToken}` };

    let calculatedSubtotal = 0;

    // 1. PROVJERA CIJENA I ZALIHA U BAZI (Server-side)
    for (const item of items) {
      const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products/${item.id}`, { headers: authHeader });
      
      if (!res.ok) {
        return new Response(JSON.stringify({ error: `Artikal ${item.name} nije pronađen.` }), { status: 404, headers });
      }
      
      const productDoc: any = await res.json();
      const realPrice = productDoc.fields?.price?.doubleValue || productDoc.fields?.price?.integerValue || 0;
      
      // Provjera raspoloživih zaliha (ako fali, zaustavljamo proces)
      const currentStock = productDoc.fields?.sizes?.mapValue?.fields?.[item.size]?.integerValue || 0;
      if (Number(currentStock) < item.quantity) {
        return new Response(JSON.stringify({ error: `Nema dovoljno zaliha za: ${item.name} (Veličina: ${item.size})` }), { status: 400, headers });
      }

      calculatedSubtotal += Number(realPrice) * item.quantity;
    }

    // 2. PROVJERA PROMO KODA
    let discountPercent = 0;
    if (promoCode) {
      const promoRes = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/promo_codes/${promoCode.toUpperCase()}`, { headers: authHeader });
      if (promoRes.ok) {
        const promoData: any = await promoRes.json();
        const isActive = promoData.fields?.active?.booleanValue ?? true;
        const isUsed = promoData.fields?.used?.booleanValue ?? false;
        if (isActive && !isUsed) {
          discountPercent = promoData.fields?.discountPercent?.integerValue || promoData.fields?.discountPercent?.doubleValue || 0;
        }
      }
    }

    const discountAmount = (calculatedSubtotal * Number(discountPercent)) / 100;
    const finalServerTotal = calculatedSubtotal - discountAmount + Number(shippingFee || 0);

    // 3. SIGURNOSNA PROVJERA FINALNOG IZNOSA
    if (Math.abs(finalServerTotal - clientTotal) > 0.5) {
      return new Response(JSON.stringify({ error: 'Prijavljena cijena se ne poklapa sa bazom. Osvježite stranicu i pokušajte ponovo.' }), { status: 400, headers });
    }

    const createdAt = new Date().toISOString();
    
    // Objekat narudžbe za upis u bazu
    const fullOrderObject = {
      id: orderNumber,
      orderNumber,
      items,
      customer,
      subtotal: calculatedSubtotal,
      shippingFee: Number(shippingFee || 0),
      total: finalServerTotal,
      paymentMethod: paymentMethod || 'cash_on_delivery',
      status: 'Nova',
      createdAt,
      promoCode: promoCode || null,
      discountAmount,
    };

    // 4. REST API COMMIT - ATOMARAN UPIS (Zapisivanje narudžbe i skidanje zaliha)
    const writes: any[] = [];

    // Kreiranje dokumenta u "orders"
    writes.push({
      update: {
        name: `projects/${projectId}/databases/(default)/documents/orders/${orderNumber}`,
        fields: toFirestoreValue(fullOrderObject).mapValue.fields
      },
      currentDocument: { exists: false }
    });

    // Kreiranje dokumenta u "order_tracking"
    writes.push({
      update: {
        name: `projects/${projectId}/databases/(default)/documents/order_tracking/${orderNumber}`,
        fields: toFirestoreValue({ orderNumber, status: 'Nova', createdAt }).mapValue.fields
      },
      currentDocument: { exists: false }
    });

    // Transformacija zaliha u "products" (oduzimanje količine direktno u bazi)
    for (const item of items) {
      writes.push({
        transform: {
          document: `projects/${projectId}/databases/(default)/documents/products/${item.id}`,
          fieldTransforms: [
            {
              fieldPath: `sizes.${item.size}`,
              increment: { integerValue: -item.quantity }
            }
          ]
        }
      });
    }

    const commitRes = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default):commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ writes })
    });

    if (!commitRes.ok) {
      console.error('Greška pri commitu u Firebase:', await commitRes.text());
      return new Response(JSON.stringify({ error: 'Sistemska greška pri upisu u bazu. Možda su zalihe u međuvremenu nestale.' }), { status: 500, headers });
    }

    // 5. SLANJE NOTIFIKACIJA PREKO /api/notify (Telegram i E-mail)
    try {
      const baseUrl = request.url.split('/api/')[0]; // Dohvatamo root url (https://casualshop.ba)
      await fetch(`${baseUrl}/api/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'order',
          orderData: fullOrderObject
        })
      });
    } catch (notifyErr) {
      console.error('Slanje notifikacije nije uspjelo (narudžba je ipak kreirana):', notifyErr);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      orderId: orderNumber,
      message: 'Narudžba kreirana i zalihe ažurirane uspješno.'
    }), { status: 200, headers });

  } catch (err: any) {
    console.error('Server-side greška:', err);
    return new Response(JSON.stringify({ error: 'Sistemska greška pri checkoutu.' }), { status: 500, headers });
  }
};