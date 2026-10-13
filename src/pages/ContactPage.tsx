import React, { useState } from 'react';
import { Mail, MapPin, Send, CheckCircle2, AlertCircle, Instagram, Clock, PhoneCall, Sparkles } from 'lucide-react';
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

    const rawPhone = formData.phone.trim();
    const cleanPhone = normalizePhone(rawPhone);

    if (!rawPhone || rawPhone.length < 8 || !isValidPhone(rawPhone) || !cleanPhone) {
      setStatus('error');
      setPhoneError('Unesite ispravan broj telefona (npr. 061123456 ili +38761123456).');
      setErrorMessage('Broj telefona nije u ispravnom formatu.');
      return;
    }

    setPhoneError('');
    setStatus('submitting');
    setErrorMessage('');

    try {
      const contactBotToken = import.meta.env.VITE_TELEGRAM_CONTACT_BOT_TOKEN;
      const rawChatIds = import.meta.env.VITE_TELEGRAM_CHAT_ID;

      if (!contactBotToken || !rawChatIds) {
        setStatus('error');
        setErrorMessage('Sistem za kontakt trenutno nije konfigurisan na serveru.');
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
          console.error(`Telegram Kontakt Bot Greška za Chat ID (${chatId}):`, tgData);
        }
      }

      if (anySuccess) {
        setStatus('success');
        setFormData({ name: '', email: '', phone: '', message: '', bot_field: '' });
      } else {
        setStatus('error');
        setErrorMessage('Greška pri slanju. Provjerite da li ste pokrenuli bot @Casualshopbihkontakt_bot.');
      }
    } catch (err) {
      console.error('Mrežna greška pri slanju:', err);
      setStatus('error');
      setErrorMessage('Mrežna greška pri slanju poruke. Pokušajte ponovo.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 font-['Inter']">
      {/* ZAGLAVLJE STRANICE */}
      <div className="text-center space-y-3 mb-12 sm:mb-16">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F7E97F] border border-black font-['Poppins'] text-[11px] font-black uppercase tracking-[0.2em] text-[#0A0A0A]">
          <Sparkles className="w-3.5 h-3.5 text-black" /> PODRŠKA KUPCIMA
        </span>
        <h1 className="font-['Poppins'] text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#0A0A0A]">
          KONTAKTIRAJTE NAS
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600 max-w-lg mx-auto font-['Inter']">
          Imate pitanja o dimenzijama, brzini dostave ili zamjeni veličine? Javite nam se i odgovorit ćemo Vam u najkraćem roku.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* LIJEVA STRANA - BRZI KONTAKTI I INFORMACIJE */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 sm:p-8 border-2 border-neutral-900 shadow-[4px_4px_0px_0px_rgba(10,10,10,1)] space-y-6">
            <h2 className="font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] text-[#0A0A0A] border-b-2 border-neutral-200 pb-3 flex items-center justify-between">
              <span>Direktni kanali</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </h2>

            <div className="space-y-4 text-xs">
              <a
                href={settings?.instagramUrl || 'https://www.instagram.com/casualshop.bih'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 bg-[#F4F2EC] border-2 border-neutral-300 hover:border-black hover:bg-[#F7E97F] transition-all group cursor-pointer"
              >
                <div className="p-2.5 bg-white border border-neutral-300 group-hover:border-black shrink-0">
                  <Instagram className="w-5 h-5 text-pink-600 group-hover:text-black transition-colors" />
                </div>
                <div>
                  <span className="font-['Poppins'] font-black uppercase block text-black text-xs">
                    Instagram DM
                  </span>
                  <span className="text-[11px] text-neutral-600 font-semibold group-hover:text-black">
                    @casualshop.bih (Najbrži odgovor)
                  </span>
                </div>
              </a>

              <div className="flex items-center gap-4 p-4 bg-[#F4F2EC] border-2 border-neutral-300">
                <div className="p-2.5 bg-white border border-neutral-300 shrink-0">
                  <Mail className="w-5 h-5 text-neutral-800" />
                </div>
                <div>
                  <span className="font-['Poppins'] font-black uppercase block text-black text-xs">
                    E-mail podrška
                  </span>
                  <span className="text-[11px] text-neutral-600 font-medium">
                    {settings?.email || 'info@casualshop.ba'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-[#F4F2EC] border-2 border-neutral-300">
                <div className="p-2.5 bg-white border border-neutral-300 shrink-0">
                  <MapPin className="w-5 h-5 text-neutral-800" />
                </div>
                <div>
                  <span className="font-['Poppins'] font-black uppercase block text-black text-xs">
                    Lokacija & Dostava
                  </span>
                  <span className="text-[11px] text-neutral-600 font-medium">
                    Sarajevo (Lično preuzimanje) • Dostava brze pošte u sve gradove BiH
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* KARTICA SA RADNIM VREMENOM */}
          <div className="p-6 bg-[#0A0A0A] text-white border-2 border-[#F7E97F] shadow-[4px_4px_0px_0px_rgba(247,233,127,1)] space-y-3">
            <div className="flex items-center gap-2 text-[#F7E97F]">
              <Clock className="w-4 h-4 shrink-0" />
              <h3 className="font-['Poppins'] font-black text-xs uppercase tracking-wider">
                Radno vrijeme podrške
              </h3>
            </div>
            <p className="text-xs text-neutral-300 font-['Inter'] leading-relaxed">
              Ponedjeljak – Subota: <strong>09:00 – 20:00h</strong><br />
              Dostupni smo za poruke i pitanja na Instagramu i vikendom.
            </p>
          </div>
        </div>

        {/* DESNA STRANA - FORMULAR FORME */}
        <div className="lg:col-span-7">
          <div className="bg-white p-6 sm:p-10 border-2 border-neutral-900 shadow-[6px_6px_0px_0px_rgba(10,10,10,1)] space-y-6">
            <div className="border-b-2 border-neutral-200 pb-4">
              <h2 className="font-['Poppins'] text-sm sm:text-base font-black uppercase tracking-[0.15em] text-[#0A0A0A] flex items-center gap-2">
                <Send className="w-4 h-4 text-black" /> POŠALJITE UPIT FORMULAROM
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Polja označena zvjezdicom (*) su obavezna.
              </p>
            </div>

            {status === 'success' ? (
              <div className="p-6 bg-emerald-50 border-2 border-emerald-600 text-emerald-900 text-xs font-['Inter'] space-y-3 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <span className="font-['Poppins'] font-black uppercase text-sm">Poruka je uspješno poslata!</span>
                </div>
                <p className="text-emerald-800 leading-relaxed">
                  Hvala Vam na javljanju. Naš tim će obraditi Vaš upit i odgovoriti Vam na uneseni broj telefona ili e-mail u najkraćem roku.
                </p>
                <button
                  onClick={() => setStatus('idle')}
                  className="mt-2 px-4 py-2 bg-emerald-800 text-white font-['Poppins'] text-[11px] font-bold uppercase tracking-wider hover:bg-black transition-colors cursor-pointer"
                >
                  Pošalji novu poruku
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {status === 'error' && errorMessage && (
                  <div className="p-3 bg-red-50 border-2 border-red-500 text-red-800 text-xs flex items-center gap-2.5 font-medium">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* HONEYPOT POLJE ZA SPAM BOTOVE */}
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
                  <label htmlFor="contact-name" className="block text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-800 mb-1.5">
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
                    className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-3 text-xs sm:text-sm focus:bg-white focus:border-black focus:outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="contact-email" className="block text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-800 mb-1.5">
                      E-mail adresa *
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="npr. tvoj@email.com"
                      className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-3 text-xs sm:text-sm focus:bg-white focus:border-black focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-phone" className="block text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-800 mb-1.5">
                      Broj telefona (mobitel) *
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
                      placeholder="npr. 061123456"
                      className={`w-full bg-[#F4F2EC] border-2 ${
                        phoneError ? 'border-red-500 bg-red-50' : 'border-neutral-300 focus:border-black'
                      } p-3 text-xs sm:text-sm focus:bg-white focus:outline-none transition-colors`}
                    />
                    {phoneError && (
                      <p className="text-red-600 text-[11px] mt-1 font-semibold">{phoneError}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-800 mb-1.5">
                    Vaša poruka *
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    required
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Napišite Vaše pitanje u vezi artikla, velicina ili narudžbe..."
                    className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-3 text-xs sm:text-sm focus:bg-white focus:border-black focus:outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full py-4 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 cursor-pointer border-2 border-[#0A0A0A] shadow-md active:scale-[0.99] disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{status === 'submitting' ? 'SLANJE PORUKE...' : 'POŠALJI PORUKU'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
