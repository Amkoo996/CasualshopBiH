import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const ContactPage: React.FC = () => {
  const { settings } = useCart();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'Upit o artiklu / narudžbi',
    message: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errorMsg) setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.message.trim()) {
      setErrorMsg('Molimo popunite vaša obavezna polja (Ime i Poruku).');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      // 1. SPREMANJE PORUKE U FIRESTORE BAZU (Kolekcija: contact_messages)
      await addDoc(collection(db, 'contact_messages'), {
        name: formData.name,
        email: formData.email || 'Nije unesen',
        phone: formData.phone || 'Nije unesen',
        subject: formData.subject,
        message: formData.message,
        createdAt: new Date().toISOString(),
        read: false,
      });

      // 2. SLANJE E-MAIL OBAVIJESTI NA VAŠ MAIL VIA EMAILJS
      const recipientEmail = settings?.email || 'redemption19@gmail.com';

      await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: 'service_h4rxrv2',
          template_id: 'template_b7r6ees',
          user_id: 'mPKyquhWRcGkRq4gS',
          template_params: {
            customer_name: formData.name,
            customer_email: formData.email || 'Nije unesen',
            customer_phone: formData.phone || 'Nije unesen',
            customer_note: `Tema: ${formData.subject}\n\nPoruka:\n${formData.message}`,
            reply_to: formData.email || recipientEmail,
          },
        }),
      });

      setSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: 'Upit o artiklu / narudžbi',
        message: '',
      });
    } catch (err: any) {
      console.error('Greška pri slanju kontakt forme:', err);
      setErrorMsg('Došlo je do greške pri slanju poruke. Pokušajte ponovo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Header */}
      <div className="border-b-2 border-neutral-300 pb-6">
        <span className="text-xs font-['Poppins'] font-black uppercase tracking-[0.2em] text-neutral-500 block mb-1">
          KORISNIČKA PODRŠKA
        </span>
        <h1 className="font-['Poppins'] text-3xl sm:text-4xl font-black uppercase tracking-tight text-[#0A0A0A]">
          KONTAKTIRAJTE NAS
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600 mt-2 font-['Inter'] max-w-xl">
          Imate pitanje u vezi veličine, stanja artikala ili narudžbe? Pošaljite nam poruku i odgovorit ćemo Vam u najkraćem roku.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Kontakt informacije */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#0A0A0A] text-white p-6 sm:p-8 border-2 border-[#F7E97F] space-y-6 shadow-md">
            <h2 className="font-['Poppins'] text-sm font-black uppercase tracking-[0.2em] text-[#F7E97F] border-b border-neutral-800 pb-3">
              Informacije o trgovini
            </h2>

            <div className="space-y-5 text-xs font-['Inter']">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#F7E97F] shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-['Poppins'] uppercase text-white mb-0.5">Lokacija i Lično preuzimanje:</strong>
                  <p className="text-neutral-300">Sarajevo, Alipašino polje (Bosna i Hercegovina)</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-[#F7E97F] shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-['Poppins'] uppercase text-white mb-0.5">Telefon / Podrška:</strong>
                  <p className="text-neutral-300">{settings?.phone || '+387 61 000 000'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[#F7E97F] shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-['Poppins'] uppercase text-white mb-0.5">E-mail adresa:</strong>
                  <p className="text-neutral-300">{settings?.email || 'info@casualshop.ba'}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-800 text-[11px] text-neutral-400">
              <p>Radno vrijeme online podrške: Pon - Sub (09:00 - 20:00h)</p>
            </div>
          </div>
        </div>

        {/* Kontakt Forma */}
        <div className="lg:col-span-7">
          <div className="bg-white p-6 sm:p-8 border-2 border-neutral-300 shadow-sm space-y-6">
            <h2 className="font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] text-black border-b-2 border-neutral-200 pb-3">
              Pošaljite nam direktnu poruku
            </h2>

            {success ? (
              <div className="bg-emerald-50 border-2 border-emerald-500 p-6 text-center space-y-3 animate-fadeIn">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="font-['Poppins'] text-sm font-black uppercase text-emerald-900">
                  Poruka je uspješno poslana!
                </h3>
                <p className="text-xs text-emerald-700 font-['Inter']">
                  Hvala Vam na javljanju. Vaš upit je zaprimljen i naš tim će Vam odgovoriti u najkraćem roku.
                </p>
                <button
                  type="button"
                  onClick={() => setSuccess(false)}
                  className="px-5 py-2 bg-[#0A0A0A] text-white font-['Poppins'] text-xs uppercase tracking-wider hover:bg-black transition-colors"
                >
                  Pošalji novu poruku
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs font-['Inter']">
                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-300 text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-['Poppins'] font-bold uppercase text-neutral-700 mb-1">
                      Vaše Ime i Prezime *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="npr. Haris Hodžić"
                      className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs sm:text-sm focus:bg-white focus:border-black focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-['Poppins'] font-bold uppercase text-neutral-700 mb-1">
                      Broj telefona <span className="text-neutral-400 font-normal">(opciono)</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="npr. 061 123 456"
                      className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs sm:text-sm focus:bg-white focus:border-black focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-['Poppins'] font-bold uppercase text-neutral-700 mb-1">
                      E-mail adresa <span className="text-neutral-400 font-normal">(za odgovor)</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="npr. haris@gmail.com"
                      className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs sm:text-sm focus:bg-white focus:border-black focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-['Poppins'] font-bold uppercase text-neutral-700 mb-1">
                      Tema poruke *
                    </label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs sm:text-sm font-['Poppins'] font-bold focus:bg-white focus:border-black focus:outline-none cursor-pointer"
                    >
                      <option value="Upit o artiklu / narudžbi">Upit o artiklu / narudžbi</option>
                      <option value="Provjera veličine">Provjera veličine</option>
                      <option value="Lično preuzimanje Sarajevo">Lično preuzimanje Sarajevo</option>
                      <option value="Reklamacija ili zamjena">Reklamacija ili zamjena</option>
                      <option value="Ostalo">Ostalo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-['Poppins'] font-bold uppercase text-neutral-700 mb-1">
                    Vaša poruka *
                  </label>
                  <textarea
                    name="message"
                    rows={5}
                    required
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Napišite vaše pitanje ili napomenu..."
                    className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs sm:text-sm focus:bg-white focus:border-black focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border-2 border-[#0A0A0A] cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>SLANJE PORUKE...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>POŠALJI PORUKU</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
