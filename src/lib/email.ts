import emailjs from '@emailjs/browser';
import { Order } from '../types';

const SERVICE_ID = 'service_h4rxrv2';
const TEMPLATE_ID = '6ylwum8';
// ⚠️ Zamijeni 'TVOJ_PUBLIC_KEY' sa tvojim ključem iz EmailJS Account sekcije
const PUBLIC_KEY = 'mPKyquhWRcGkRq4gS';

export async function sendOrderNotificationEmail(order: Order): Promise<boolean> {
  // Priprema spiska artikala u formatu kako očekuje predložak {{items_summary}}
  const itemsSummary = order.items
    .map((item) => `- ${item.quantity}x ${item.name} (Vel: ${item.size}) = ${(item.price * item.quantity).toFixed(2)} KM`)
    .join('\n');

  const templateParams = {
    order_number: order.orderNumber,
    customer_name: `${order.customer.firstName} ${order.customer.lastName}`,
    customer_phone: order.customer.phone,
    customer_email: order.customer.email || 'Nije naveden',
    customer_address: `${order.customer.address}, ${order.customer.postalCode} ${order.customer.city}`,
    items_summary: itemsSummary,
    total_amount: `${order.total.toFixed(2)} KM`,
    email: order.customer.email || 'noreply@casualshop.ba', // Za Reply-To polje
  };

  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
    console.log('Email obavijest o narudžbi je uspješno poslata!');
    return true;
  } catch (error) {
    console.error('Greška pri slanju email obavijesti:', error);
    return false;
  }
}
