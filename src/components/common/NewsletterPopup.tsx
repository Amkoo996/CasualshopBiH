import React, { useState, useEffect } from 'react';
import { X, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { subscribeNewsletter } from '../../lib/db';

export const NewsletterPopup: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Check if dismissed previously in localStorage
    const dismissed = localStorage.getItem('cs_newsletter_popup_dismissed');
    if (dismissed) return;

    // Show after 15 seconds
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 15000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('cs_newsletter_popup_dismissed', 'true');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('Molimo unesite ispravnu e-mail adresu.');
      setStatus('error');
      return;
    }
    if (!consent) {
      setErrorMsg('Molimo označite saglasnost.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMsg('');
    try {
      await subscribeNewsletter(email);
      setStatus('success');
      localStorage.setItem('cs_newsletter_popup_dismissed', 'true');
      setTimeout(() => {
        setIsOpen(false);
      }, 3000);
    } catch {
      setStatus('error');
      setErrorMsg('Došlo je do greške. Pokušajte ponovo.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#0A0A0A] text-white border-2 border-[#F7E97F] p-7 shadow-2xl space-y-5">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-3.5 right-3.5 p-1 text-neutral-400 hover:text-white transition-colors"
          aria-label="Zatvori prozor"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="w-12 h-12 rounded-full bg-[#F7E97F] text-[#0A0A0A] flex items-center justify-center mx-auto">
          <Mail className="w-6 h-6" />
        </div>

        <div className="text-center space-y-1.5">
          <h3 className="font-['Poppins'] font-black uppercase tracking-wider text-xl text-white">
            Budi prvi koji sazna.
          </h3>
          <p className="text-xs text-neutral-300">
            Prijavi se i dobij obavijest čim stigne nova odjeća.
          </p>
        </div>

        {status === 'success' ? (
          <div className="bg-emerald-950 border border-emerald-500 text-emerald-200 p-4 text-center space-y-1">
            <CheckCircle2 className="w-6 h-6 text-[#F7E97F] mx-auto" />
            <p className="font-bold text-xs uppercase tracking-wider">Hvala na prijavi!</p>
            <p className="text-[11px] text-neutral-300">Uskoro vam šaljemo prve novosti.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs text-left">
            <div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Tvoja e-mail adresa..."
                className="w-full bg-[#171717] border border-neutral-700 px-3.5 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-[#F7E97F]"
              />
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-neutral-300 select-none">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 accent-[#F7E97F] cursor-pointer"
              />
              <span>
                Pristajem na primanje novosti i promocija. Odjava je moguća u svakom trenutku.
              </span>
            </label>

            {status === 'error' && (
              <div className="flex items-center gap-1.5 text-red-400 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-3 bg-[#F7E97F] text-[#0A0A0A] font-['Poppins'] font-black uppercase tracking-wider text-xs hover:bg-[#ebd965] transition-colors disabled:opacity-50"
            >
              {status === 'loading' ? 'Prijavljivanje...' : 'PRIJAVI SE'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
