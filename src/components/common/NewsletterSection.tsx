import React, { useState } from 'react';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { subscribeNewsletter } from '../../lib/db';

export const NewsletterSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMessage('Molimo unesite ispravnu e-mail adresu.');
      setStatus('error');
      return;
    }
    if (!consent) {
      setErrorMessage('Molimo označite saglasnost za primanje novosti.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage('');
    try {
      await subscribeNewsletter(email);
      setStatus('success');
      setEmail('');
      setConsent(false);
    } catch {
      setStatus('error');
      setErrorMessage('Došlo je do greške. Molimo pokušajte ponovo.');
    }
  };

  return (
    <section className="bg-[#0A0A0A] text-white py-16 px-4 sm:px-6 lg:px-8 border-y-2 border-[#F7E97F]">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-[#171717] border border-[#F7E97F] text-[#F7E97F] mb-2 rounded-full">
          <Mail className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h2 className="font-['Poppins'] text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
            Budi prvi koji sazna.
          </h2>
          <p className="text-sm text-neutral-300 max-w-lg mx-auto">
            Prijavi se i dobij obavijest čim stigne nova odjeća.
          </p>
        </div>

        {status === 'success' ? (
          <div className="bg-emerald-950 border border-emerald-500 text-emerald-200 p-6 flex flex-col items-center gap-2 max-w-md mx-auto animate-fadeIn">
            <CheckCircle2 className="w-8 h-8 text-[#F7E97F]" />
            <span className="font-['Poppins'] font-bold text-sm uppercase tracking-wider">
              Uspješno ste prijavljeni!
            </span>
            <p className="text-xs text-neutral-300 text-center">
              Hvala na povjerenju. Obavijestit ćemo vas o novim casual dropovima.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4 text-left">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Unesite vaš e-mail..."
                required
                className="flex-1 bg-[#171717] border border-neutral-700 px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#F7E97F]"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="bg-[#F7E97F] text-[#0A0A0A] font-['Poppins'] font-black uppercase tracking-wider text-xs px-6 py-3 hover:bg-[#ebd965] transition-colors disabled:opacity-50 shrink-0"
              >
                {status === 'loading' ? 'Prijavljivanje...' : 'PRIJAVI SE'}
              </button>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-neutral-300 select-none">
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
              <div className="flex items-center gap-2 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </form>
        )}
      </div>
    </section>
  );
};
