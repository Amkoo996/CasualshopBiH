interface Env {
  // Varijable sa VITE_ prefiksom (kako su unesene na Cloudflareu)
  VITE_TELEGRAM_BOT_TOKEN?: string;
  VITE_TELEGRAM_CHAT_IDS?: string;
  VITE_TELEGRAM_CONTACT_BOT_TOKEN?: string;

  // Podrška i bez prefiksa
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_IDS?: string;
  TELEGRAM_CONTACT_BOT_TOKEN?: string;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;

  try {
    let body: { text?: string; type?: string } = {};
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Neispravan JSON format.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const text = String(body.text || '').slice(0, 3500);
    if (!text) {
      return new Response(JSON.stringify({ error: 'Tekst poruke je prazan.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Dohvaćanje tokena i chat ID-ova sa podrškom za VITE_ prefiks
    const orderBotToken = env.VITE_TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN;
    const contactBotToken = env.VITE_TELEGRAM_CONTACT_BOT_TOKEN || env.TELEGRAM_CONTACT_BOT_TOKEN || orderBotToken;
    const rawChatIds = env.VITE_TELEGRAM_CHAT_IDS || env.TELEGRAM_CHAT_IDS;

    // 2. Prepoznavanje tipa poruke: ako je kontakt upit, koristi se kontakt bot
    const isContactMessage =
      body.type === 'contact' ||
      text.includes('KONTAKT') ||
      text.includes('UPIT');

    const activeBotToken = isContactMessage ? contactBotToken : orderBotToken;

    if (!activeBotToken || !rawChatIds) {
      const missing = [];
      if (!activeBotToken) missing.push(isContactMessage ? 'VITE_TELEGRAM_CONTACT_BOT_TOKEN' : 'VITE_TELEGRAM_BOT_TOKEN');
      if (!rawChatIds) missing.push('VITE_TELEGRAM_CHAT_IDS');

      return new Response(
        JSON.stringify({
          error: `Nedostaju varijable na Cloudflareu: ${missing.join(', ')}`,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Razdvajanje ID-ova ako ih ima više (npr. zarezom: id1, id2)
    const ids = rawChatIds.split(',').map((s) => s.trim()).filter(Boolean);

    // 4. Slanje poruke putem odabranog bota
    const responses = await Promise.all(
      ids.map(async (chat_id) => {
        const res = await fetch(`https://api.telegram.org/bot${activeBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id, text }),
        });
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, data };
      })
    );

    const allSuccessful = responses.every((r) => r.ok);

    return new Response(JSON.stringify({ success: allSuccessful, responses }), {
      status: allSuccessful ? 200 : 502,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Interna greška servera.', details: err?.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};