import React, { useState } from 'react';
import { Instagram, Phone, Mail, MapPin, Truck, ShieldCheck, RefreshCw, CreditCard, Send, CheckCircle2 } from 'lucide-react';
import { Logo } from '../common/Logo';
import { useCart } from '../../context/CartContext';
import { subscribeNewsletter } from '../../lib/db';

interface FooterProps {
  onNavigate: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { settings } = useCart();
  const [footerEmail, setFooterEmail] = useState('');
  const [footerConsent, setFooterConsent] = useState(false);
  const [footerStatus, setFooterStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleFooterNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!footerEmail || !footerEmail.includes('@') || !footerConsent) {
      setFooterStatus('error');
      return;
    }
    try {
      await subscribeNewsletter(footerEmail);
      setFooterStatus('success');
      setFooterEmail('');
      setFooterConsent(false);
    } catch {
      setFooterStatus('error');
    }
  };

  return (
    <footer className="bg-[#0A0A0A] text-white border-t-2 border-[#F7E97F] pt-14 pb-12">
      {/* Trust Badges Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-14 pb-10 border-b border-neutral-900">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="flex flex-col items-center p-3">
            <Truck className="w-7 h-7 text-[#F7E97F] mb-2.5" />
            <span className="font-['Poppins'] text-xs font-bold uppercase tracking-wider text-white">
              Dostava širom BiH
            </span>
            <span className="text-[11px] text-neutral-400 mt-1">2–5 radnih dana na vašu adresu</span>
          </div>
          <div className="flex flex-col items-center p-3">
            <CreditCard className="w-7 h-7 text-[#F7E97F] mb-2.5" />
            <span className="font-['Poppins'] text-xs font-bold uppercase tracking-wider text-white">
              Plaćanje pouzećem
            </span>
            <span className="text-[11px] text-neutral-400 mt-1">Plaćaš kuriru pri preuzimanju</span>
          </div>
          <div className="flex flex-col items-center p-3">
            <RefreshCw className="w-7 h-7 text-[#F7E97F] mb-2.5" />
            <span className="font-['Poppins'] text-xs font-bold uppercase tracking-wider text-white">
              Zamjena i povrat
            </span>
            <span className="text-[11px] text-neutral-400 mt-1">Pravo na povrat u roku 14 dana</span>
          </div>
          <div className="flex flex-col items-center p-3">
            <ShieldCheck className="w-7 h-7 text-[#F7E97F] mb-2.5" />
            <span className="font-['Poppins'] text-xs font-bold uppercase tracking-wider text-white">
              Casual Kvalitet
            </span>
            <span className="text-[11px] text-neutral-400 mt-1">Udobna odjeća za svaki dan</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand Intro & Logo */}
          <div className="lg:col-span-2 space-y-4">
            <Logo className="w-14 h-14" />
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-sm font-['Inter']">
              Casual Shop BiH je brend za one koji vole udobnu i stilsku odjeću za svaki dan.
              Počeli smo na Instagramu, a sada smo tu i online.
            </p>
            <div className="pt-1 flex items-center gap-3">
              <a
                href={settings.instagramUrl || 'https://www.instagram.com/casualshop.bih'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#171717] hover:bg-[#F7E97F] text-white hover:text-[#0A0A0A] text-xs font-['Poppins'] font-bold px-3.5 py-2 border border-neutral-800 transition-colors"
              >
                <Instagram className="w-4 h-4 text-[#F7E97F] hover:text-[#0A0A0A]" />
                <span>@casualshop.bih</span>
              </a>
              <a
                href={`https://wa.me/${(settings.whatsappNumber || '38761000000').replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#171717] hover:bg-[#F7E97F] text-white hover:text-[#0A0A0A] text-xs font-['Poppins'] font-bold px-3.5 py-2 border border-neutral-800 transition-colors"
              >
                <Phone className="w-4 h-4 text-[#F7E97F]" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Brzi Linkovi */}
          <div>
            <h4 className="font-['Poppins'] text-xs font-bold uppercase tracking-[0.2em] text-[#F7E97F] mb-4">
              Stranice
            </h4>
            <ul className="space-y-2.5 text-xs text-neutral-300 font-['Inter']">
              <li>
                <button
                  onClick={() => onNavigate('shop')}
                  className="hover:text-[#F7E97F] transition-colors"
                >
                  Shop
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('about')}
                  className="hover:text-[#F7E97F] transition-colors"
                >
                  O nama
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('contact')}
                  className="hover:text-[#F7E97F] transition-colors"
                >
                  Kontakt
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('shipping')}
                  className="hover:text-[#F7E97F] transition-colors"
                >
                  Dostava i povrat
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('terms')}
                  className="hover:text-[#F7E97F] transition-colors"
                >
                  Uslovi korištenja
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('privacy')}
                  className="hover:text-[#F7E97F] transition-colors"
                >
                  Politika privatnosti
                </button>
              </li>
            </ul>
          </div>

          {/* Kontakt */}
          <div>
            <h4 className="font-['Poppins'] text-xs font-bold uppercase tracking-[0.2em] text-[#F7E97F] mb-4">
              Kontakt
            </h4>
            <ul className="space-y-3 text-xs text-neutral-300 font-['Inter']">
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#F7E97F] shrink-0" />
                <span>{settings.phone || '+387 61 000 000'}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#F7E97F] shrink-0" />
                <span>{settings.email || 'info@casualshop.ba'}</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#F7E97F] shrink-0 mt-0.5" />
                <span>Dostava u sve gradove u Bosni i Hercegovini</span>
              </li>
            </ul>
          </div>

          {/* Newsletter u footeru */}
          <div>
            <h4 className="font-['Poppins'] text-xs font-bold uppercase tracking-[0.2em] text-[#F7E97F] mb-3">
              Newsletter
            </h4>
            <p className="text-[11px] text-neutral-400 mb-3">
              Budi prvi koji sazna. Prijavi se za obavijesti o novoj odjeći.
            </p>

            {footerStatus === 'success' ? (
              <div className="flex items-center gap-1.5 text-xs text-[#F7E97F] font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Hvala na prijavi!</span>
              </div>
            ) : (
              <form onSubmit={handleFooterNewsletter} className="space-y-2 text-xs">
                <div className="flex">
                  <input
                    type="email"
                    required
                    value={footerEmail}
                    onChange={(e) => setFooterEmail(e.target.value)}
                    placeholder="Tvoj e-mail..."
                    className="w-full bg-[#171717] border border-neutral-700 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#F7E97F]"
                  />
                  <button
                    type="submit"
                    className="bg-[#F7E97F] text-[#0A0A0A] px-3 font-bold hover:bg-[#ebd965] transition-colors shrink-0"
                    title="Prijavi se"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>

                <label className="flex items-start gap-1.5 text-[10px] text-neutral-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={footerConsent}
                    onChange={(e) => setFooterConsent(e.target.checked)}
                    className="mt-0.5 accent-[#F7E97F]"
                  />
                  <span>Pristajem na primanje novosti.</span>
                </label>
              </form>
            )}
          </div>
        </div>

        {/* Bottom Bar sa specificiranim tekstom */}
        <div className="border-t border-neutral-900 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 gap-4">
          <p>© {new Date().getFullYear()} Casual Shop BiH. Sva prava zadržana.</p>
          <div className="font-['Poppins'] font-bold text-xs text-neutral-300 text-center sm:text-right">
            <span>Plaćanje pouzećem. Kartično plaćanje uskoro u ponudi.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
