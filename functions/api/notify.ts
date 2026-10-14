interface Env {
  VITE_TELEGRAM_BOT_TOKEN?: string;
  VITE_TELEGRAM_CHAT_IDS?: string;
  VITE_TELEGRAM_CONTACT_BOT_TOKEN?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_IDS?: string;
  TELEGRAM_CONTACT_BOT_TOKEN?: string;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;

  try {
    const body = (await request.json().catch(() => ({}))) as { text?: string; type?: string };
    const text = String(body.text || '').slice(0, 3500);

    if (!text) {
      return new Response(JSON.stringify({ error: 'Tekst je prazan.' }), { status: 400 });
    }

    const orderBot = env.VITE_TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN;
    const contactBot = env.VITE_TELEGRAM_CONTACT_BOT_TOKEN || env.TELEGRAM_CONTACT_BOT_TOKEN;
    const rawChatIds = env.VITE_TELEGRAM_CHAT_IDS || env.TELEGRAM_CHAT_IDS;

    if (!rawChatIds || (!orderBot && !contactBot)) {
      return new Response(JSON.stringify({ error: 'Nedostaje Telegram konfiguracija.' }), { status: 500 });
    }

    const ids = rawChatIds.split(',').map((s) => s.trim()).filter(Boolean);
    const isContact = body.type === 'contact' || text.includes('KONTAKT') || text.includes('UPIT');

    // Primarni bot: contactBot za upite, orderBot za narudžbe
    const primaryToken = isContact && contactBot ? contactBot : orderBot;
    const fallbackToken = orderBot;

    const sendToTelegram = async (botToken: string, chatId: string) => {
      return fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
    };

    const results = await Promise.all(
      ids.map(async (chatId) => {
        let res = await sendToTelegram(primaryToken!, chatId);
        // Fallback na glavni orderBot ako primarni javi grešku
        if (!res.ok && primaryToken !== fallbackToken && fallbackToken) {
          res = await sendToTelegram(fallbackToken, chatId);
        }
        return res.ok;
      })
    );

    const success = results.some(Boolean);
    return new Response(JSON.stringify({ success }), {
      status: success ? 200 : 502,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};