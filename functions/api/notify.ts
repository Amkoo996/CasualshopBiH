interface Env {
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_IDS?: string;
  TELEGRAM_CONTACT_BOT_TOKEN?: string;
  EMAILJS_SERVICE_ID?: string;
  EMAILJS_TEMPLATE_ID?: string;
  EMAILJS_PUBLIC_KEY?: string;
  NEXT_PUBLIC_TELEGRAM_BOT_TOKEN?: string;
  NEXT_PUBLIC_TELEGRAM_CHAT_IDS?: string;
  NEXT_PUBLIC_TELEGRAM_CONTACT_BOT_TOKEN?: string;
  NEXT_PUBLIC_EMAILJS_SERVICE_ID?: string;
  NEXT_PUBLIC_EMAILJS_TEMPLATE_ID?: string;
  NEXT_PUBLIC_EMAILJS_PUBLIC_KEY?: string;
  [key: string]: any;
}

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const body = (await request.json().catch(() => ({}))) as {
      text?: string;
      type?: 'contact' | 'order' | 'abandoned';
      orderData?: any;
      cartData?: any;
      followUpType?: '3d' | '5d';
      promoCode?: string;
    };

    const type = body.type || 'order';
    const text = String(body.text || '').trim().slice(0, 4000);

    // 1. TELEGRAM SLANJE (Samo za narudžbe i kontakt)
    const orderBotToken = env.TELEGRAM_BOT_TOKEN || env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
    const contactBotToken = env.TELEGRAM_CONTACT_BOT_TOKEN || env.NEXT_PUBLIC_TELEGRAM_CONTACT_BOT_TOKEN || orderBotToken;
    const rawChatIds = env.TELEGRAM_CHAT_IDS || env.NEXT_PUBLIC_TELEGRAM_CHAT_IDS;

    let telegramSent = false;
    let telegramError = '';

    if (type !== 'abandoned') {
      if (!text) {
        return new Response(JSON.stringify({ success: false, error: 'Prazan tekst poruke.' }), { status: 400, headers });
      }

      if (rawChatIds && (orderBotToken || contactBotToken)) {
        const activeBotToken = type === 'contact' ? contactBotToken : (orderBotToken || contactBotToken);
        const chatIds = rawChatIds.split(',').map((id) => id.trim()).filter(Boolean);

        const sendTelegram = async (token: string, chatId: string) => {
          try {
            const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text }),
            });
            return await res.json().catch(() => ({ ok: false }));
          } catch (e: any) {
            return { ok: false, error: e?.message };
          }
        };

        const results = await Promise.all(
          chatIds.map(async (chatId) => {
            let res = await sendTelegram(activeBotToken!, chatId);
            if (!res.ok && activeBotToken !== orderBotToken && orderBotToken) {
              res = await sendTelegram(orderBotToken, chatId);
            }
            return res.ok;
          })
        );
        telegramSent = results.some(Boolean);
      } else {
        telegramError = 'Nedostaju TELEGRAM varijable u Cloudflareu.';
      }
    }

    // 2. EMAILJS SLANJE (Narudžbe + Napuštene Korpe)
    let emailSent = false;
    let emailError = '';

    const serviceId = env.EMAILJS_SERVICE_ID || env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
    const templateId = env.EMAILJS_TEMPLATE_ID || env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
    const publicKey = env.EMAILJS_PUBLIC_KEY || env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

    if (serviceId && templateId && publicKey) {
      // LOGIKA ZA NARUDŽBE
      if (type === 'order' && body.orderData?.customer?.email) {
        const order = body.orderData;
        const customer = order.customer || {};
        const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Kupac';

        const itemsFormatted = (order.items || [])
          .map((i: any) => `• ${i.quantity}x ${i.name} (${i.size}) - ${(i.price * i.quantity).toFixed(2)} KM`)
          .join('\n');

        const emailPayload = {
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: {
            to_email: customer.email,
            email: customer.email,
            to_name: fullName,
            customer_name: fullName,
            order_number: order.orderNumber,
            message: text,
            items: itemsFormatted,
            items_summary: (order.items || []).map((i: any) => `${i.quantity}x ${i.name} (${i.size})`).join(', '),
            total: `${Number(order.total || 0).toFixed(2)} KM`,
            total_amount: `${Number(order.total || 0).toFixed(2)} KM`,
            shipping_fee: Number(order.shippingFee || 0) === 0 ? 'Besplatno' : `${Number(order.shippingFee).toFixed(2)} KM`,
            delivery_method: customer.address?.includes('Lično') ? 'Lično preuzimanje (Sarajevo)' : 'Brza pošta X Express',
          },
        };

        try {
          const emailRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailPayload),
          });
          emailSent = emailRes.ok;
          if (!emailRes.ok) emailError = await emailRes.text().catch(() => 'EmailJS odbio zahtjev.');
        } catch (e: any) {
          emailError = e?.message || 'Greška pri konekciji sa EmailJS.';
        }
      } 
      // LOGIKA ZA NAPUŠTENE KORPE (FOLLOW-UP EMAILS)
      else if (type === 'abandoned' && body.cartData?.email) {
        const cart = body.cartData;
        const is5d = body.followUpType === '5d';
        const promoCode = body.promoCode || 'CASUAL10';
        const fullName = cart.customerName || 'Kupac';
        
        const emailMsg = is5d
          ? `Pozdrav ${fullName},\n\nPrimijetili smo da niste završili narudžbu. Kao mali znak pažnje, poklanjamo vam 10% popusta na vašu korpu uz kod: ${promoCode}!\n\nVaši artikli:\n${cart.itemsSummary || 'Artikli iz korpe'}\n\nPosjetite naš shop i iskoristite popust dok su artikli još na stanju.`
          : `Pozdrav ${fullName},\n\nArtikli u vašoj korpi su još uvijek dostupni, ali zalihe se brzo troše.\n\nVaši artikli:\n${cart.itemsSummary || 'Artikli iz korpe'}\n\nZavršite narudžbu prije nego što se rasprodaju!`;

        const emailPayload = {
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: {
            to_email: cart.email,
            email: cart.email,
            to_name: fullName,
            customer_name: fullName,
            order_number: 'Vaša Korpa',
            message: emailMsg,
            items: cart.itemsSummary || '',
            items_summary: cart.itemsSummary || '',
            total: `${Number(cart.total || 0).toFixed(2)} KM`,
            total_amount: `${Number(cart.total || 0).toFixed(2)} KM`,
            shipping_fee: 'Zavisi od lokacije',
            delivery_method: 'Nije odabrano',
          },
        };

        try {
          const emailRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailPayload),
          });
          emailSent = emailRes.ok;
          if (!emailRes.ok) emailError = await emailRes.text().catch(() => 'EmailJS odbio zahtjev.');
        } catch (e: any) {
          emailError = e?.message || 'Greška pri konekciji sa EmailJS.';
        }
      }
    } else if (type === 'order' || type === 'abandoned') {
      emailError = 'Nedostaju EMAILJS varijable u Cloudflareu.';
    }

    return new Response(
      JSON.stringify({
        success: telegramSent || emailSent,
        telegramSent,
        emailSent,
        telegramError: telegramSent ? null : telegramError,
        emailError: emailSent ? null : emailError,
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message }),
      { status: 200, headers }
    );
  }
};