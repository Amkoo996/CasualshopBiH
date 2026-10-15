import { Order } from '../types';

/**
 * Pomoćni modul za notifikacije.
 * Sva komunikacija (Telegram i EmailJS) ide isključivo preko 
 * zaštićene backend rute /api/notify, bez izlaganja tajnih ključeva u browseru.
 */

/**
 * 1. SLANJE POTVRDE NARUDŽBE KUPCU
 * Šalje podatke o narudžbi na /api/notify koji u pozadini pokreće EmailJS.
 */
export async function sendOrderConfirmationEmail(order: Order): Promise<boolean> {
  const customerEmail = order.customer?.email?.trim();
  if (!customerEmail) {
    return false;
  }

  try {
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'order',
        orderData: order,
      }),
    });

    if (!response.ok) {
      console.warn('⚠️ [Notifikacije] Server nije uspio poslati potvrdu narudžbe.');
      return false;
    }

    const data = await response.json().catch(() => ({}));
    return !!data.success;
  } catch (error) {
    console.error('❌ [Greška pri slanju potvrde]', error);
    return false;
  }
}

/**
 * 2. SLANJE OBAVIJESTI NA TELEGRAM (ADMIN)
 * Prosljeđuje tekst poruke serverless ruti /api/notify.
 */
export async function sendTelegramNotification(
  text: string, 
  type: 'order' | 'contact' = 'order'
): Promise<boolean> {
  if (!text.trim()) {
    return false;
  }

  try {
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, type }),
    });

    if (!response.ok) {
      console.warn('⚠️ [Telegram] Serverless ruta nije uspjela poslati poruku.');
      return false;
    }

    const data = await response.json().catch(() => ({}));
    return !!data.success;
  } catch (error) {
    console.error('❌ [Greška pri slanju na Telegram]', error);
    return false;
  }
}