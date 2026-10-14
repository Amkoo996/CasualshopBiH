export const onRequestPost = async (context: {
  request: Request;
  env: { 
    MAILERLITE_API_KEY?: string;
    MAILERLITE_GROUP_ID?: string;
  };
}) => {
  try {
    const { request, env } = context;
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Neispravna email adresa' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = env.MAILERLITE_API_KEY?.trim();
    if (!apiKey) {
      console.error('MAILERLITE_API_KEY nije podešen u Cloudflare varijablama.');
      return new Response(
        JSON.stringify({ error: 'API ključ nije podešen na serveru' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payload: Record<string, any> = {
      email: email,
      status: 'active',
    };

    const groupId = env.MAILERLITE_GROUP_ID?.trim();
    if (groupId) {
      payload.groups = [groupId];
    }

    // 1. Pokušaj na Novi MailerLite (connect.mailerlite.com)
    let mlResponse = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    let responseText = await mlResponse.text();

    if (mlResponse.ok) {
      return new Response(JSON.stringify({ success: true, provider: 'MailerLite Connect' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Ako padne zbog nepravilnog Group ID-a, pokušaj ponovo bez grupe
    if (groupId && !mlResponse.ok) {
      delete payload.groups;
      mlResponse = await fetch('https://connect.mailerlite.com/api/subscribers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
      responseText = await mlResponse.text();
      if (mlResponse.ok) {
        return new Response(JSON.stringify({ success: true, note: 'Dodano bez grupe' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // 2. Ako MailerLite vrati 422 ili obavijest da pretplatnik postoji
    if (mlResponse.status === 422 || responseText.includes('already exists') || responseText.includes('member')) {
      return new Response(JSON.stringify({ success: true, message: 'Korisnik je već u bazi' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Fallback na Stari MailerLite Classic API (ako nalog nije na Connect platformi)
    const classicRes = await fetch('https://api.mailerlite.com/api/v2/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MailerLite-ApiKey': apiKey,
      },
      body: JSON.stringify({ email: email, resubscribe: true }),
    });

    if (classicRes.ok) {
      return new Response(JSON.stringify({ success: true, provider: 'MailerLite Classic' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.error('MailerLite odbio zahtjev na obadva endpointa:', responseText);
    return new Response(
      JSON.stringify({ error: 'MailerLite API error', details: responseText }),
      { status: mlResponse.status, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Sistemska greška u Workeru:', err);
    return new Response(JSON.stringify({ error: err.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
