import { Order } from '../types';

// ============================================================================
// KONFIGURACIJA ZA EMAILJS I TELEGRAM
// Ako nemate postavljene varijable u Cloudflareu, unesite vaše podatke ovdje:
// ============================================================================
export const NOTIFICATION_CONFIG = {
  // Podaci sa vašeg EmailJS naloga (sa otvorenog taba "Narudžba - EmailJS")
  emailjs: {
    serviceId: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 'service_h4rxrv2',
    templateId: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || 'template_b7r6ees',
    publicKey: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || 'mPKyquhWRcGkRq4gS',
  },
  // Podaci za Telegram botove
  telegram: {
    orderBotToken: process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '',
    contactBotToken: process.env.NEXT_PUBLIC_TELEGRAM_CONTACT_BOT_TOKEN || '',
    chatIds: (process.env.NEXT_PUBLIC_TELEGRAM_CHAT_IDS || '').split(',').map(s => s.trim()).filter(Boolean),
  }
};

/**
 * 1. SLANJE EMAIL POTVRDE KUPCU PREKO EMAILJS REST API-JA
 */
export async function sendOrderConfirmationEmail(order: Order): Promise<boolean> {
  const customerEmail = order.customer?.email?.trim();
  if (!customerEmail) {
    console.log('ℹ️ [EmailJS] Kupac nije unio e-mail adresu, preskačem slanje potvrde.');
    return false;
  }

  const itemsFormatted = (order.items || [])
    .map((item) => `• ${item.quantity}x ${item.name} (${item.size}) - ${(item.price * item.quantity).toFixed(2)} KM`)
    .join('\n');

  const itemsSummary = (order.items || [])
    .map((item) => `${item.quantity}x ${item.name} (${item.size})`)
    .join(', ');

  const fullName = `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || 'Kupac';

  // Šaljemo sve uobičajene nazive polja kako bi odgovaralo bilo kojem EmailJS šablonu
  const templateParams = {
    to_email: customerEmail,
    email: customerEmail,
    to_name: fullName,
    customer_name: fullName,
    order_number: order.orderNumber,
    items: itemsFormatted,
    items_summary: itemsSummary,
    total: `${order.total.toFixed(2)} KM`,
    total_amount: `${order.total.toFixed(2)} KM`,
    subtotal: `${order.subtotal.toFixed(2)} KM`,
    shipping_fee: order.shippingFee === 0 ? 'Besplatno' : `${order.shippingFee.toFixed(2)} KM`,
    phone: order.customer.phone || '',
    customer_phone: order.customer.phone || '',
    address: order.customer.address || '',
    customer_address: order.customer.address || '',
    city: order.customer.city || '',
    delivery_method: order.customer.address.includes('Lično') ? 'Lično preuzimanje (Sarajevo)' : 'Brza pošta X Express (Pouzećem)',
    note: order.customer.note || 'Nema napomene',
  };

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: NOTIFICATION_CONFIG.emailjs.serviceId,
        template_id: NOTIFICATION_CONFIG.emailjs.templateId,
        user_id: NOTIFICATION_CONFIG.emailjs.publicKey,
        template_params: templateParams,
      }),
    });

    if (response.ok) {
      console.log(`✅ [EmailJS] Potvrda narudžbe #${order.orderNumber} uspješno poslana na: ${customerEmail}`);
      return true;
    } else {
      const errText = await response.text().catch(() => '');
      console.warn(`⚠️ [EmailJS Greška] Status: ${response.status} - ${errText}`);
      console.warn('Provjerite Service ID, Template ID i Public Key u src/lib/notifications.ts');
      return false;
    }
  } catch (error) {
    console.error('❌ [EmailJS Greška]', error);
    return false;
  }
}

/**
 * 2. SLANJE OBAVIJESTI NA TELEGRAM (Serverless + Direct Fallback)
 */
export async function sendTelegramNotification(text: string, type: 'order' | 'contact' = 'order'): Promise<boolean> {
  // Prvi pokušaj: preko Cloudflare serverless rute /api/notify
  try {
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, type }),
    });

    const data = await res.json().catch(() => ({}));
    if (data.success) {
      console.log('✅ [Telegram] Obavijest uspješno poslana preko serverless funkcije.');
      return true;
    }
  } catch {}

  // Drugi pokušaj (Direktni Fallback ako serverless ruta nema unesene varijable)
  const token = type === 'contact' && NOTIFICATION_CONFIG.telegram.contactBotToken
    ? NOTIFICATION_CONFIG.telegram.contactBotToken
    : NOTIFICATION_CONFIG.telegram.orderBotToken;

  const chatIds = NOTIFICATION_CONFIG.telegram.chatIds;

  if (!token || chatIds.length === 0) {
    console.warn('⚠️ [Telegram] Token ili Chat ID nisu uneseni. Obavijest nije poslana.');
    return false;
  }

  let sentAny = false;
  for (const chatId of chatIds) {
    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
      const tgData = await tgRes.json().catch(() => ({}));
      if (tgData.ok) {
        sentAny = true;
        console.log(`✅ [Telegram Direktno] Poruka poslana na Chat ID: ${chatId}`);
      } else {
        console.warn(`⚠️ [Telegram Greška] Chat ID: ${chatId} - ${tgData.description || 'Greška'}`);
      }
    } catch (e) {
      console.error('❌ [Telegram Greška]', e);
    }
  }

  return sentAny;
}