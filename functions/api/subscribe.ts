export const onRequestPost = async (context: {
  request: Request;
  env: { 
    BREVO_API_KEY?: string;
    BREVO_LIST_ID?: string;
  };
}) => {
  try {
    const { request, env } = context;

    // 1. STROGA ORIGIN / REFERER ZAŠTITA (K4 Fix)
    const origin = request.headers.get('Origin') || '';
    const referer = request.headers.get('Referer') || '';
    const allowedOrigins = ['https://casualshopbih.pages.dev', 'https://casualshop.ba'];

    const isValidOrigin = allowedOrigins.some(
      (d) => origin === d || origin === `${d}/` || referer.startsWith(`${d}/`)
    );

    if (!isValidOrigin) {
      return new Response(JSON.stringify({ error: 'Pristup odbijen.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. PARSIRANJE I VALIDACIJA EMAIL-A
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = body.email?.trim().toLowerCase();
    const isValidEmail = !!email && email.length <= 150 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}\$/.test(email);

    if (!isValidEmail) {
      return new Response(
        JSON.stringify({ error: 'Neispravna email adresa.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = env.BREVO_API_KEY?.trim();
    if (!apiKey) {
      console.error('BREVO_API_KEY nije konfigurisana u Cloudflare varijablama.');
      return new Response(
        JSON.stringify({ error: 'Sistemska greška na serveru.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const listId = parseInt(env.BREVO_LIST_ID?.trim() || '2', 10);

    const payload = {
      email: email,
      listIds: [listId],
      updateEnabled: true,
    };

    const res = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await res.text();

    if (res.ok || res.status === 201 || res.status === 204) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (responseText.includes('duplicate_parameter') || responseText.includes('already exists')) {
      return new Response(JSON.stringify({ success: true, message: 'Korisnik je već prijavljen.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.error('Brevo API error:', res.status, responseText);
    return new Response(
      JSON.stringify({ error: 'Došlo je do greške pri prijavi na newsletter.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('Sistemska greška u Brevo Workeru:', err);
    return new Response(JSON.stringify({ error: 'Greška na serveru.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
