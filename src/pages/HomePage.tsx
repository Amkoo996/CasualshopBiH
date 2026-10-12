import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, Download, Send, Clock } from 'lucide-react';
import { getCartSessions } from '../../lib/tracking';
import { CartSession } from '../../types';
import { useCart } from '../../context/CartContext';
import { sendEmailNotification } from '../../lib/email';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export const AbandonedCartsPromo: React.FC = () => {
  const { settings } = useCart();
  const [sessions, setSessions] = useState<CartSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await getCartSessions();
      setSessions(data);
    } catch (err) {
      console.error('Greška pri učitavanju napuštenih korpi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleSendReminder = async (session: CartSession) => {
    if (!session.email) {
      alert('Kupac nije ostavio email adresu.');
      return;
    }

    setSendingId(session.id);
    try {
      const itemsList = session.items
        .map((i) => `• ${i.quantity}x ${i.name} (${i.size})`)
        .join('\n');

      const messageBody = `
Pozdrav ${session.customerName || 'Kupče'},

Primijetili smo da ste ostavili artikle u vašoj korpi u Casual Shop BiH!

Naručeni artikli:
${itemsList}

Ukupno: ${session.subtotal.toFixed(2)} KM

Možete završiti vašu narudžbu klikom na našu stranicu.

Srdačan pozdrav,
Casual Shop BiH
      `.trim();

      await sendEmailNotification({
        to_email: session.email,
        to_name: session.customerName || 'Kupac',
        subject: 'Zaboravili ste artikle u korpi - Casual Shop BiH',
        message: messageBody,
      });

      // Označavanje u Firestore bazi da je email poslan
      try {
        const sessionRef = doc(db, 'cart_sessions', session.id);
        await updateDoc(sessionRef, {
          emailSent: true,
          emailSentAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Upozorenje pri ažuriranju statusa u bazi:', e);
      }

      // Lokalno ažuriranje stanja
      setSessions((prev) =>
        prev.map((s) =>
          s.id === session.id
            ? { ...s, emailSent: true, emailSentAt: new Date().toISOString() }
            : s
        )
      );

      alert(`Podsjetnik je uspješno poslan na ${session.email}`);
    } catch (err) {
      console.error('Greška pri slanju emaila:', err);
      alert('Došlo je do greške pri slanju emaila.');
    } finally {
      setSendingId(null);
    }
  };

  const handleExportCSV = () => {
    if (sessions.length === 0) return;
    const headers = 'Kupac,Email,Telefon,Vrijednost KM,Datum,Email Poslan\n';
    const rows = sessions
      .map((s) => `"${s.customerName || 'Nepoznat'}","${s.email || ''}","${s.phone || ''}","${s.subtotal.toFixed(2)}","${s.updatedAt}","${s.emailSent ? 'Da' : 'Ne'}"`)
      .join('\n');
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(headers + rows);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `napustene_korpe_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-['Inter']">
      <div className="bg-white p-6 border-2 border-neutral-300 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#0A0A0A] text-[#F7E97F] text-[10px] font-['Poppins'] font-black uppercase px-2 py-0.5">
                SMART MARKETING
              </span>
              <span className="text-xs text-neutral-500 font-['Inter']">Automatizacija Podsjetnika</span>
            </div>
            <h2 className="font-['Poppins'] text-lg font-black uppercase tracking-tight text-black mt-1 flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#0A0A0A]" />
              <span>NAPUŠTENE KORPE & E-MAIL PODSJETNICI</span>
            </h2>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-white border-2 border-neutral-300 hover:border-black text-xs font-['Poppins'] font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Izvezi Kontakte (CSV)</span>
          </button>
        </div>

        <div className="bg-[#F4F2EC] p-4 border border-neutral-300 text-xs text-neutral-700 space-y-1">
          <p className="font-bold text-black font-['Poppins'] uppercase">Logika slanja e-mail podsjetnika:</p>
          <p>• Ovdje možete ručno poslati podsjetnik kupcima koji su unijeli kontakt podatke ali nisu završili narudžbu.</p>
          <p>• Nakon slanja emaila, korpa se označava kao **POSLANO** kako biste izbjegli spamanje istog kupca.</p>
        </div>
      </div>

      <div className="bg-white border-2 border-neutral-200 overflow-x-auto shadow-sm">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#0A0A0A] text-white font-['Poppins'] font-bold uppercase">
            <tr>
              <th className="p-3">Kupac / Kontakt</th>
              <th className="p-3">Artikli u korpi</th>
              <th className="p-3">Vrijednost</th>
              <th className="p-3">Starost korpe</th>
              <th className="p-3">Status Emaila</th>
              <th className="p-3 text-right">Akcija</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-neutral-500 font-['Inter']">Učitavanje napuštenih korpi...</td>
              </tr>
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-neutral-500 font-['Inter']">Trenutno nema registrovanih napuštenih korpi.</td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id} className="hover:bg-neutral-50">
                  <td className="p-3">
                    <span className="font-['Poppins'] font-bold text-neutral-900 block">{session.customerName || 'Nepoznat kupac'}</span>
                    {session.email && <span className="text-[11px] text-neutral-600 block">✉️ {session.email}</span>}
                    {session.phone && <span className="text-[11px] text-neutral-600 block">📞 {session.phone}</span>}
                  </td>
                  <td className="p-3">
                    <div className="space-y-1">
                      {session.items.map((it, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[11px]">
                          <img src={it.image} alt={it.name} className="w-6 h-7 object-cover border border-neutral-300" />
                          <span>{it.name} ({it.size}) ×{it.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 font-['Poppins'] font-bold text-black">{session.subtotal.toFixed(2)} KM</td>
                  <td className="p-3 text-neutral-500 text-[11px]">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-neutral-400" />
                      <span>{new Date(session.updatedAt).toLocaleDateString('bs-BA')}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    {session.emailSent ? (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-['Poppins'] font-bold uppercase rounded border border-emerald-300 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Email Poslan</span>
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-amber-100 text-amber-800 text-[10px] font-['Poppins'] font-bold uppercase rounded border border-amber-300">
                        Nije Poslano
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleSendReminder(session)}
                      disabled={session.emailSent || sendingId === session.id || !session.email}
                      className="px-3 py-2 bg-[#0A0A0A] hover:bg-[#F7E97F] hover:text-black text-white font-['Poppins'] text-[11px] font-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-black inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>
                        {sendingId === session.id
                          ? 'Slanje...'
                          : session.emailSent
                          ? 'Već Poslano'
                          : 'Pošalji Email'}
                      </span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
