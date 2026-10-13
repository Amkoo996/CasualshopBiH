import React, { useState } from 'react';
import { Mail, MapPin, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { normalizePhone, isValidPhone } from '../lib/validation';

export const ContactPage: React.FC = () => {
  const { settings } = useCart();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    bot_field: '',
  });

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errorMessage) setErrorMessage('');
    if (e.target.name === 'phone' && phoneError) setPhoneError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.bot_field) {
      setStatus('success');
      return;
    }

    // STROGA VALIDACIJA: Zaustavlja sve što nije puni broj telefona (npr. '0', '03', 'abc')
    const rawPhone = formData.phone.trim();
    const cleanPhone = normalizePhone(rawPhone);

    if (!rawPhone || !isValidPhone(rawPhone) || !cleanPhone) {
      setStatus('error');
      setPhoneError('Unesite puni i ispravan broj telefona (npr. 061123456 ili +38761123456)');
      setErrorMessage('Broj telefona nije u ispravnom formatu.');
      return; // OVDJE SE TRENUTNO PREKIDA SLANJE!
    }

    setPhoneError('');
    setStatus('submitting');
    setErrorMessage('');

    try {
      // SLANJE EKSPLICITNO NA KONTAKT BOT TOKEN
      const contactBotToken = import.meta.env.VITE_TELEGRAM_CONTACT_BOT_TOKEN;
      const rawChatIds = import.meta.env.VITE_TELEGRAM_CHAT_ID;

      if (!contactBotToken) {
        console.error('VITE_TELEGRAM_CONTACT_BOT_TOKEN nije učitan iz okruženja!');
        setStatus('error');
        setErrorMessage('Sistem za kontakt trenutno nije konfiguisan (nedostaje token bota).');
        return;
      }

      if (!rawChatIds) {
        console.error('VITE_TELEGRAM_CHAT_ID nije učitan iz okruženja!');
        setStatus('error');
        setErrorMessage('Sistem za kontakt trenutno nije konfiguisan (nedostaje Chat ID).');
        return;
      }

      const telegramMessage = `📩 <b>NOVI UPIT SA KONTAKT FORME</b>\n` +
        `----------------------------------\n` +
        `👤 <b>Ime i prezime:</b> ${formData.name}\n` +
        `📧 <b>Email:</b> ${formData.email}\n` +
        `📞 <b>Telefon:</b> ${cleanPhone}\n\n` +
        `💬 <b>Poruka:</b>\n${formData.message}`;

      const chatIds = rawChatIds.split(',').map((id: string) => id.trim()).filter(Boolean);
      let anySuccess = false;

      for (const chatId of chatIds) {
        const tgRes = await fetch(`https://api.telegram.org/bot${contactBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: telegramMessage,
            parse_mode: 'HTML',
          }),
        });

        const tgData = await tgRes.json();
        if (tgRes.ok && tgData.ok) {
          anySuccess = true;
        } else {
          console.error(`Telegram kontakt bot greška za ID ${chatId}:`, tgData);
        }
      }

      if (anySuccess) {
        setStatus('success');
        setFormData({ name: '', email: '', phone: '', message: '', bot_field: '' });
      } else {
        setStatus('error');
        setErrorMessage('Greška pri slanju na Telegram kontakt bot. Provjerite da li ste kliknuli /start na @Casualshopbihkontakt_bot.');
      }
    } catch (err) {
      console.error('Mrežna greška pri slanju:', err);
      setStatus('error');
      setErrorMessage('Mrežna greška pri slanju poruke.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16 font-['Inter']">
      <h1 className="font-['Poppins'] text-2xl sm:text-3xl font-black uppercase text-center mb-8">
        Kontaktirajte nas
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-6 border-2 border-neutral-200">
        <div className="space-y-4">
          <h2 className="font-['Poppins'] text-sm font-bold uppercase text-black">
            Informacije
          </h2>
          <div className="flex items-center gap-3 text-xs">
            <Mail className="w-4 h-4 text-[#0A0A0A] shrink-0" />
            <span>{settings?.email || 'info@casualshop.ba'}</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <MapPin className="w-4 h-4 text-[#0A0A0A] shrink-0" />
            <span>Sarajevo, Bosna i Hercegovina (Dostava u sve gradove BiH brzom poštom)</span>
          </div>
        </div>

        <div>
          {status === 'success' ? (
            <div className="p-4 bg-emerald-50 border border-emerald-500 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Vaša poruka je uspješno poslata! Odgovorit ćemo Vam u najkraćem roku.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {status === 'error' && errorMessage && (
                <div className="p-2.5 bg-red-50 border border-red-500 text-red-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="hidden" aria-hidden="true">
                <input
                  type="text"
                  name="bot_field"
                  tabIndex={-1}
                  autoComplete="off"
                  value={formData.bot_field}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="contact-name" className="block text-xs font-bold uppercase mb-1">
                  Ime i prezime *
                </label>
                <input
                  id="contact-name"
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="npr. Marko Marković"
                  className="w-full bg-[#F4F2EC] border border-neutral-300 p-2 text-xs focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label htmlFor="contact-email" className="block text-xs font-bold uppercase mb-1">
                  E-mail *
                </label>
                <input
                  id="contact-email"
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="tvoj@email.com"
                  className="w-full bg-[#F4F2EC] border border-neutral-300 p-2 text-xs focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label htmlFor="contact-phone" className="block text-xs font-bold uppercase mb-1">
                  Broj telefona *
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  name="phone"
                  required
                  inputMode="tel"
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="npr. 061123456 ili +38761123456"
                  className={`w-full bg-[#F4F2EC] border ${
                    phoneError ? 'border-red-500 bg-red-50' : 'border-neutral-300'
                  } p-2 text-xs focus:outline-none focus:border-black`}
                />
                {phoneError && (
                  <p className="text-red-600 text-[11px] mt-1 font-semibold">{phoneError}</p>
                )}
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-xs font-bold uppercase mb-1">
                  Poruka *
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  rows={4}
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Napišite vaše pitanje..."
                  className="w-full bg-[#F4F2EC] border border-neutral-300 p-2 text-xs focus:outline-none focus:border-black"
                />
              </div>

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full py-3 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-bold text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer border-2 border-[#0A0A0A]"
              >
                <Send className="w-4 h-4" />
                <span>{status === 'submitting' ? 'SLANJE...' : 'POŠALJI PORUKU'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
