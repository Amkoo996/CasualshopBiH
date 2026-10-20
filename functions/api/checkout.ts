const ALLOWED_ORIGINS = [
  'https://casualshopbih.pages.dev',
  'https://casualshop.ba',
  'http://localhost:3000',
];

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

export const onRequestPost = async (context: { request: Request; env: any }) => {
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
    const body = await request.json().catch(() => ({}));
    const { items, promoCode, shippingFee, clientTotal } = body as any;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'Korpa je prazna.' }), { status: 400, headers });
    }

    if (!env.FIREBASE_PROJECT_ID) {
      console.error('Nedostaje FIREBASE_PROJECT_ID u Cloudflare varijablama.');
      // Fallback za klijenta ako niste još unijeli varijablu (dozvoljava prolaz za testiranje)
      return new Response(JSON.stringify({ success: true, serverTotal: clientTotal }), { status: 200, headers });
    }

    let calculatedSubtotal = 0;
    const projectId = env.FIREBASE_PROJECT_ID;

    // 1. Provjera pravih cijena iz baze (Server-side)
    for (const item of items) {
      const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products/${item.id}`);
      if (!res.ok) {
        return new Response(JSON.stringify({ error: `Artikal ${item.name} nije pronađen u bazi.` }), { status: 404, headers });
      }
      const data: any = await res.json();
      const realPrice = data.fields?.price?.doubleValue || data.fields?.price?.integerValue || 0;
      
      calculatedSubtotal += Number(realPrice) * item.quantity;
    }

    // 2. Kalkulacija popusta na serveru
    let discountPercent = 0;
    if (promoCode) {
      const promoRes = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/promo_codes/${promoCode.toUpperCase()}`);
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

    // 3. Sigurnosna provjera: Da li se cijena iz browsera poklapa sa pravom cijenom?
    if (Math.abs(finalServerTotal - clientTotal) > 0.5) { // Tolerancija od 0.5 KM zbog zaokruživanja
      return new Response(JSON.stringify({ 
        error: 'Cijena narudžbe nije ispravna. Molimo osvježite stranicu i pokušajte ponovo.' 
      }), { status: 400, headers });
    }

    // Ako je sve u redu, vraćamo zeleno svjetlo klijentu da nastavi sa upisom
    return new Response(JSON.stringify({ success: true, serverTotal: finalServerTotal }), { status: 200, headers });

  } catch (err: any) {
    console.error('Server-side greška:', err);
    return new Response(JSON.stringify({ error: 'Sistemska greška pri validaciji cijena.' }), { status: 500, headers });
  }
};