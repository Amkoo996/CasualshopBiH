interface Env {
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_IDS?: string;
  TELEGRAM_CONTACT_BOT_TOKEN?: string;
  EMAILJS_SERVICE_ID?: string;
  EMAILJS_TEMPLATE_ID?: string;
  EMAILJS_PUBLIC_KEY?: string;
  EMAILJS_PRIVATE_KEY?: string;
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

    // 1. DOHVAT SKRIVENIH TELEGRAM VARIJABLI IZ CLOUDFLAREA
    const orderBotToken = env.TELEGRAM_BOT_TOKEN;
    const contactBotToken = env.TELEGRAM_CONTACT_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN;
    const rawChatIds = env.TELEGRAM_CHAT_IDS;

    let telegramSent = false;
    let telegramError = '';

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
          // Fallback na narudžbeni bot ako kontakt bot nije pokrenut
          if (!res.ok && activeBotToken !== orderBotToken && orderBotToken) {
            res = await sendTelegram(orderBotToken, chatId);
          }
          return res.ok;
        })
      );

      telegramSent = results.some(Boolean);
    } else {
      telegramError = 'Nedostaje TELEGRAM konfiguracija u Cloudflare varijablama.';
    }

    // 2. DOHVAT SKRIVENIH EMAILJS VARIJABLI I SLANJE POTVRDE KUPCU (AKO JE NARUDŽBA)
    let emailSent = false;
    let emailError = '';

    if (type === 'order' && body.orderData?.customer?.email) {
      const serviceId = env.EMAILJS_SERVICE_ID;
      const templateId = env.EMAILJS_TEMPLATE_ID;
      const publicKey = env.EMAILJS_PUBLIC_KEY;
      const privateKey = env.EMAILJS_PRIVATE_KEY;

      if (serviceId && templateId && publicKey) {
        const order = body.orderData;
        const customer = order.customer || {};
        const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Kupac';

        const itemsFormatted = (order.items || [])
          .map((item: any) => `• ${item.quantity}x ${item.name} (${item.size}) - ${(item.price * item.quantity).toFixed(2)} KM`)
          .join('\n');

        const templateParams: Record<string, any> = {
          to_email: customer.email,
          email: customer.email,
          to_name: fullName,
          customer_name: fullName,
          order_number: order.orderNumber,
          items: itemsFormatted,
          items_summary: (order.items || []).map((i: any) => `${i.quantity}x ${i.name} (${i.size})`).join(', '),
          total: `${Number(order.total || 0).toFixed(2)} KM`,
          total_amount: `${Number(order.total || 0).toFixed(2)} KM`,
          subtotal: `${Number(order.subtotal || 0).toFixed(2)} KM`,
          shipping_fee: Number(order.shippingFee || 0) === 0 ? 'Besplatno' : `${Number(order.shippingFee).toFixed(2)} KM`,
          phone: customer.phone || '',
          customer_phone: customer.phone || '',
          address: customer.address || '',
          customer_address: customer.address || '',
          city: customer.city || '',
          delivery_method: customer.address?.includes('Lično') ? 'Lično preuzimanje (Sarajevo)' : 'Brza pošta X Express (Pouzećem)',
          note: customer.note || 'Nema napomene',
        };

        const emailPayload: Record<string, any> = {
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: templateParams,
        };

        if (privateKey) {
          emailPayload.accessToken = privateKey;
        }

        try {
          const emailRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailPayload),
          });
          emailSent = emailRes.ok;
          if (!emailRes.ok) {
            emailError = await emailRes.text().catch(() => 'Greška pri EmailJS slanju');
          }
        } catch (e: any) {
          emailError = e?.message || 'Greška pri povezivanju s EmailJS-om';
        }
      } else {
        emailError = 'Nedostaju EMAILJS varijable u Cloudflareu.';
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
      JSON.stringify({ success: false, error: err?.message || 'Interna greška na poslužitelju' }),
      { status: 200, headers }
    );
  }
};