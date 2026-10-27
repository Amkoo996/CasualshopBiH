interface Env {
  BREVO_API_KEY?: string;
  BREVO_LIST_ID?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_SERVICE_ACCOUNT?: string;
  [key: string]: any;
}

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

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  const responseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin || ALLOWED_ORIGINS[0],
  };

  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = body.email?.trim().toLowerCase();
    
    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Neispravna email adresa.' }), { status: 400, headers: responseHeaders });
    }

    // BREVO Upis
    const apiKey = env.BREVO_API_KEY?.trim();
    if (apiKey) {
      const listId = parseInt(env.BREVO_LIST_ID?.trim() || '2', 10);
      
      const payload = {
        email: email,
        listIds: [listId],
        updateEnabled: true,
        emailBlacklisted: false 
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
      
      if (!res.ok && res.status !== 201 && res.status !== 204 && !responseText.includes('duplicate_parameter') && !responseText.includes('already exists')) {
        console.error('CRIT Brevo Error:', res.status, responseText);
      } else {
        console.log('Brevo SUCCESS:', res.status, responseText);
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: responseHeaders });

  } catch (err: any) {
    console.error('Brevo API Catch Error:', err);
    return new Response(JSON.stringify({ error: 'Server greška.' }), { status: 500, headers: responseHeaders });
  }
};
