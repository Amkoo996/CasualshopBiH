export const onRequestPost = async (context: {
  request: Request;
  env: { MAILERLITE_API_KEY?: string };
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

    const apiKey = env.MAILERLITE_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API ključ nije podešen na serveru' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const mlResponse = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        email: email,
        status: 'active',
      }),
    });

    if (!mlResponse.ok) {
      const errorText = await mlResponse.text();
      return new Response(
        JSON.stringify({ error: 'MailerLite greška', details: errorText }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
