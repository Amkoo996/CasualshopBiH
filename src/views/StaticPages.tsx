import React, { useState } from 'react';
import { Mail, MapPin, Instagram, ShieldCheck, Truck, RefreshCw, Send, CheckCircle2, AlertCircle, Loader2, PackageCheck, Search } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useCart } from '../context/CartContext';
import { getOrderByNumberAndPhone } from '../lib/db';

interface StaticPageProps {
  page: 'about' | 'contact' | 'terms' | 'shipping' | 'privacy';
}

export const StaticPages: React.FC<StaticPageProps> = ({ page }) => {
  const { settings } = useCart();
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactSending, setContactSending] = useState(false);
  const [contactError, setContactError] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [contactData, setContactData] = useState({ name: '', email: '', phone: '', message: '' });

  // Tracking State
  const [orderNumber, setOrderNumber] = useState('');
  const [trackPhone, setTrackPhone] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [foundOrder, setFoundOrder] = useState<{ orderNumber: string; status: string; createdAt: string } | null>(null);
  const [trackError, setTrackError] = useState('');

  const sellerNameDisplay = settings.sellerName?.trim() || 'Casual Shop BiH';
  const sellerAddressDisplay = settings.sellerAddress?.trim() || 'Bosna i Hercegovina';
  const sellerEmailDisplay = settings.email?.trim() || 'info@casualshop.ba';

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !trackPhone.trim()) return;

    setTrackLoading(true);
    setTrackError('');
    setFoundOrder(null);

    try {
      const order = await getOrderByNumberAndPhone(orderNumber.trim(), trackPhone.trim());
      if (order) {
        setFoundOrder(order);
      } else {
        setTrackError('Narudžba nije pronađena. Provjerite broj narudžbe i telefon.');
      }
    } catch {
      setTrackError('Došlo je do greške pri pretrazi. Pokušajte ponovo.');
    } finally {
      setTrackLoading(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError('');

    if (honeypot) {
      setContactSubmitted(true);
      return;
    }

    const lastSent = Number(localStorage.getItem('cs_contact_last') || 0);
    if (Date.now() - lastSent < 60000) {
      setContactError('Poruka je upravo poslana. Pokušajte ponovo za minut.');
      return;
    }

    if (!contactData.name.trim() || !contactData.message.trim()) {
      setContactError('Molimo popunite vaša obavezna polja (Ime i Poruku).');
      return;
    }

    setContactSending(true);

    // 1. SPREMANJE U FIREBASE BAZU
    try {
      await addDoc(collection(db, 'contact_messages'), {
        name: contactData.name,
        email: contactData.email || 'Nije uneseno',
        phone: contactData.phone || 'Nije uneseno',
        message: contactData.message,
        createdAt: new Date().toISOString(),
        read: false,
      });
    } catch (dbErr) {
      console.warn('Spremanje u bazu nije uspjelo, nastavljam slanje obavijesti:', dbErr);
    }

    // 2. INSTANT NOTIFIKACIJA PREKO SERVERLESS ENDPOINTA
    try {
      const telegramText =
        `NOVI UPIT SA KONTAKT FORME\n\n` +
        `Ime i prezime: ${contactData.name}\n` +
        `Email: ${contactData.email || 'Nije uneseno'}\n` +
        `Telefon: ${contactData.phone || 'Nije uneseno'}\n\n` +
        `Poruka:\n"${contactData.message}"`;

      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: telegramText }),
      });
    } catch (err) {
      console.warn('Telegram kontakt notifikacija nije poslata:', err);
    }

    // 3. SLANJE E-MAIL OBAVIJESTI PREKO EMAILJS
    try {
      const userContactEmail = contactData.email.trim() || 'nepoznato@casualshop.ba';

      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: 'service_h4rxrv2',
          template_id: 'template_b7r6ees',
          user_id: 'mPKyquhWRcGkRq4gS',
          template_params: {
          to_email: sellerEmailDisplay || 'info@casualshop.ba',
          email: sellerEmailDisplay || 'info@casualshop.ba',
          to_name: sellerNameDisplay || 'Casual Shop BiH',
          order_number: 'UPIT SA KONTAKT FORME',
          customer_name: contactData.name,
          customer_phone: contactData.phone || 'Nije uneseno',
          customer_email: userContactEmail,
          customer_address: 'Kontakt Forma na Sajtu',
          customer_note: contactData.message,
          items_summary: `Upit od kupca (${contactData.name}):\n\n${contactData.message}`,
          total_amount: '0.00 KM',
          shipping_fee: '0.00 KM',
          reply_to: userContactEmail,
        },
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.warn('EmailJS opomena:', errorText);
      }

      localStorage.setItem('cs_contact_last', String(Date.now()));
      setContactSubmitted(true);
      setContactData({ name: '', email: '', phone: '', message: '' });
    } catch (err: any) {
      console.error('Kontakt forma slanje e-maila zakazalo:', err);
      setContactSubmitted(true);
      setContactData({ name: '', email: '', phone: '', message: '' });
    } finally {
      setContactSending(false);
    }
  };

  if (page === 'about') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-10">
        <div className="text-center space-y-2">
          <span className="font-['Poppins'] text-xs font-bold uppercase tracking-[0.25em] text-neutral-500">
            NAŠA PRIČA
          </span>
          <h1 className="font-['Poppins'] text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#0A0A0A]">
            O NAMA
          </h1>
        </div>

        <div className="bg-white border-2 border-[#F7E97F] p-8 sm:p-12 shadow-sm space-y-6">
          <blockquote className="font-['Poppins'] text-lg sm:text-xl font-bold text-[#0A0A0A] leading-relaxed border-l-4 border-[#F7E97F] pl-4 italic">
            "Casual Shop BiH je brend za one koji vole udobnu i stilsku odjeću za svaki dan.
            Počeli smo na Instagramu, a sada smo tu i online. Biramo komade koje ćeš voljeti nositi i koji se uklapaju u svaku priliku.
            Hvala što si dio naše priče."
          </blockquote>

          <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-6 font-['Inter'] text-xs">
            <div className="p-4 bg-[#F4F2EC] border border-neutral-300">
              <h4 className="font-['Poppins'] font-bold text-sm uppercase text-black mb-1">Streetwear kroj</h4>
              <p className="text-neutral-600">
                Pažljivo birani boxy krojevi i prirodni pamuk stvoreni za ugodno cjelodnevno nošenje.
              </p>
            </div>
            <div className="p-4 bg-[#F4F2EC] border border-neutral-300">
              <h4 className="font-['Poppins'] font-bold text-sm uppercase text-black mb-1">Dostava širom BiH</h4>
              <p className="text-neutral-600">
                Svaki grad i naselje u BiH, rok 48 do 72 sata uz mogućnost pregleda paketa i plaćanje kuriru.
              </p>
            </div>
            <div className="p-4 bg-[#F4F2EC] border border-neutral-300">
              <h4 className="font-['Poppins'] font-bold text-sm uppercase text-black mb-1">Instagram korijeni</h4>
              <p className="text-neutral-600">
                Pratite naš profil <strong>@casualshop.bih</strong> za najnovije dropove i ponude.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (page === 'shipping') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-10">
        <div className="text-center space-y-2">
          <span className="font-['Poppins'] text-xs font-bold uppercase tracking-[0.25em] text-neutral-500">
            PRAVILA TRGOVINE
          </span>
          <h1 className="font-['Poppins'] text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#0A0A0A]">
            DOSTAVA I POVRAT
          </h1>
        </div>

        {/* MODUL ZA PRAĆENJE NARUDŽBE */}
        <div className="bg-white border-2 border-[#0A0A0A] p-6 shadow-md max-w-lg mx-auto space-y-4">
          <div className="flex items-center gap-2 border-b-2 border-neutral-200 pb-2">
            <PackageCheck className="w-5 h-5 text-[#0A0A0A]" />
            <h2 className="font-['Poppins'] text-sm font-black uppercase tracking-wider text-black">
              Provjera statusa narudžbe
            </h2>
          </div>

          <form onSubmit={handleTrackSubmit} className="space-y-3 font-['Inter']">
            <div>
              <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">Broj narudžbe *</label>
              <input
                type="text"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                placeholder="npr. CS-1012-AB12"
                className="w-full border-2 border-neutral-300 p-2.5 text-xs font-mono font-bold focus:border-black focus:outline-none uppercase bg-[#F4F2EC]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">Broj telefona *</label>
              <input
                type="tel"
                required
                value={trackPhone}
                onChange={(e) => setTrackPhone(e.target.value)}
                placeholder="npr. 061123456"
                className="w-full border-2 border-neutral-300 p-2.5 text-xs focus:border-black focus:outline-none bg-[#F4F2EC]"
              />
            </div>

            <button
              type="submit"
              disabled={trackLoading}
              className="w-full py-3 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border-2 border-[#0A0A0A] cursor-pointer"
            >
              {trackLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>{trackLoading ? 'PRETRAŽIVANJE...' : 'PRONAĐI NARUDŽBU'}</span>
            </button>
          </form>

          {trackError && (
            <div className="p-3 bg-red-50 border border-red-300 text-red-700 text-xs flex items-center gap-2 font-['Inter']">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{trackError}</span>
            </div>
          )}

          {foundOrder && (
            <div className="p-4 bg-[#F4F2EC] border-2 border-[#F7E97F] space-y-3 text-xs animate-fadeIn font-['Inter']">
              <div className="flex justify-between items-center border-b border-neutral-300 pb-2">
                <span className="font-['Poppins'] font-bold text-black">Status narudžbe:</span>
                <span className={`px-2.5 py-1 font-['Poppins'] font-black uppercase text-[10px] tracking-wider ${
                  foundOrder.status === 'Nova' ? 'bg-amber-400 text-black' :
                  foundOrder.status === 'Potvrđena' ? 'bg-blue-600 text-white' :
                  foundOrder.status === 'Poslana' ? 'bg-purple-600 text-white' :
                  foundOrder.status === 'Dostavljena' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                }`}>
                  {foundOrder.status}
                </span>
              </div>

              <div className="space-y-1.5 text-neutral-800">
                <p><strong>Broj narudžbe:</strong> <span className="font-mono">{foundOrder.orderNumber}</span></p>
                <p><strong>Datum kreiranja:</strong> {new Date(foundOrder.createdAt).toLocaleDateString('bs-BA')}</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border-2 border-neutral-200 p-6 sm:p-10 shadow-sm space-y-8 font-['Inter'] text-xs sm:text-sm text-neutral-800 leading-relaxed">
          <section className="space-y-2.5">
            <h2 className="font-['Poppins'] text-base font-black uppercase tracking-wider text-black flex items-center gap-2 border-b pb-2 border-neutral-200">
              <Truck className="w-5 h-5 text-[#0A0A0A]" />
              <span>Dostava</span>
            </h2>
            <ul className="list-disc list-inside space-y-1.5 text-neutral-700 pl-2">
              <li>Dostava se vrši na cijeloj teritoriji Bosne i Hercegovine putem X Express brze pošte.</li>
              <li>Rok isporuke je <strong>48 do 72 sata</strong> od potvrde narudžbe.</li>
              <li>Broj za praćenje pošiljke stiže vam u <strong>Viber / SMS poruci</strong> direktno od X Expressa čim kurir preuzme paket.</li>
              <li>Moguće je <strong>otvaranje i pregled paketa prije preuzimanja</strong> od kurira.</li>
              <li>Cijena standardne dostave iznosi <strong>12 KM</strong>. Za sve narudžbe preko <strong>{settings.freeShippingThreshold || 100} KM</strong>, dostava je <strong>BESPLATNA</strong>. Moguće je i lično preuzimanje u Sarajevu (0 KM).</li>
            </ul>
          </section>

          <section className="space-y-2.5">
            <h2 className="font-['Poppins'] text-base font-black uppercase tracking-wider text-black flex items-center gap-2 border-b pb-2 border-neutral-200">
              <ShieldCheck className="w-5 h-5 text-[#0A0A0A]" />
              <span>Plaćanje</span>
            </h2>
            <p className="text-neutral-700">
              Plaćanje se vrši isključivo <strong>pouzećem, gotovinom prilikom preuzimanja pošiljke</strong> od kurira ili gotovinom pri ličnom preuzimanju u Sarajevu.
            </p>
          </section>

          <section className="space-y-2.5">
            <h2 className="font-['Poppins'] text-base font-black uppercase tracking-wider text-black flex items-center gap-2 border-b pb-2 border-neutral-200">
              <RefreshCw className="w-5 h-5 text-[#0A0A0A]" />
              <span>Povrat robe</span>
            </h2>
            <ul className="list-disc list-inside space-y-1.5 text-neutral-700 pl-2">
              <li>Rok za povrat robe je <strong>7 dana</strong> od dana prijema pošiljke.</li>
              <li>Artikal mora biti u potpunosti nenošen, neopran i u originalnom stanju s neoštećenom etiketom.</li>
              <li>Zahtjev za povrat podnosi se putem e-maila (<strong>{sellerEmailDisplay}</strong>) ili našeg Instagram profila <strong>@casualshop.bih</strong> uz navođenje broja narudžbe.</li>
              <li>Povrat novca ili zamjena vrši se nakon prijema i pregleda vraćene robe.</li>
            </ul>
          </section>

          <section className="space-y-2.5">
            <h2 className="font-['Poppins'] text-base font-black uppercase tracking-wider text-black border-b pb-2 border-neutral-200">
              <span>Zamjena veličine</span>
            </h2>
            <p className="text-neutral-700">
              Ukoliko vam veličina ne odgovara, potrebno je da nam se javite sa brojem narudžbe. Zamjenu vršimo u dogovoru s kupcem u zavisnosti od trenutne dostupnosti zaliha željene veličine.
            </p>
          </section>
        </div>
      </div>
    );
  }

  if (page === 'terms') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-10">
        <div className="text-center space-y-2">
          <span className="font-['Poppins'] text-xs font-bold uppercase tracking-[0.25em] text-neutral-500">
            PRAVNI DOKUMENT
          </span>
          <h1 className="font-['Poppins'] text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#0A0A0A]">
            USLOVI KORIŠTENJA
          </h1>
          <p className="text-xs text-neutral-500">Datum ažuriranja: {new Date().toLocaleDateString('bs-BA')}</p>
        </div>

        <div className="bg-white border-2 border-neutral-200 p-6 sm:p-10 shadow-sm space-y-8 font-['Inter'] text-xs sm:text-sm text-neutral-800 leading-relaxed">
          <section className="space-y-2 bg-[#F4F2EC] p-4 border border-neutral-300">
            <h2 className="font-['Poppins'] text-sm font-bold uppercase text-black">1. Podaci o prodavcu</h2>
            <p><strong>Naziv brenda:</strong> {sellerNameDisplay}</p>
            <p><strong>Lokacija:</strong> {sellerAddressDisplay}</p>
            <p><strong>Kontakt e-mail:</strong> {sellerEmailDisplay}</p>
            <p><strong>Instagram:</strong> @casualshop.bih</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-['Poppins'] text-sm font-bold uppercase text-black">2. Opće odredbe</h2>
            <p>
              Ovi uslovi korištenja propisuju pravila kupovine odjeće i dodataka putem online trgovine Casual Shop BiH. Pristupom i narudžbom sa ove web stranice, kupac potvrđuje da je upoznat sa ovim uslovima i da ih prihvata.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-['Poppins'] text-sm font-bold uppercase text-black">3. Proizvodi i cijene</h2>
            <p>
              Sve cijene na web stranici izražene su u Konvertibilnim markama (KM). Fotografije na stranici vjerodostojno prikazuju boju i detalje ponuđenih artikala.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-['Poppins'] text-sm font-bold uppercase text-black">4. Narudžba i dostava</h2>
            <p>
              Narudžba se obavlja putem checkout forme. Dostava se vrši brzam poštom u roku 48 do 72 sata. Cijena dostave iznosi 12 KM. Kupac ima pravo otvaranja i pregleda paketa prije preuzimanja i plaćanja kuriru. Moguće je i lično preuzimanje u Sarajevu.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-['Poppins'] text-sm font-bold uppercase text-black">5. Plaćanje</h2>
            <p>
              Plaćanje se vrši pouzećem gotovinom kuriru brze pošte pri preuzimanju paketa ili gotovinom pri ličnom preuzimanju u Sarajevu.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-['Poppins'] text-sm font-bold uppercase text-black">6. Povrat i zamjene</h2>
            <p>
              Kupac ima pravo na povrat ili zamjenu robe u roku od 7 dana od dana prijema pošiljke, pod uslovom da artikal nije nošen, opran ili oštećen i posjeduje originalne etikete.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-['Poppins'] text-sm font-bold uppercase text-black">7. Intelektualno vlasništvo</h2>
            <p>
              Svi dizajni, logotip Casual Shop BiH i grafike zaštićeni su autorskim pravima. Zabranjeno je neovlašteno kopiranje bez izričitog odobrenja.
            </p>
          </section>
        </div>
      </div>
    );
  }

  if (page === 'privacy') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-10">
        <div className="text-center space-y-2">
          <span className="font-['Poppins'] text-xs font-bold uppercase tracking-[0.25em] text-neutral-500">
            ZAŠTITA LIČNIH PODATAKA
          </span>
          <h1 className="font-['Poppins'] text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#0A0A0A]">
            POLITIKA PRIVATNOSTI
          </h1>
          <p className="text-xs text-neutral-500">Datum ažuriranja: {new Date().toLocaleDateString('bs-BA')}</p>
        </div>

        <div className="bg-white border-2 border-neutral-200 p-6 sm:p-10 shadow-sm space-y-8 font-['Inter'] text-xs sm:text-sm text-neutral-800 leading-relaxed">
          <section className="space-y-2 bg-[#F4F2EC] p-4 border border-neutral-300">
            <h2 className="font-['Poppins'] text-sm font-bold uppercase text-black">1. Rukovalac podacima</h2>
            <p>Rukovalac ličnim podacima je <strong>{sellerNameDisplay}</strong>, kontakt e-mail: {sellerEmailDisplay}.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-['Poppins'] text-sm font-bold uppercase text-black">2. Koje podatke prikupljamo</h2>
            <ul className="list-disc list-inside space-y-1 text-neutral-700 pl-2">
              <li><strong>Podaci pri narudžbi:</strong> ime, prezime, adresa dostave, grad, poštanski broj, broj telefona i opciono e-mail adresa.</li>
              <li><strong>Newsletter:</strong> e-mail adresa prijavljenog korisnika uz izričitu saglasnost.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-['Poppins'] text-sm font-bold uppercase text-black">3. Dijeljenje podataka</h2>
            <p>
              Podaci o kupcu dijele se isključivo sa ugovorenom kurirskom službom radi fizičke dostave narudžbe. Vaši lični podaci se <strong>nikada ne prodaju</strong> niti ustupaju trećim licima.
            </p>
          </section>
        </div>
      </div>
    );
  }

  if (page === 'contact') {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-12">
        <div className="text-center space-y-2">
          <span className="font-['Poppins'] text-xs font-bold uppercase tracking-[0.25em] text-neutral-500">
            PODRŠKA KUPCIMA
          </span>
          <h1 className="font-['Poppins'] text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#0A0A0A]">
            KONTAKTIRAJTE NAS
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 max-w-lg mx-auto font-['Inter']">
            Imate pitanje o veličinama, statusu pošiljke ili zamjeni? Javite nam se direktno.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div className="bg-white p-6 border-2 border-neutral-300 space-y-4 shadow-sm font-['Inter']">
              <h3 className="font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] text-black">
                Direktni kontakti
              </h3>

              <div className="space-y-3.5 text-xs text-neutral-800">
                <a
                  href={settings.instagramUrl || 'https://www.instagram.com/casualshop.bih'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3.5 bg-[#F4F2EC] border border-neutral-300 hover:border-black transition-colors"
                >
                  <Instagram className="w-5 h-5 text-pink-600 shrink-0" />
                  <div>
                    <span className="font-['Poppins'] font-bold uppercase block text-black">Instagram DM</span>
                    <span className="text-neutral-500">@casualshop.bih (Najbrži odgovor)</span>
                  </div>
                </a>

                <div className="flex items-center gap-3 p-3.5 bg-[#F4F2EC] border border-neutral-300">
                  <Mail className="w-5 h-5 text-neutral-800 shrink-0" />
                  <div>
                    <span className="font-['Poppins'] font-bold uppercase block text-black">E-mail adresa</span>
                    <span className="text-neutral-500">{sellerEmailDisplay}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 bg-[#F4F2EC] border border-neutral-300">
                  <MapPin className="w-5 h-5 text-neutral-800 shrink-0" />
                  <div>
                    <span className="font-['Poppins'] font-bold uppercase block text-black">Isporuka / Preuzimanje</span>
                    <span className="text-neutral-500">Brza pošta u sve gradove BiH ili lično preuzimanje u Sarajevu</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#0A0A0A] text-white text-xs space-y-1 border-2 border-[#F7E97F]">
              <p className="font-['Poppins'] font-bold uppercase tracking-wider text-[#F7E97F]">Radno vrijeme:</p>
              <p className="text-neutral-200">Ponedjeljak - Subota: 09:00 - 20:00h</p>
              <p className="text-neutral-400 text-[11px]">Dostupni smo na Instagram DM i vikendom.</p>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 border-2 border-neutral-300 space-y-4 shadow-sm">
            <h3 className="font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] text-black">
              Pošalji brzi upit
            </h3>

            {contactSubmitted ? (
              <div className="bg-white border-2 border-[#F7E97F] p-6 text-center space-y-2 animate-fadeIn">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-['Poppins'] font-bold text-sm uppercase tracking-wider">Poruka je poslana!</h4>
                <p className="text-xs text-neutral-600 font-['Inter']">
                  Hvala na javljanju. Odgovorit ćemo u najkraćem mogućem roku.
                </p>
                <button
                  type="button"
                  onClick={() => setContactSubmitted(false)}
                  className="px-4 py-2 bg-[#0A0A0A] text-white font-['Poppins'] text-xs uppercase tracking-wider cursor-pointer mt-2"
                >
                  Pošalji novu poruku
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4 text-xs font-['Inter']">
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  className="hidden"
                  aria-hidden="true"
                />

                {contactError && (
                  <p className="text-[11px] text-red-600 font-bold border border-red-300 bg-red-50 p-2.5">
                    {contactError}
                  </p>
                )}

                <div>
                  <label className="block font-['Poppins'] font-bold uppercase text-neutral-700 mb-1">
                    Vaše ime i prezime *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactData.name}
                    onChange={(e) => setContactData({ ...contactData, name: e.target.value })}
                    className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs focus:bg-white focus:border-black focus:outline-none"
                    placeholder="npr. Haris Hodžić"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-['Poppins'] font-bold uppercase text-neutral-700 mb-1">
                      E-mail adresa *
                    </label>
                    <input
                      type="email"
                      required
                      value={contactData.email}
                      onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                      className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs focus:bg-white focus:border-black focus:outline-none"
                      placeholder="npr. haris@gmail.com"
                    />
                  </div>

                  <div>
                    <label className="block font-['Poppins'] font-bold uppercase text-neutral-700 mb-1">
                      Telefon (opciono)
                    </label>
                    <input
                      type="tel"
                      value={contactData.phone}
                      onChange={(e) => setContactData({ ...contactData, phone: e.target.value })}
                      className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs focus:bg-white focus:border-black focus:outline-none"
                      placeholder="npr. 061 234 567"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-['Poppins'] font-bold uppercase text-neutral-700 mb-1">
                    Vaša poruka *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={contactData.message}
                    onChange={(e) => setContactData({ ...contactData, message: e.target.value })}
                    className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs focus:bg-white focus:border-black focus:outline-none"
                    placeholder="Pitanje u vezi artikla, narudžbe ili zamjene veličine..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={contactSending}
                  className="w-full py-3.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] transition-colors flex items-center justify-center gap-2 border-2 border-[#0A0A0A] disabled:opacity-50 cursor-pointer"
                >
                  {contactSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>SLANJE PORUKE...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Pošalji poruku</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
