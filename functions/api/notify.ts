interface Env {
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_IDS?: string;
  EMAILJS_SERVICE_ID?: string;
  EMAILJS_TEMPLATE_ID?: string;
  EMAILJS_AB_TEMPLATE_ID?: string;
  EMAILJS_PUBLIC_KEY?: string;
  EMAILJS_PRIVATE_KEY?: string;
  FIREBASE_API_KEY?: string;
  ADMIN_UIDS?: string;
  [key: string]: any;
}

const ALLOWED_ORIGINS = [
  'https://casualshopbih.pages.dev',
  'https://casualshop.ba'
];

async function isAdminRequest(request: Request, env: Env): Promise<boolean> {
  const auth = request.headers.get('Authorization') || '';
  const idToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  
  if (!idToken || !env.FIREBASE_API_KEY) return false;
  
  const res = await fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + env.FIREBASE_API_KEY,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }
  );
  
  if (!res.ok) return false;
  
  const data: any = await res.json();
  const uid = data?.users?.[0]?.localId;
  const admins = (env.ADMIN_UIDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  
  return !!uid && admins.includes(uid);
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

  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ error: 'Nedozvoljen domen.' }), { 
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin || ALLOWED_ORIGINS[0],
  };

  try {
    const body = await request.json().catch(() => ({}));
    const { type, text, orderData, cartData, followUpType, promoCode } = body;

    // KONTAKT FORMA
    if (type === 'contact') {
      const botToken = env.TELEGRAM_BOT_TOKEN;
      const chatIds = (env.TELEGRAM_CHAT_IDS || '').split(',').map(s => s.trim()).filter(Boolean);

      if (!botToken || chatIds.length === 0) {
        console.error('TELEGRAM_BOT_TOKEN ili TELEGRAM_CHAT_IDS nisu podešeni.');
        return new Response(JSON.stringify({ success: false, error: 'not_configured' }), { status: 500, headers });
      }

      if (text) {
        await Promise.all(chatIds.map(chatId => 
          fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: String(text).slice(0, 3500) })
          })
        ));
      }
      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    // NARUDŽBA (Telegram za admina + EmailJS za kupca)
    if (type === 'order' && orderData) {
      const botToken = env.TELEGRAM_BOT_TOKEN;
      const chatIds = (env.TELEGRAM_CHAT_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
      
      if (!botToken || chatIds.length === 0) {
        console.error('TELEGRAM_BOT_TOKEN ili TELEGRAM_CHAT_IDS nisu podešeni.');
        return new Response(JSON.stringify({ success: false, error: 'not_configured' }), { status: 500, headers });
      }

      const c = orderData.customer || {};
      const isPickup = c.address?.includes('Lično');
      const deliveryStatus = isPickup ? `Lično Sarajevo (${c.note || ''})` : `${c.city}, ${c.address}`;
      const itemsText = orderData.items.map((i: any) => `• ${i.quantity}x ${i.name} (${i.size})`).join('\n');
      
      const msg = `🛍️ NOVA NARUDŽBA #${orderData.orderNumber}\nKupac: ${c.firstName} ${c.lastName}\nIznos: ${orderData.total} KM\nDostava: ${deliveryStatus}\nTel: ${c.phone}\n\nArtikli:\n${itemsText}`;
      
      await Promise.all(chatIds.map(chatId => 
        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: String(msg).slice(0, 3500) })
        })
      ));

      const to = String(orderData?.customer?.email || '').trim();
      
      if (to && env.EMAILJS_SERVICE_ID && env.EMAILJS_TEMPLATE_ID && env.EMAILJS_PUBLIC_KEY) {
        const itemsSummary = orderData.items.map((i: any) => `${i.quantity}x ${i.name} (${i.size})`).join(', ');
        
        await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: env.EMAILJS_SERVICE_ID,
            template_id: env.EMAILJS_TEMPLATE_ID,
            user_id: env.EMAILJS_PUBLIC_KEY,
            accessToken: env.EMAILJS_PRIVATE_KEY,
            template_params: {
              to_email: to,
              customer_name: c.firstName || 'Kupac',
              order_number: orderData.orderNumber,
              order_total: Number(orderData.total).toFixed(2),
              order_items: itemsSummary
            }
          })
        });
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    // NAPUŠTENE KORPE (Sigurnosna verifikacija Admin tokena)
    if (type === 'abandoned') {
      if (!(await isAdminRequest(request, env))) {
        return new Response(JSON.stringify({ error: 'Neovlašteno.' }), { status: 401, headers });
      }

      const serviceId = env.EMAILJS_SERVICE_ID;
      const templateId = env.EMAILJS_AB_TEMPLATE_ID || env.EMAILJS_TEMPLATE_ID;
      const publicKey = env.EMAILJS_PUBLIC_KEY;

      if (!serviceId || !templateId || !publicKey || !cartData?.email) {
        return new Response(JSON.stringify({ error: 'Podaci za slanje nepotpuni.' }), { status: 400, headers });
      }

      const is5d = followUpType === '5d';
      const emailPayload = {
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        accessToken: env.EMAILJS_PRIVATE_KEY,
        template_params: {
          to_email: cartData.email,
          customer_name: cartData.customerName || 'Kupac',
          subject: is5d ? 'Poklon za vas: 10% popusta! 🎁' : 'Zaboravili ste artikle u korpi? 🛒',
          custom_message: is5d 
            ? `Iskoristite promo kod ${promoCode || 'CASUAL10'} za 10% popusta!`
            : 'Artikli u vašoj korpi vas čekaju, ali zalihe su ograničene.',
          cart_items: cartData.itemsSummary || 'Artikli iz korpe'
        }
      };

      const emailRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(emailPayload)
      });

      return new Response(JSON.stringify({ success: emailRes.ok }), { status: emailRes.status, headers });
    }

    return new Response(JSON.stringify({ error: 'Nepoznat tip zahtjeva.' }), { status: 400, headers });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
};