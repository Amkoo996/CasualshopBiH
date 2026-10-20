interface Env {
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CONTACT_BOT_TOKEN?: string;
  TELEGRAM_CHAT_IDS?: string;
  EMAILJS_SERVICE_ID?: string;
  EMAILJS_TEMPLATE_ID?: string;
  EMAILJS_AB_TEMPLATE_ID?: string;
  EMAILJS_PUBLIC_KEY?: string;
  EMAILJS_PRIVATE_KEY?: string;
  FIREBASE_API_KEY?: string;
  FIREBASE_PROJECT_ID?: string;
  ADMIN_UIDS?: string;
  [key: string]: any;
}

const ALLOWED_ORIGINS = [
  'https://casualshopbih.pages.dev',
  'https://casualshop.ba',
  'https://www.casualshop.ba', // ISPRAVLJENO: Dodana www poddomena
  'http://localhost:3000',
];

async function checkAdminStatus(request: Request, env: Env): Promise<{ ok: boolean; message?: string }> {
  const auth = request.headers.get('Authorization') || '';
  const idToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  
  if (!idToken) {
    return { ok: false, message: 'Nije autorizovano.' };
  }
  
  if (!env.FIREBASE_API_KEY) {
    console.error('Nedostaje FIREBASE_API_KEY');
    return { ok: false, message: 'Nije autorizovano.' };
  }
  
  const res = await fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + env.FIREBASE_API_KEY,
    { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ idToken }) 
    }
  );
  
  if (!res.ok) {
    console.error('Firebase odbio token:', res.status);
    return { ok: false, message: 'Nije autorizovano.' };
  }
  
  const data: any = await res.json();
  const uid = data?.users?.[0]?.localId;
  const admins = (env.ADMIN_UIDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  
  if (admins.length === 0 || !uid || !admins.includes(uid)) {
    console.error('UID nije u ADMIN_UIDS listi');
    return { ok: false, message: 'Nije autorizovano.' };
  }
  
  return { ok: true };
}

export const onRequestOptions = async (context: { request: Request }) => {
  const origin = context.request.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin);

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  // ISPRAVLJENO: Striktna Origin provjera
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ error: 'Zabranjeno' }), { 
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin,
  };

  try {
    const body = await request.json().catch(() => ({}));
    const { type, text, orderData, cartData, followUpType, promoCode } = body;

    // 1. KONTAKT FORMA - SPAM ZAŠTITA
    if (type === 'contact') {
      const botToken = env.TELEGRAM_CONTACT_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN;
      const chatIds = (env.TELEGRAM_CHAT_IDS || '').split(',').map(s => s.trim()).filter(Boolean);

      if (!botToken || chatIds.length === 0) {
        return new Response(JSON.stringify({ success: false, error: 'Sistemska greška' }), { status: 500, headers });
      }

      // Validacija teksta da spriječimo zloupotrebu botova
      if (!text || typeof text !== 'string' || text.trim().length < 5 || text.length > 2000) {
         return new Response(JSON.stringify({ error: 'Nevažeći tekst poruke.' }), { status: 400, headers });
      }

      await Promise.all(chatIds.map(chatId => 
        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: String(text).trim().slice(0, 2000) })
        })
      ));
      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    // 2. NARUDŽBE - PROVJERA BAZE (Spriječavanje lažnih notifikacija)
    if (type === 'order' && orderData) {
      const botToken = env.TELEGRAM_BOT_TOKEN;
      const chatIds = (env.TELEGRAM_CHAT_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
      const projectId = env.FIREBASE_PROJECT_ID;

      // Ako je podešen Project ID, server će provjeriti da li narudžba ZAISTA postoji u bazi
      // prije nego što pošalje obavještenje. Ovo rješava "Bloker 4" za lažiranje Origina.
      if (projectId && orderData.orderNumber) {
        const orderRes = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/orders/${orderData.orderNumber}`);
        if (!orderRes.ok) {
           return new Response(JSON.stringify({ error: 'Narudžba nije validirana u bazi.' }), { status: 403, headers });
        }
      }

      const c = orderData.customer || {};
      const isPickup = c.address?.includes('Lično');
      const deliveryStatus = isPickup ? `Lično Sarajevo (${c.note || ''})` : `${c.city}, ${c.address}`;
      const itemsText = (orderData.items || []).map((i: any) => `• ${i.quantity}x ${i.name} (${i.size})`).join('\n');
      
      if (botToken && chatIds.length > 0) {
        const msg = `🛍️ NOVA NARUDŽBA #${orderData.orderNumber}\nKupac: ${c.firstName} ${c.lastName}\nIznos: ${orderData.total} KM\nDostava: ${deliveryStatus}\nTel: ${c.phone}\n\nArtikli:\n${itemsText}`;
        
        await Promise.all(chatIds.map(chatId => 
          fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ chat_id: chatId, text: String(msg).slice(0, 3500) })
          })
        ));
      }

      const to = String(orderData?.customer?.email || '').trim();
      if (to && env.EMAILJS_SERVICE_ID && env.EMAILJS_TEMPLATE_ID && env.EMAILJS_PUBLIC_KEY) {
        const itemsTextEmail = (orderData.items || []).map((i: any) => `👉 ${i.quantity}x ${i.name} (Veličina: ${i.size})`).join('\n');
        
        const emailBody = `Poštovani/a ${c.firstName || 'Kupac'},\n\nHvala Vam na povjerenju! Vaša narudžba #${orderData.orderNumber} je uspješno zaprimljena i trenutno je u obradi.\n\nDetalji narudžbe:\n${itemsTextEmail}\n\n💰 Ukupan iznos za platiti: ${Number(orderData.total).toFixed(2)} KM\n📦 Način dostave: ${deliveryStatus}\n\nUkoliko imate bilo kakvih pitanja ili želite napraviti izmjenu, slobodno odgovorite na ovaj e-mail.\n\nLijep pozdrav,\nCasual Shop BiH tim`;

        const orderEmailPayload: any = {
          service_id: env.EMAILJS_SERVICE_ID,
          template_id: env.EMAILJS_TEMPLATE_ID,
          user_id: env.EMAILJS_PUBLIC_KEY,
          template_params: {
            to_email: to,
            customer_email: to,
            subject: `Potvrda narudžbe #${orderData.orderNumber} - Casual Shop BiH`,
            email_body: emailBody
          }
        };

        if (env.EMAILJS_PRIVATE_KEY) orderEmailPayload.accessToken = env.EMAILJS_PRIVATE_KEY;

        await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderEmailPayload)
        });
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    // 3. NAPUŠTENE KORPE (Već zaštićeno sa checkAdminStatus)
    if (type === 'abandoned') {
      const adminCheck = await checkAdminStatus(request, env);
      if (!adminCheck.ok) {
        return new Response(JSON.stringify({ error: adminCheck.message }), { status: 401, headers });
      }

      const serviceId = env.EMAILJS_SERVICE_ID;
      const templateId = env.EMAILJS_AB_TEMPLATE_ID; 
      const publicKey = env.EMAILJS_PUBLIC_KEY;

      if (!serviceId || !templateId || !publicKey || !cartData?.email) {
        return new Response(JSON.stringify({ error: 'Sistemska greška' }), { status: 400, headers });
      }

      const is5d = followUpType === '5d';
      let formattedItems = '';
      if (cartData.items && Array.isArray(cartData.items) && cartData.items.length > 0) {
        formattedItems = cartData.items
          .map((i: any) => `👉 ${i.quantity}x ${i.name} (Veličina: ${i.size}) - ${(Number(i.price) * Number(i.quantity)).toFixed(2)} KM`)
          .join('\n');
        const total = cartData.total ? Number(cartData.total).toFixed(2) : '0.00';
        formattedItems += `\n\n💰 Ukupna vrijednost korpe: ${total} KM`;
      } else {
        formattedItems = cartData.itemsSummary || 'Vaši odabrani artikli';
      }

      const emailPayload: any = {
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: {
          to_email: cartData.email,
          customer_name: cartData.customerName || 'Kupac',
          subject: is5d ? 'Poklon za vas: 10% popusta! 🎁' : 'Zaboravili ste artikle u korpi? 🛒',
          custom_message: is5d 
            ? `Primijetili smo da ste ostavili neke artikle u korpi. Kao mali znak pažnje, poklanjamo vam promo kod "${promoCode || 'CASUAL10'}" za 10% popusta na vašu narudžbu!\nIskoristite ga na kasi i završite svoju kupovinu.`
            : 'Primijetili smo da niste završili kupovinu. Artikli u vašoj korpi vas i dalje čekaju, ali su naše zalihe ograničene. Osigurajte svoje komade na vrijeme!',
          cart_items: formattedItems
        }
      };

      if (env.EMAILJS_PRIVATE_KEY) emailPayload.accessToken = env.EMAILJS_PRIVATE_KEY;

      const emailRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(emailPayload)
      });

      if (!emailRes.ok) {
        return new Response(JSON.stringify({ error: 'Sistemska greška' }), { status: emailRes.status, headers });
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: 'Nepoznat tip zahtjeva.' }), { status: 400, headers });
  } catch (err: any) {
    console.error('Sistemska greška:', err);
    return new Response(JSON.stringify({ error: 'Sistemska greška' }), { status: 500, headers });
  }
};