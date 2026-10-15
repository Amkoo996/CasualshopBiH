interface Env {
  // Ensure these match your Cloudflare Dashboard exactly
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_IDS?: string;
  TELEGRAM_CONTACT_BOT_TOKEN?: string;
  EMAILJS_SERVICE_ID?: string;
  EMAILJS_TEMPLATE_ID?: string;
  EMAILJS_PUBLIC_KEY?: string;
  
  // Fallbacks
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
      type?: 'contact' | 'order';
      orderData?: any;
    };

    const text = String(body.text || '').trim().slice(0, 4000);
    const type = body.type || 'order';

    if (!text) {
      return new Response(JSON.stringify({ success: false, error: 'Prazan tekst poruke.' }), { status: 400, headers });
    }

    // 1. TELEGRAM SLANJE
    // Explicitly grab the tokens, favoring the non-NEXT_PUBLIC ones if available
    const orderBotToken = env.TELEGRAM_BOT_TOKEN || env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
    const contactBotToken = env.TELEGRAM_CONTACT_BOT_TOKEN || env.NEXT_PUBLIC_TELEGRAM_CONTACT_BOT_TOKEN || orderBotToken;
    const rawChatIds = env.TELEGRAM_CHAT_IDS || env.NEXT_PUBLIC_TELEGRAM_CHAT_IDS;

    let telegramSent = false;
    let telegramError = '';

    if (rawChatIds && (orderBotToken || contactBotToken)) {
      // Determine which token to use based on the request type
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
          // Fallback: If contact bot fails, try the order bot
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

    // 2. EMAILJS SLANJE POTVRDE NARUDŽBE KUPCU
    let emailSent = false;
    let emailError = '';

    if (type === 'order' && body.orderData?.customer?.email) {
      const serviceId = env.EMAILJS_SERVICE_ID || env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
      const templateId = env.EMAILJS_TEMPLATE_ID || env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
      const publicKey = env.EMAILJS_PUBLIC_KEY || env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

      if (serviceId && templateId && publicKey) {
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
          if (!emailRes.ok) {
            emailError = await emailRes.text().catch(() => 'EmailJS odbio zahtjev.');
          }
        } catch (e: any) {
          emailError = e?.message || 'Greška pri konekciji sa EmailJS.';
        }
      } else {
        emailError = 'Nedostaju EMAILJS_SERVICE_ID ili EMAILJS_PUBLIC_KEY u Cloudflareu.';
      }
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