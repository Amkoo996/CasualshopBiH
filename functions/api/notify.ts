interface Env {
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_IDS?: string;
  TELEGRAM_CONTACT_BOT_TOKEN?: string;
  NEXT_PUBLIC_TELEGRAM_BOT_TOKEN?: string;
  NEXT_PUBLIC_TELEGRAM_CHAT_IDS?: string;
  NEXT_PUBLIC_TELEGRAM_CONTACT_BOT_TOKEN?: string;
  VITE_TELEGRAM_BOT_TOKEN?: string;
  VITE_TELEGRAM_CHAT_IDS?: string;
  VITE_TELEGRAM_CONTACT_BOT_TOKEN?: string;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;

  try {
    const body = (await request.json().catch(() => ({}))) as { text?: string; type?: string };
    const text = String(body.text || '').slice(0, 3500);

    if (!text) {
      return new Response(JSON.stringify({ success: false, error: 'Tekst poruke je prazan.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Čitanje tokena iz svih mogućih naziva varijabli
    const orderBot = 
      env.TELEGRAM_BOT_TOKEN || 
      env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || 
      env.VITE_TELEGRAM_BOT_TOKEN;

    const contactBot = 
      env.TELEGRAM_CONTACT_BOT_TOKEN || 
      env.NEXT_PUBLIC_TELEGRAM_CONTACT_BOT_TOKEN || 
      env.VITE_TELEGRAM_CONTACT_BOT_TOKEN;

    const rawChatIds = 
      env.TELEGRAM_CHAT_IDS || 
      env.NEXT_PUBLIC_TELEGRAM_CHAT_IDS || 
      env.VITE_TELEGRAM_CHAT_IDS;

    // Ako nedostaje Telegram konfiguracija na Cloudflareu, vraća 200 sa opisom (da ne ruši formu statusom 500)
    if (!rawChatIds || (!orderBot && !contactBot)) {
      return new Response(
        JSON.stringify({
          success: false,
          warning: 'Telegram varijable nisu konfigurisane u Cloudflare Dashboardu.',
          missing: {
            hasOrderBot: Boolean(orderBot),
            hasContactBot: Boolean(contactBot),
            hasChatIds: Boolean(rawChatIds)
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ids = rawChatIds.split(',').map((s) => s.trim()).filter(Boolean);
    const isContact = body.type === 'contact' || text.includes('KONTAKT') || text.includes('UPIT');

    // Za kontakt formu se primarno koristi contactBot, a fallback je orderBot
    const primaryBot = isContact && contactBot ? contactBot : (orderBot || contactBot);
    const fallbackBot = primaryBot === contactBot ? orderBot : contactBot;

    const sendMsg = async (botToken: string, chatId: string) => {
      const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
      const data = await resp.json().catch(() => ({}));
      return { ok: resp.ok, status: resp.status, data };
    };

    const results = await Promise.all(
      ids.map(async (chatId) => {
        let res = await sendMsg(primaryBot!, chatId);
        if (!res.ok && fallbackBot && fallbackBot !== primaryBot) {
          res = await sendMsg(fallbackBot, chatId);
        }
        return { chatId, ...res };
      })
    );

    const anySent = results.some((r) => r.ok);

    return new Response(
      JSON.stringify({ success: anySent, results }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Greška u serverless obradi' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
};