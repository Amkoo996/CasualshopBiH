interface Env {
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_IDS?: string;
  TELEGRAM_CHAT_ID?: string;
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  // 1. Fleksibilna Origin / Referer provjera (dopušta i glavnu domenu i sve preview grane)
  const origin = request.headers.get('Origin') || '';
  const referer = request.headers.get('Referer') || '';

  const isAllowed = (url: string) => {
    if (!url) return false;
    return (
      url.includes('casualshopbih.pages.dev') ||
      url.includes('casualshop.ba') ||
      url.includes('localhost')
    );
  };

  // Ako postoji Origin ili Referer, provjeravamo ga
  if ((origin && !isAllowed(origin)) && (referer && !isAllowed(referer))) {
    return new Response(JSON.stringify({ error: 'Nedozvoljen domen (Origin/Referer).' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { text?: string };
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

  // Podržava i jedninu i množinu naziva varijable iz Cloudflare postavki
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const rawChatIds = env.TELEGRAM_CHAT_IDS || env.TELEGRAM_CHAT_ID;

  if (!botToken || !rawChatIds) {
    console.error('Nedostaje TELEGRAM_BOT_TOKEN ili TELEGRAM_CHAT_IDS u Cloudflare varijablama.');
    return new Response(
      JSON.stringify({ error: 'Server nije konfigurisan: nedostaju Telegram env varijable.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const ids = rawChatIds.split(',').map((s) => s.trim()).filter(Boolean);

  const results = await Promise.all(
    ids.map((chat_id) =>
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id, text }),
      })
    )
  );

  const allOk = results.every((r) => r.ok);
  return new Response(JSON.stringify({ success: allOk }), {
    status: allOk ? 200 : 502,
    headers: { 'Content-Type': 'application/json' },
  });
};