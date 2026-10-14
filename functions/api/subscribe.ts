export const onRequestPost = async (context: {
  request: Request;
  env: { 
    BREVO_API_KEY?: string;
    BREVO_LIST_ID?: string;
  };
}) => {
  try {
    const { request, env } = context;

    // 1. ORIGIN PROVJERA (CORS ZAŠTITA)
    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = ['https://casualshopbih.pages.dev', 'https://casualshop.ba'];

    if (origin && !allowedOrigins.some((d) => origin.startsWith(d))) {
      return new Response('Forbidden', { status: 403 });
    }

    // 2. PARSIRANJE I POJAČANA VALIDACIJA EMAIL-A
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = body.email?.trim().toLowerCase();
    const isValidEmail = !!email && email.length <= 150 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

    if (!isValidEmail) {
      return new Response(
        JSON.stringify({ error: 'Neispravna email adresa' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = env.BREVO_API_KEY?.trim();
    if (!apiKey) {
      console.error('BREVO_API_KEY nije konfigurisana u Cloudflare varijablama.');
      return new Response(
        JSON.stringify({ error: 'BREVO_API_KEY fali na serveru' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ID liste u Brevo (podrazumijevano 2 ili iz varijable)
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
      return new Response(JSON.stringify({ success: true, provider: 'Brevo' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (responseText.includes('duplicate_parameter') || responseText.includes('already exists')) {
      return new Response(JSON.stringify({ success: true, message: 'Korisnik je već u bazi' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.error('Brevo API error:', res.status, responseText);
    return new Response(
      JSON.stringify({ error: 'Brevo API greška', details: responseText }),
      { status: res.status, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('Sistemska greška u Brevo Workeru:', err);
    return new Response(JSON.stringify({ error: err.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
