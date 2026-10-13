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

    // Priprema podataka za MailerLite API
    const payload: Record<string, any> = {
      email: email,
      status: 'active',
    };

    // Ako je podešena grupa u Cloudflare varijablama, dodajemo je
    const groupId = env.MAILERLITE_GROUP_ID?.trim();
    if (groupId) {
      payload.groups = [groupId];
    }

    // 1. Pokušaj dodavanja ili ažuriranja pretplatnika
    const mlResponse = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await mlResponse.text();

    // 2. Ako MailerLite vrati 200 ili 201 (Uspješno)
    if (mlResponse.ok) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Ako korisnik već postoji u bazi, MailerLite zna vratiti 422/400 – to tretiramo kao uspjeh
    if (mlResponse.status === 422 || responseText.includes('already exists') || responseText.includes('member')) {
      console.log('Subscriber već postoji u MailerLite bazi.');
      return new Response(JSON.stringify({ success: true, message: 'Korisnik je već prijavljen' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.error('MailerLite odbio zahtjev:', mlResponse.status, responseText);
    return new Response(
      JSON.stringify({ error: 'MailerLite greška', details: responseText }),
      { status: mlResponse.status, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Mrežna ili sistemska greška u Workeru:', err);
    return new Response(JSON.stringify({ error: err.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
