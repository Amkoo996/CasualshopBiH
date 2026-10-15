import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Trash2, ShoppingCart, AlertTriangle, Phone, Mail } from 'lucide-react';

export const AbandonedCartsPromo = () => {
  const [carts, setCarts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCarts = async () => {
    try {
      const snap = await getDocs(collection(db, 'abandoned_carts'));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Sigurno sortiranje - sprječava crash na starim objektima bez datuma
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
          {carts.map((cart) => (
            <div key={cart.id} className="bg-white border-2 border-neutral-200 p-5 shadow-sm relative group hover:border-[#0A0A0A] transition-colors">
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
                    {cart.updatedAt ? new Date(cart.updatedAt).toLocaleString('bs-BA') : 'Nepoznat datum'}
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

              <div className="space-y-1 text-xs">
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
          ))}
        </div>
      )}
    </div>
  );
};