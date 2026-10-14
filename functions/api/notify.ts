interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_IDS: string;
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const origin = request.headers.get('Origin') || '';
  const allowed = ['https://casualshopbih.pages.dev', 'https://casualshop.ba']; // Dodane vaše domene

  if (origin && !allowed.some(d => origin.startsWith(d))) {
    return new Response('Forbidden', { status: 403 });
  }

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const text = String(body.text || '').slice(0, 3500);
  if (!text) return new Response('Bad request', { status: 400 });

  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_IDS) {
    return new Response('Server configuration error', { status: 500 });
  }

  const ids = env.TELEGRAM_CHAT_IDS.split(',').map((s) => s.trim()).filter(Boolean);

  const results = await Promise.all(
    ids.map((chat_id) =>
      fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id, text }), // Bez parse_mode radi izbjegavanja sintaksnih grešaka
      })
    )
  );

  return new Response(results.every((r) => r.ok) ? 'ok' : 'partial', { status: 200 });
};
