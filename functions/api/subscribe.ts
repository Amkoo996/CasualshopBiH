const ALLOWED_ORIGINS = [
  'https://casualshopbih.pages.dev',
  'https://casualshop.ba',
  'https://www.casualshop.ba',
  'http://localhost:3000',
];

export const onRequestOptions = async (context: { request: Request }) => {
  const origin = context.request.headers.get('Origin') || '';
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin || ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};

export const onRequestPost = async (context: {
  request: Request;
  env: { 
    BREVO_API_KEY?: string;
    BREVO_LIST_ID?: string;
  };
}) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  const responseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin || ALLOWED_ORIGINS[0],
  };

  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = body.email?.trim().toLowerCase();
    
    // Pojednostavljena provjera e-maila koja ne obara Cloudflare Worker
    if (!email || !email.includes('@') || !email.includes('.')) {
      return new Response(
        JSON.stringify({ error: 'Neispravna email adresa.' }),
        { status: 400, headers: responseHeaders }
      );
    }

    const apiKey = env.BREVO_API_KEY?.trim();
    if (!apiKey) {
      console.error('BREVO_API_KEY nije konfigurisana.');
      return new Response(
        JSON.stringify({ error: 'Sistemska greška na serveru.' }),
        { status: 500, headers: responseHeaders }
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

    if (res.ok || res.status === 201 || res.status === 204 || responseText.includes('duplicate_parameter') || responseText.includes('already exists')) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: responseHeaders,
      });
    }

    console.error('Brevo API error:', res.status, responseText);
    return new Response(
      JSON.stringify({ error: 'Došlo je do greške pri prijavi na newsletter.' }),
      { status: 500, headers: responseHeaders }
    );

  } catch (err: any) {
    console.error('Sistemska greška u Brevo Workeru:', err);
    return new Response(JSON.stringify({ error: 'Greška na serveru.' }), {
      status: 500,
      headers: responseHeaders,
    });
  }
};
