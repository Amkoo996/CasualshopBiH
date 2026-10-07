import { jsPDF } from 'jspdf';
import { Order, StoreSettings } from '../types';

/**
 * Generates and downloads a clean, professional PDF invoice for an order.
 */
export function generateOrderInvoicePDF(order: Order, settings?: StoreSettings): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  // 1. HEADER (Black bar with brand name & yellow accent)
  doc.setFillColor(10, 10, 10); // #0A0A0A
  doc.rect(margin, y, contentWidth, 24, 'F');

  // Yellow indicator line
  doc.setFillColor(247, 233, 127); // #F7E97F
  doc.rect(margin, y + 23, contentWidth, 1.5, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('CASUAL SHOP BiH', margin + 6, y + 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(247, 233, 127);
  doc.text('Casual. Svaki dan.  |  www.casualshop.ba', margin + 6, y + 18);

  // Invoice label on the right
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('FAKTURA / RACUN', pageWidth - margin - 6, y + 11, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 200);
  doc.text(`Br: #${order.orderNumber}`, pageWidth - margin - 6, y + 17, { align: 'right' });

  y += 32;

  // 2. SELLER & BUYER METADATA (Two columns)
  const colWidth = (contentWidth - 6) / 2;

  // Box 1: Seller info
  doc.setFillColor(244, 242, 236); // #F4F2EC warm grey
  doc.rect(margin, y, colWidth, 38, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.rect(margin, y, colWidth, 38, 'S');

  doc.setTextColor(10, 10, 10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('IZDAVALAC RACUNA (PRODAVAC):', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  const sellerName = settings?.sellerName || 'Casual Shop BiH d.o.o.';
  const sellerAddress = settings?.sellerAddress || 'Sarajevo, Bosna i Hercegovina';
  const sellerPhone = settings?.phone || '+387 61 000 000';
  const sellerEmail = settings?.email || 'info@casualshop.ba';
  const sellerId = settings?.sellerIdNumber || '4200000000000';

  doc.text(sellerName, margin + 4, y + 12);
  doc.text(sellerAddress, margin + 4, y + 17);
  doc.text(`ID broj: ${sellerId}`, margin + 4, y + 22);
  doc.text(`Tel: ${sellerPhone}`, margin + 4, y + 27);
  doc.text(`E-mail: ${sellerEmail}`, margin + 4, y + 32);

  // Box 2: Customer info
  const rightColX = margin + colWidth + 6;
  doc.setFillColor(244, 242, 236);
  doc.rect(rightColX, y, colWidth, 38, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.rect(rightColX, y, colWidth, 38, 'S');

  doc.setTextColor(10, 10, 10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('KUPAC (PRIMAOC POSILJKE):', rightColX + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text(`${order.customer.firstName} ${order.customer.lastName}`, rightColX + 4, y + 12);
  doc.text(`${order.customer.address}`, rightColX + 4, y + 17);
  doc.text(`${order.customer.postalCode} ${order.customer.city}, BiH`, rightColX + 4, y + 22);
  doc.text(`Mobitel: ${order.customer.phone}`, rightColX + 4, y + 27);
  if (order.customer.email) {
    doc.text(`Email: ${order.customer.email}`, rightColX + 4, y + 32);
  }

  y += 44;

  // 3. ORDER DATES & PAYMENT METHOD
  const orderDateFormatted = new Date(order.createdAt).toLocaleDateString('bs-BA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(`Datum narudzbe: ${orderDateFormatted}`, margin, y);
  doc.text(`Nacin placanja: Placanje pouzecem (Gotovina kuriru)`, margin + 55, y);
  doc.text(`Status narudzbe: ${order.status.toUpperCase()}`, pageWidth - margin, y, { align: 'right' });

  y += 6;

  // 4. ITEMS TABLE
  // Table Header
  doc.setFillColor(10, 10, 10);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);

  doc.text('R.BR.', margin + 3, y + 4.8);
  doc.text('ARTIKAL / OPIS', margin + 18, y + 4.8);
  doc.text('VELICINA', margin + 95, y + 4.8);
  doc.text('KOL.', margin + 120, y + 4.8);
  doc.text('CIJENA (KM)', margin + 140, y + 4.8);
  doc.text('UKUPNO (KM)', pageWidth - margin - 3, y + 4.8, { align: 'right' });

  y += 7;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  order.items.forEach((item, index) => {
    const isEven = index % 2 === 0;
    if (isEven) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y, contentWidth, 7, 'F');
    }

    doc.setDrawColor(235, 235, 235);
    doc.line(margin, y + 7, pageWidth - margin, y + 7);

    doc.setTextColor(70, 70, 70);
    doc.text(`${index + 1}.`, margin + 3, y + 4.8);

    doc.setTextColor(10, 10, 10);
    doc.setFont('helvetica', 'bold');
    // Truncate name if too long
    const cleanName = item.name.length > 42 ? item.name.substring(0, 40) + '...' : item.name;
    doc.text(cleanName, margin + 18, y + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(item.size, margin + 95, y + 4.8);
    doc.text(`${item.quantity} kom`, margin + 120, y + 4.8);
    doc.text(`${item.price.toFixed(2)}`, margin + 140, y + 4.8);

    const lineTotal = (item.price * item.quantity).toFixed(2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(10, 10, 10);
    doc.text(`${lineTotal} KM`, pageWidth - margin - 3, y + 4.8, { align: 'right' });

    y += 7;
  });

  // Shipping row
  doc.setFillColor(244, 242, 236);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y + 7, pageWidth - margin, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 70);
  doc.text('Dostava na adresu (Brza posta BiH)', margin + 18, y + 4.8);
  doc.text('Standard', margin + 95, y + 4.8);
  doc.text('1 usluga', margin + 120, y + 4.8);
  doc.text(order.shippingFee === 0 ? '0.00' : `${order.shippingFee.toFixed(2)}`, margin + 140, y + 4.8);

  doc.setFont('helvetica', 'bold');
  if (order.shippingFee === 0) {
    doc.setTextColor(16, 120, 50);
    doc.text('BESPLATNO', pageWidth - margin - 3, y + 4.8, { align: 'right' });
  } else {
    doc.setTextColor(10, 10, 10);
    doc.text(`${order.shippingFee.toFixed(2)} KM`, pageWidth - margin - 3, y + 4.8, { align: 'right' });
  }

  y += 12;

  // 5. TOTALS BOX
  const totalsBoxWidth = 75;
  const totalsBoxX = pageWidth - margin - totalsBoxWidth;

  doc.setFillColor(244, 242, 236);
  doc.rect(totalsBoxX, y, totalsBoxWidth, 24, 'F');
  doc.setDrawColor(10, 10, 10);
  doc.rect(totalsBoxX, y, totalsBoxWidth, 24, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Iznos artikala:', totalsBoxX + 4, y + 6);
  doc.text(`${order.subtotal.toFixed(2)} KM`, pageWidth - margin - 4, y + 6, { align: 'right' });

  doc.text('Trosak dostave:', totalsBoxX + 4, y + 11);
  doc.text(order.shippingFee === 0 ? 'BESPLATNO' : `${order.shippingFee.toFixed(2)} KM`, pageWidth - margin - 4, y + 11, { align: 'right' });

  doc.setDrawColor(200, 200, 200);
  doc.line(totalsBoxX + 4, y + 14, pageWidth - margin - 4, y + 14);

  // Total bold
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(10, 10, 10);
  doc.text('UKUPNO ZA UPLATU:', totalsBoxX + 4, y + 20);
  doc.text(`${order.total.toFixed(2)} KM`, pageWidth - margin - 4, y + 20, { align: 'right' });

  // Notes & terms on the left side of totals
  const notesWidth = contentWidth - totalsBoxWidth - 6;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 90, 90);
  doc.text('Napomena o dostavi i placanju:', margin, y + 5);
  doc.text('• Placanje se vrsi pouzecem u gotovini prilikom preuzimanja posiljke od kurira.', margin, y + 10);
  doc.text('• Kupac ima pravo na pregled posiljke i povrat robe u roku od 14 dana od prijema.', margin, y + 14);
  doc.text('• Za zamjenu velicine ili reklamacije javite se na email ili Instagram @casualshop.bih.', margin, y + 18);
  if (order.customer.note) {
    doc.setFont('helvetica', 'italic');
    doc.text(`• Napomena kupca: "${order.customer.note}"`, margin, y + 22);
  }

  y += 34;

  // 6. FOOTER STAMP & THANK YOU
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);

  y += 6;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('Casual Shop BiH - Udobna odjeca za svaki dan. Hvala Vam na ukazanom povjerenju!', margin, y);
  doc.text(`Faktura generisana elektronski: ${new Date().toLocaleDateString('bs-BA')}`, pageWidth - margin, y, { align: 'right' });

  // Save PDF
  doc.save(`Faktura_${order.orderNumber}.pdf`);
}

/**
 * Builds the pre-filled WhatsApp confirmation URL and message for a customer.
 */
export function getWhatsAppConfirmationUrl(order: Order): string {
  // Clean phone number: remove non-digits, convert leading 0 to 387
  let cleanPhone = order.customer.phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '387' + cleanPhone.substring(1);
  } else if (!cleanPhone.startsWith('387') && cleanPhone.length === 8) {
    cleanPhone = '387' + cleanPhone;
  }

  const itemsList = order.items
    .map((it) => `  • ${it.quantity}x ${it.name} (Veličina: ${it.size}) - ${(it.price * it.quantity).toFixed(2)} KM`)
    .join('\n');

  const shippingText = order.shippingFee === 0 ? 'BESPLATNA (0 KM)' : `${order.shippingFee.toFixed(2)} KM`;

  const message = `Pozdrav ${order.customer.firstName}! 👕
Hvala ti na narudžbi u Casual Shop BiH!

📦 *Broj narudžbe:* #${order.orderNumber}

📋 *Naručeni artikli:*
${itemsList}

💰 *Iznos artikala:* ${order.subtotal.toFixed(2)} KM
🚚 *Dostava (Brza pošta):* ${shippingText}
💵 *UKUPNO ZA PLAĆANJE POUZEĆEM:* ${order.total.toFixed(2)} KM

📍 *Podaci za dostavu:*
${order.customer.address}, ${order.customer.postalCode} ${order.customer.city}
📞 *Telefon:* ${order.customer.phone}

ℹ️ *Informacija o isporuci:*
Paket stiže u roku 2–5 radnih dana putem kurirske službe. Plaćate gotovinom kuriru pri preuzimanju paketa.

Molimo te da odgovoriš sa *'POTVRĐUJEM'* kako bismo odmah spakovali tvoj paket.
Hvala što nosiš Casual! 💛`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
