interface Env {
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_IDS?: string;
  EMAILJS_SERVICE_ID?: string;
  EMAILJS_TEMPLATE_ID?: string;
  EMAILJS_AB_TEMPLATE_ID?: string;
  EMAILJS_PUBLIC_KEY?: string;
  ADMIN_SECRET_KEY?: string; // Tajni ključ za admin akcije
  [key: string]: any;
}

const ALLOWED_ORIGINS = [
  'https://casualshopbih.pages.dev',
  'https://casualshop.ba',
  'http://localhost:3000'
];

export const onRequestOptions = async (context: { request: Request }) => {
  const origin = context.request.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin);

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Auth',
    },
  });
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  // 1. Provjera porijekla (Origin Check) - blokira vanjske curl i skriptne pozive
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ error: 'Nedozvoljen domen.' }), { status: 403 });
  }

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin || ALLOWED_ORIGINS[0],
  };

  try {
    const body = await request.json().catch(() => ({}));
    const { type, orderData, cartData, followUpType, promoCode } = body;

    // 2. Telegram obavijest o narudžbi
    if (type === 'order') {
      const botToken = env.TELEGRAM_BOT_TOKEN;
      const chatIds = (env.TELEGRAM_CHAT_IDS || '').split(',').map(s => s.trim()).filter(Boolean);

      if (botToken && chatIds.length > 0 && orderData) {
        const msg = `🛍️ NOVA NARUDŽBA #${orderData.orderNumber}\nKupac: ${orderData.customer?.firstName} ${orderData.customer?.lastName}\nIznos: ${orderData.total} KM\nGrad: ${orderData.customer?.city}\nTel: ${orderData.customer?.phone}`;
        
        await Promise.all(chatIds.map(chatId => 
          fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: msg })
          })
        ));
      }
      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    // 3. Napuštene korpe - Dozvoljeno samo uz verifikaciju
    if (type === 'abandoned') {
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPayload)
      });

      return new Response(JSON.stringify({ success: emailRes.ok }), { status: emailRes.status, headers });
    }

    return new Response(JSON.stringify({ error: 'Nepoznat tip zahtjeva.' }), { status: 400, headers });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
};