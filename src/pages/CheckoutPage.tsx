import React, { useState, useEffect } from 'react';
import { Truck, CreditCard, ShieldCheck, ArrowLeft, Loader2, MapPin, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { CustomerDetails, Order } from '../types';
import { createOrder, getProducts } from '../lib/db';
import { trackBeginCheckout, trackPurchase } from '../lib/analytics';
import { recordCheckoutStart, recordCompletedPurchase, saveCartSession } from '../lib/tracking';
import { validateAndApplyPromoCode, markPromoCodeAsUsed, createPromoCode } from '../lib/promo';
import { normalizePhone, isValidEmail, isValidName, isValidPostalCode } from '../lib/validation';

interface CheckoutPageProps {
  onBack: () => void;
  onOrderSuccess: (order: Order) => void;
  onNavigateToPage: (page: string) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  onBack,
  onOrderSuccess,
  onNavigateToPage,
}) => {
  const { items, subtotal, shippingFee, clearCart, settings } = useCart();

  const [deliveryMethod, setDeliveryMethod] = useState<'courier' | 'pickup'>('courier');
  const [pickupTime, setPickupTime] = useState('');

  const [formData, setFormData] = useState<CustomerDetails & { bot_field?: string }>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    city: 'Sarajevo',
    address: '',
    postalCode: '71000',
    note: '',
    termsAccepted: false,
    bot_field: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerDetails | 'terms' | 'pickupTime', string>>>({});

  // Promo Code State
  const [promoInput, setPromoInput] = useState('');
  const [promoDiscountPercent, setPromoDiscountPercent] = useState(0);
  const [appliedPromoCode, setAppliedPromoCode] = useState('');
  const [promoValidating, setPromoValidating] = useState(false);
  const [promoMessage, setPromoMessage] = useState<{ text: string; error: boolean } | null>(null);

  // Izračun konačnih iznosa
  const activeShippingFee = deliveryMethod === 'pickup' ? 0 : shippingFee;
  const discountAmount = Number(((subtotal * promoDiscountPercent) / 100).toFixed(2));
  const finalSubtotal = Number((subtotal - discountAmount).toFixed(2));
  const calculatedTotal = Number((finalSubtotal + activeShippingFee).toFixed(2));

  useEffect(() => {
    if (items.length > 0) {
      trackBeginCheckout(items, calculatedTotal);
      recordCheckoutStart();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    const nextForm = { ...formData, [name]: val };
    setFormData(nextForm);

    if (errors[name as keyof CustomerDetails]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }

    if (submitError) setSubmitError(null);

    if (nextForm.email || nextForm.phone) {
      saveCartSession({
        email: nextForm.email,
        phone: nextForm.phone,
        customerName: `${nextForm.firstName} ${nextForm.lastName}`.trim(),
        items,
        subtotal: calculatedTotal,
      });
    }
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoValidating(true);
    setPromoMessage(null);

    const result = await validateAndApplyPromoCode(promoInput);
    if (result.valid) {
      setPromoDiscountPercent(result.discountPercent);
      setAppliedPromoCode(promoInput.trim().toUpperCase());
      setPromoMessage({ text: result.message, error: false });
    } else {
      setPromoMessage({ text: result.message, error: true });
    }
    setPromoValidating(false);
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CustomerDetails | 'terms' | 'pickupTime', string>> = {};

    if (!isValidName(formData.firstName)) newErrors.firstName = 'Unesite ispravno ime (samo slova)';
    if (!isValidName(formData.lastName)) newErrors.lastName = 'Unesite ispravno prezime (samo slova)';

    if (!formData.phone.trim()) {
      newErrors.phone = 'Broj telefona je obavezan';
    } else if (!normalizePhone(formData.phone)) {
      newErrors.phone = 'Unesite ispravan broj telefona, npr. 061 123 456';
    }

    const mail = formData.email.trim();
    if (mail && !isValidEmail(mail)) {
      newErrors.email = 'Unesite ispravnu e-mail adresu';
    }

    if (deliveryMethod === 'courier') {
      if (formData.city.trim().length < 2) newErrors.city = 'Grad je obavezan';
      if (formData.address.trim().length < 5) newErrors.address = 'Unesite ulicu i kućni broj';
      
      if (formData.postalCode.trim() && !isValidPostalCode(formData.postalCode)) {
        newErrors.postalCode = 'Poštanski broj mora imati tačno 5 cifara (npr. 71000)';
      }
    } else {
      if (!pickupTime.trim()) {
        newErrors.pickupTime = 'Molimo navedite željeni dan i okvirno vrijeme preuzimanja';
      }
    }

    if (!formData.termsAccepted) {
      newErrors.terms = 'Morate prihvatiti uslove kupovine i proceduru povrata';
    }

    setErrors(newErrors);

    const firstKey = Object.keys(newErrors)[0];
    if (firstKey) {
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(`[name="${firstKey}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus();
      });
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.bot_field) return;
    if (submitting) return;
    if (!validate()) return;
    if (items.length === 0) return;

    const lastOrderTime = localStorage.getItem('casualshop_last_order_time');
    if (lastOrderTime && Date.now() - parseInt(lastOrderTime) < 30000) {
      setSubmitError('Molimo sačekajte 30 sekundi prije nove narudžbe.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      // 1. PROVJERI ZALIHE
      const freshProducts = await getProducts(true);
      for (const item of items) {
        const freshProd = freshProducts.find((p) => p.id === item.id);
        if (freshProd) {
          const stockForSize = freshProd.sizes?.[item.size] ?? 0;
          if (stockForSize < item.quantity) {
            setSubmitError(`Nažalost, artikal "${item.name}" u veličini ${item.size} više nema dovoljno komada na stanju (preostalo: ${stockForSize}).`);
            setSubmitting(false);
            return;
          }
        }
      }

      const date = new Date();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
      const orderNumber = `CS-${mm}${dd}-${randomStr}`;

      const cleanPhone = normalizePhone(formData.phone) || formData.phone.trim();
      const cleanEmail = formData.email.trim().toLowerCase();

      const noteDetails = deliveryMethod === 'pickup'
        ? `LIČNO PREUZIMANJE (Sarajevo). Željeno vrijeme: ${pickupTime}. ${formData.note.trim()}`
        : formData.note.trim();

      const orderData: Omit<Order, 'id'> = {
        orderNumber,
        items,
        customer: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: cleanPhone,
          email: cleanEmail,
          address: deliveryMethod === 'pickup' ? 'Lično preuzimanje - Sarajevo' : formData.address.trim(),
          city: deliveryMethod === 'pickup' ? 'Sarajevo' : formData.city.trim(),
          postalCode: deliveryMethod === 'pickup' ? '71000' : formData.postalCode.trim(),
          note: noteDetails.substring(0, 300),
          termsAccepted: formData.termsAccepted,
        },
        subtotal: finalSubtotal,
        shippingFee: activeShippingFee,
        total: calculatedTotal,
        paymentMethod: 'cash_on_delivery',
        status: 'Nova',
        createdAt: new Date().toISOString(),
        ...(appliedPromoCode ? { promoCode: appliedPromoCode, discountAmount } : {}),
      };

      const docId = await createOrder(orderData);
      const finalizedOrder: Order = {
        ...orderData,
        id: docId,
      };

      if (appliedPromoCode) {
        try {
          await markPromoCodeAsUsed(appliedPromoCode);
        } catch (err) {
          console.warn('Upozorenje: Promo kod primijenjen ali nije označen kao iskorišten:', err);
        }
      }

      let nextPromoCode = '';
      if (cleanEmail) {
        try {
          const nextPromo = await createPromoCode(cleanEmail, 'post_purchase', 30 * 24);
          nextPromoCode = nextPromo.code;
        } catch (err) {
          console.warn('Greška pri kreiranju narednog koda:', err);
        }
      }

      localStorage.setItem('casualshop_latest_order', JSON.stringify(finalizedOrder));
      localStorage.setItem('casualshop_last_order_time', Date.now().toString());

      // 2. SLANJE NOTIFIKACIJE NA TELEGRAM BOTA (DIREKTNO IZ BRUZERA, ISPRAVLJEN TEKST)
      const TELEGRAM_BOT_TOKEN = '8572264255:AAGOOomuba8xozD90V5_sYV2SR2ECdG0hJI';
      const TELEGRAM_CHAT_IDS = ['6333078744', '7082286798'];

      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_IDS.length > 0) {
        const itemsListMsg = items
          .map((i) => `• ${i.quantity}x ${i.name} (${i.size}) = ${(i.price * i.quantity).toFixed(2)} KM`)
          .join('\n');

        const promoInfoText = appliedPromoCode 
          ? `\nIskorišten Promo Kod: ${appliedPromoCode} (-${discountAmount.toFixed(2)} KM / ${promoDiscountPercent}%)` 
          : '';

        const telegramText = `
🛒 NOVA NARUDŽBA #${finalizedOrder.orderNumber}

👤 Kupac: ${formData.firstName} ${formData.lastName}
📞 Telefon: ${cleanPhone}
📧 Email: ${cleanEmail || 'Nije navedeno'}
📍 Adresa: ${finalizedOrder.customer.address}, ${finalizedOrder.customer.postalCode} ${finalizedOrder.customer.city}
📝 Napomena: ${noteDetails || 'Nema napomene'}

📦 Artikli:
${itemsListMsg}${promoInfoText}

💳 Dostava: ${activeShippingFee === 0 ? '0.00 KM (Lično / Gratis)' : `\${activeShippingFee.toFixed(2)} KM`}
💰 UKUPNO ZA NAPLATU: ${finalizedOrder.total.toFixed(2)} KM
        `.trim();

        TELEGRAM_CHAT_IDS.forEach((chatId) => {
          fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: telegramText,
            }),
          }).catch((err) => console.warn(`Telegram notifikacija za ID ${chatId} nije poslata:`, err));
        });
      }

      // 3. SLANJE E-MAIL OBAVIJESTI PREKO EMAILJS
      const fallbackSellerEmail = settings?.email || 'info@casualshop.ba';
      try {
        const itemsSummary = items
          .map((i) => `• ${i.quantity}x ${i.name} (${i.size}) = ${(i.price * i.quantity).toFixed(2)} KM`)
          .join('\n');

        const promoNote = nextPromoCode
          ? `\n\nHVALA NA KUPOVINI!\nTvoj promo kod od 10% za narednu narudžbu (važi 30 dana): ${nextPromoCode}`
          : '';

        const recipientEmail = cleanEmail && cleanEmail.includes('@')
          ? cleanEmail
          : fallbackSellerEmail;

        const emailSubjectText = `Potvrda narudžbe #${finalizedOrder.orderNumber} - Casual Shop BiH`;

        const messageBodyFormatted = `
Pozdrav ${formData.firstName},

Vaša narudžba #${finalizedOrder.orderNumber} je uspješno kreirana!

Podaci o kupcu:
• Ime i prezime: ${formData.firstName} ${formData.lastName}
• Telefon: ${cleanPhone}
• Adresa: ${finalizedOrder.customer.address}, ${finalizedOrder.customer.postalCode} ${finalizedOrder.customer.city}
• Napomena: ${noteDetails || 'Nema napomene'}

Naručeni artikli:
${itemsSummary}
${appliedPromoCode ? `\nPrimijenjen promo kod: ${appliedPromoCode} (-${discountAmount.toFixed(2)} KM)` : ''}

Dostava: ${activeShippingFee === 0 ? '0.00 KM (Lično preuzimanje / Besplatna dostava)' : `\${activeShippingFee.toFixed(2)} KM`}
Ukupno za plaćanje: ${finalizedOrder.total.toFixed(2)} KM (Plaćanje pouzećem)
${promoNote}

Srdačan pozdrav,
Casual Shop BiH
        `.trim();

        const emailRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            service_id: 'service_h4rxrv2',
            template_id: 'template_b7r6ees',
            user_id: 'mPKyquhWRcGkRq4gS',
            template_params: {
              from_name: 'Casual Shop BiH',
              from_email: fallbackSellerEmail,
              to_name: `${formData.firstName} ${formData.lastName}`,
              to_email: recipientEmail,
              customer_name: `${formData.firstName} ${formData.lastName}`,
              customer_email: recipientEmail,
              customer_phone: cleanPhone,
              customer_address: `${finalizedOrder.customer.address}, ${finalizedOrder.customer.city}`,
              customer_note: (noteDetails || 'Nema napomene') + promoNote,
              subject: emailSubjectText,
              email_subject: emailSubjectText,
              order_number: finalizedOrder.orderNumber,
              items_summary: itemsSummary,
              total_amount: `${finalizedOrder.total.toFixed(2)} KM`,
              shipping_fee: activeShippingFee === 0 ? 'BESPLATNO / LIČNO' : `${activeShippingFee.toFixed(2)} KM`,
              message: messageBodyFormatted,
              message_body: messageBodyFormatted,
              email_body: messageBodyFormatted,
              reply_to: fallbackSellerEmail,
            },
          }),
        });

        if (!emailRes.ok) {
          console.warn('EmailJS obavijest nije uspješno poslata:', await emailRes.text());
        }
      } catch (err: any) {
        console.warn('Greška pri slanju e-maila:', err);
      }

      trackPurchase(finalizedOrder);
      recordCompletedPurchase(finalizedOrder.orderNumber, finalizedOrder.total);

      clearCart();
      onOrderSuccess(finalizedOrder);
    } catch (error: any) {
      console.error('Greška pri kreiranju narudžbe:', error);
      setSubmitError(error?.message || 'Došlo je do greške prilikom obrade narudžbe. Osvježite stranicu i pokušajte ponovo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4 font-['Inter']">
        <h2 className="font-['Poppins'] text-xl font-black uppercase tracking-wider text-black">
          Vaša korpa je prazna
        </h2>
        <p className="text-sm text-neutral-600">
          Nemate artikala u korpi za završetak narudžbe.
        </p>
        <button
          onClick={onBack}
          className
