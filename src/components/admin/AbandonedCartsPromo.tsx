import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Trash2, ShoppingCart, AlertTriangle, Phone, Mail, Clock, Ticket, CheckCircle2 } from 'lucide-react';

export const AbandonedCartsPromo = () => {
  const [carts, setCarts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const fetchCarts = async () => {
    try {
      const snap = await getDocs(collection(db, 'abandoned_carts'));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      data.sort((a: any, b: any) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      });
      
      setCarts(data);
    } catch (e) {
      console.error("Greška pri dohvatanju korpi:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCarts();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Jeste li sigurni da želite obrisati ovu napuštenu korpu?')) {
      try {
        await deleteDoc(doc(db, 'abandoned_carts', id));
        fetchCarts();
      } catch (e) {
        alert('Došlo je do greške prilikom brisanja.');
      }
    }
  };

  const handleSendFollowUp = async (cart: any, type: '3d' | '5d') => {
    if (!cart.email) {
      alert('Ovaj kupac nije ostavio e-mail adresu.');
      return;
    }
    
    setSendingId(cart.id);
    try {
      // Šaljemo postojeći promo kod CASUAL10
      const promoCode = type === '5d' ? 'CASUAL10' : '';
      
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'abandoned',
          cartData: cart,
          followUpType: type,
          promoCode
        }),
      });
      
      if (res.ok) {
        const updateField = type === '3d' ? { notified3d: true } : { notified5d: true };
        await updateDoc(doc(db, 'abandoned_carts', cart.id), updateField);
        alert(`E-mail uspješno poslan kupcu ${cart.customerName}!`);
        fetchCarts();
      } else {
        alert('Greška pri slanju e-maila. Provjerite EmailJS postavke.');
      }
    } catch (e) {
      alert('Došlo je do greške prilikom konekcije.');
    } finally {
      setSendingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-black border-t-[#F7E97F] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-['Poppins'] text-xl font-black uppercase text-black">
            Napuštene korpe ({carts.length})
          </h2>
          <p className="text-xs text-neutral-500">
            Kupci koji su započeli kupovinu ali je nisu završili.
          </p>
        </div>
        <button 
          onClick={fetchCarts}
          className="px-4 py-2 border-2 border-neutral-300 text-xs font-bold uppercase hover:bg-neutral-100 cursor-pointer"
        >
          Osvježi
        </button>
      </div>

      {carts.length === 0 ? (
        <div className="bg-white p-12 text-center border-2 border-neutral-200">
          <AlertTriangle className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="font-['Poppins'] font-bold text-neutral-500 uppercase">Trenutno nema napuštenih korpi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {carts.map((cart) => {
            const daysOld = cart.updatedAt ? Math.floor((Date.now() - new Date(cart.updatedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
            
            return (
              <div key={cart.id} className="bg-white border-2 border-neutral-200 p-5 shadow-sm relative group hover:border-[#0A0A0A] transition-colors flex flex-col justify-between">
                <div>
                  <button 
                    onClick={() => handleDelete(cart.id)}
                    className="absolute top-3 right-3 p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 rounded transition-colors cursor-pointer"
                    title="Obriši korpu"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-amber-100 text-amber-700 flex items-center justify-center rounded-full">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-black">{cart.customerName || 'Nepoznat Kupac'}</h3>
                      <p className="text-[10px] text-neutral-500 font-mono">
                        Prije {daysOld} dana ({cart.updatedAt ? new Date(cart.updatedAt).toLocaleDateString('bs-BA') : 'Nepoznato'})
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-neutral-600 bg-[#FAF9F5] p-3 border border-neutral-200 mb-4">
                    {cart.phone && (
                      <p className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5" /> <strong>{cart.phone}</strong>
                      </p>
                    )}
                    {cart.email && (
                      <p className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5" /> {cart.email}
                      </p>
                    )}
                    {(!cart.phone && !cart.email) && (
                      <p className="italic text-neutral-400">Nema kontakt podataka.</p>
                    )}
                  </div>

                  <div className="space-y-1 text-xs mb-4">
                    <p className="font-['Poppins'] font-bold text-neutral-800 border-b border-neutral-100 pb-1 mb-2">Artikli u korpi:</p>
                    {cart.items && cart.items.length > 0 ? (
                      cart.items.map((it: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-[11px]">
                          <span className="truncate pr-2">{it.quantity}x {it.name} ({it.size})</span>
                          <span className="font-bold">{(it.price * it.quantity).toFixed(2)} KM</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-neutral-500 italic">{cart.itemsSummary || 'Nema detalja o artiklima'}</p>
                    )}
                    <div className="flex justify-between items-center pt-3 mt-2 border-t border-neutral-200">
                      <span className="font-['Poppins'] font-bold text-[10px] uppercase text-neutral-500">Ukupna vrijednost:</span>
                      <span className="font-['Poppins'] font-black text-sm text-black">
                        {cart.total ? cart.total.toFixed(2) : '0.00'} KM
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sekcija za slanje Emailova */}
                {cart.email && (
                  <div className="pt-3 border-t border-neutral-200 space-y-2 mt-auto">
                    <button
                      onClick={() => handleSendFollowUp(cart, '3d')}
                      disabled={cart.notified3d || sendingId === cart.id}
                      className={`w-full py-2 flex items-center justify-center gap-1.5 text-[10px] font-['Poppins'] font-bold uppercase transition-colors cursor-pointer border ${
                        cart.notified3d 
                          ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed' 
                          : 'bg-white text-black border-black hover:bg-neutral-100'
                      }`}
                    >
                      {cart.notified3d ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      <span>{cart.notified3d ? 'Podsjetnik poslan' : 'Pošalji podsjetnik (3 dana)'}</span>
                    </button>

                    <button
                      onClick={() => handleSendFollowUp(cart, '5d')}
                      disabled={cart.notified5d || sendingId === cart.id}
                      className={`w-full py-2 flex items-center justify-center gap-1.5 text-[10px] font-['Poppins'] font-bold uppercase transition-colors cursor-pointer border ${
                        cart.notified5d 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200 cursor-not-allowed' 
                          : 'bg-[#0A0A0A] text-[#F7E97F] border-black hover:bg-neutral-800'
                      }`}
                    >
                      {cart.notified5d ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ticket className="w-3.5 h-3.5" />}
                      <span>{cart.notified5d ? 'Promo kod poslan' : 'Pošalji popust -10% (5 dana)'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};