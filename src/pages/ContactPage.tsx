import React, { useState } from 'react';
import { Mail, MapPin, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';

export const ContactPage: React.FC = () => {
  const { settings } = useCart();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    bot_field: '', // Honeypot polje
  });

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // HONEYPOT PROVJERA: Ako je bot popunio skriveno polje, odbaci slanje
    if (formData.bot_field) {
      setStatus('success');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      // EmailJS poziv za Kontakt formu (template_atnmhpk)
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: 'service_h4rxrv2',
          template_id: 'template_atnmhpk',
          user_id: 'mPKyquhWRcGkRq4gS',
          template_params: {
            from_name: formData.name,
            from_email: formData.email,
            from_phone: formData.phone || 'Nije navedeno',
            message: formData.message,
            to_email: settings?.email || 'info@casualshop.ba',
          },
        }),
      });

      if (res.ok) {
        setStatus('success');
        setFormData({ name: '', email: '', phone: '', message: '', bot_field: '' });
      } else {
        setStatus('error');
        setErrorMessage('Greška pri slanju poruke. Molimo pokušajte ponovo.');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Mrežna greška. Provjerite vašu internet konekciju.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
      <h1 className="font-['Poppins'] text-2xl sm:text-3xl font-black uppercase text-center mb-8">
        Kontaktirajte nas
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-6 border-2 border-neutral-200">
        <div className="space-y-4">
          <h2 className="font-['Poppins'] text-sm font-bold uppercase text-black">
            Informacije
          </h2>
          <div className="flex items-center gap-3 text-xs font-['Inter']">
            <Mail className="w-4 h-4 text-[#0A0A0A]" />
            <span>{settings?.email || 'info@casualshop.ba'}</span>
          </div>
          <div className="flex items-center gap-3 text-xs font-['Inter']">
            <MapPin className="w-4 h-4 text-[#0A0A0A]" />
            <span>Sarajevo, Bosna i Hercegovina</span>
          </div>
        </div>

        <div>
          {status === 'success' ? (
            <div className="p-4 bg-emerald-50 border border-emerald-500 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Vaša poruka je uspješno poslata! Odgovorit ćemo Vam u najkraćem roku.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {status === 'error' && (
                <div className="p-2.5 bg-red-50 border border-red-500 text-red-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* HONEYPOT NEVIDLJIVO POLJE */}
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
                <label className="block text-xs font-bold uppercase mb-1">Ime i prezime *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full bg-[#F4F2EC] border border-neutral-300 p-2 text-xs focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">E-mail *</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-[#F4F2EC] border border-neutral-300 p-2 text-xs focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">Broj telefona</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full bg-[#F4F2EC] border border-neutral-300 p-2 text-xs focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">Poruka *</label>
                <textarea
                  name="message"
                  required
                  rows={4}
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full bg-[#F4F2EC] border border-neutral-300 p-2 text-xs focus:outline-none focus:border-black"
                />
              </div>

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full py-3 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-bold text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer"
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
