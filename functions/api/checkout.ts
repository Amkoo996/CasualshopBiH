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

function toFirestoreValue(val: any): any {
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
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

async function getFirestoreAccessToken(serviceAccountJson: string): Promise<string> {
  let sa: any;
  try {
    sa = typeof serviceAccountJson === 'string' ? JSON.parse(serviceAccountJson) : serviceAccountJson;
    if (typeof sa === 'string') {
      sa = JSON.parse(sa);
    }
  } catch (err: any) {
    throw new Error(`FIREBASE_SERVICE_ACCOUNT nije ispravan JSON format: ${err?.message}`);
  }

  if (!sa || !sa.client_email || !sa.private_key) {
    throw new Error('Nedostaju client_email ili private_key u FIREBASE_SERVICE_ACCOUNT varijabli.');
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
    btoa(JSON.stringify(obj))
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const dataToSign = `${base64UrlEncode(header)}.${base64UrlEncode(payload)}`;

  // Temeljito čišćenje svih formata novih redova i razmaka iz PEM ključa
  const rawKey = sa.private_key || '';
  const pemContents = rawKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\\r/g, '')
    .replace(/\\n/g, '')
    .replace(/[\r\n\s]/g, '');

  let binaryDer: Uint8Array;
  try {
    const binaryString = atob(pemContents);
    binaryDer = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      binaryDer[i] = binaryString.charCodeAt(i);
    }
  } catch (b64Err: any) {
    throw new Error(`Greška pri Base64 dekodiranju privatnog ključa (atob): ${b64Err?.message}`);
  }

  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );
  } catch (keyErr: any) {
    throw new Error(`crypto.subtle.importKey odbio ključ: ${keyErr?.message}`);
  }

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(dataToSign));

  const sigBytes = new Uint8Array(signature);
  let binarySig = '';
  for (let i = 0; i < sigBytes.length; i++) {
    binarySig += String.fromCharCode(sigBytes[i]);
  }

  const encodedSignature = btoa(binarySig)
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${dataToSign}.${encodedSignature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google OAuth odbio token (${res.status}): ${errorText}`);
  }

  const tokens: any = await res.json();
  if (!tokens?.access_token) {
    throw new Error('Google OAuth nije vratio access_token.');
  }

  return tokens.access_token;
}

export const onRequestOptions = async (context: { request: Request }) => {
  const origin = context.request.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin);
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};

export const onRequestGet = async () => {
  return new Response(
    JSON.stringify({
      status: 'online',
      service: 'Casual Shop Checkout API',
      message: 'API je aktivan. Narudžbe se obrađuju isključivo putem POST zahtjeva.',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  if (!ALLOWED_ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ error: 'Zabranjeno' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin,
  };

  try {
    const body: any = await request.json().catch(() => ({}));
    const { items, promoCode, shippingFee, clientTotal, customer, orderNumber, paymentMethod } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'Korpa je prazna.' }), { status: 400, headers });
    }

    if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_SERVICE_ACCOUNT) {
      console.error('Nedostaju FIREBASE_PROJECT_ID ili FIREBASE_SERVICE_ACCOUNT varijable.');
      return new Response(
        JSON.stringify({ error: 'Nedostaju FIREBASE_PROJECT_ID ili FIREBASE_SERVICE_ACCOUNT na serveru.' }),
        { status: 500, headers }
      );
    }

    const projectId = env.FIREBASE_PROJECT_ID;
    const accessToken = await getFirestoreAccessToken(env.FIREBASE_SERVICE_ACCOUNT);
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    let calculatedSubtotal = 0;

    // 1. PROVJERA CIJENA I ZALIHA U BAZI
    for (const item of items) {
      if (typeof item.quantity !== 'number' || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
        return new Response(JSON.stringify({ error: `Nevažeća količina za artikal: ${item.name}` }), { status: 400, headers });
      }

      const res = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products/${item.id}`,
        { headers: authHeader }
      );

      if (!res.ok) {
        const errorText = await res.text();
        return new Response(
          JSON.stringify({ error: `Artikal "${item.name}" (ID: ${item.id}) nije pronađen u bazi: ${errorText}` }),
          { status: 404, headers }
        );
      }

      const productDoc: any = await res.json();
      const realPrice = productDoc.fields?.price?.doubleValue || productDoc.fields?.price?.integerValue || 0;
      const currentStock = productDoc.fields?.sizes?.mapValue?.fields?.[item.size]?.integerValue || 0;

      if (Number(currentStock) < item.quantity) {
        return new Response(
          JSON.stringify({ error: `Nema dovoljno zaliha za: ${item.name} (Veličina: ${item.size})` }),
          { status: 400, headers }
        );
      }

      calculatedSubtotal += Number(realPrice) * item.quantity;
    }

    // 2. PROVJERA PROMO KODA
    let discountPercent = 0;
    let promoRef = '';

    if (promoCode) {
      const promoRes = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/promo_codes/${promoCode.toUpperCase()}`,
        { headers: authHeader }
      );
      if (promoRes.ok) {
        const promoData: any = await promoRes.json();
        const isActive = promoData.fields?.active?.booleanValue ?? true;
        const isUsed = promoData.fields?.used?.booleanValue ?? false;

        const promoMaxUsage = promoData.fields?.maxUsage?.integerValue || 0;
        const promoUsageCount = promoData.fields?.usageCount?.integerValue || 0;
        const limitReached = Number(promoMaxUsage) > 0 && Number(promoUsageCount) >= Number(promoMaxUsage);

        if (isActive && !isUsed && !limitReached) {
          discountPercent = promoData.fields?.discountPercent?.integerValue || promoData.fields?.discountPercent?.doubleValue || 0;
          promoRef = `projects/${projectId}/databases/(default)/documents/promo_codes/${promoCode.toUpperCase()}`;
        }
      }
    }

    const discountAmount = (calculatedSubtotal * Number(discountPercent)) / 100;
    const finalServerTotal = calculatedSubtotal - discountAmount + Number(shippingFee || 0);

    // 3. SIGURNOSNA PROVJERA FINALNOG IZNOSA
    if (Math.abs(finalServerTotal - clientTotal) > 0.5) {
      return new Response(
        JSON.stringify({ error: `Prijavljena cijena (${clientTotal} KM) se ne poklapa sa bazom (${finalServerTotal} KM). Osvježite stranicu.` }),
        { status: 400, headers }
      );
    }

    const createdAt = new Date().toISOString();

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

    // 4. REST API COMMIT - ATOMARAN UPIS I SKIDANJE ZALIHA
    const writes: any[] = [];

    writes.push({
      update: {
        name: `projects/${projectId}/databases/(default)/documents/orders/${orderNumber}`,
        fields: toFirestoreValue(fullOrderObject).mapValue.fields,
      },
      currentDocument: { exists: false },
    });

    writes.push({
      update: {
        name: `projects/${projectId}/databases/(default)/documents/order_tracking/${orderNumber}`,
        fields: toFirestoreValue({ orderNumber, status: 'Nova', createdAt }).mapValue.fields,
      },
      currentDocument: { exists: false },
    });

    for (const item of items) {
      writes.push({
        transform: {
          document: `projects/${projectId}/databases/(default)/documents/products/${item.id}`,
          fieldTransforms: [
            {
              fieldPath: `sizes.${item.size}`,
              increment: { integerValue: String(-item.quantity) },
            },
          ],
        },
      });
    }

    if (promoRef) {
      writes.push({
        transform: {
          document: promoRef,
          fieldTransforms: [{ fieldPath: 'usageCount', increment: { integerValue: '1' } }],
        },
      });
    }

    const commitRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default):commit`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ writes }),
      }
    );

    if (!commitRes.ok) {
      const commitError = await commitRes.text();
      console.error('Greška pri commitu u Firebase:', commitError);
      return new Response(
        JSON.stringify({ error: `Sistemska greška pri upisu u bazu: ${commitError}` }),
        { status: 500, headers }
      );
    }

    // 5. SLANJE NOTIFIKACIJA PREKO /api/notify (Telegram i E-mail)
    try {
      const baseUrl = request.url.split('/api/')[0];
      await fetch(`${baseUrl}/api/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: baseUrl,
        },
        body: JSON.stringify({
          type: 'order',
          orderData: fullOrderObject,
        }),
      });
    } catch (notifyErr) {
      console.error('Slanje notifikacije nije uspjelo:', notifyErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId: orderNumber,
        message: 'Narudžba kreirana i zalihe ažurirane uspješno.',
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    console.error('Server-side greška:', err);
    return new Response(
      JSON.stringify({ error: `Sistemska greška: ${err?.message || String(err)}` }),
      { status: 500, headers }
    );
  }
};
