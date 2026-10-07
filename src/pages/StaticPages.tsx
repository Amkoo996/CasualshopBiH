import React, { useState } from 'react';
import { Mail, Phone, MapPin, Instagram, ShieldCheck, Truck, RefreshCw, Send, CheckCircle2 } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface StaticPageProps {
  page: 'about' | 'contact' | 'terms' | 'shipping' | 'privacy';
}

export const StaticPages: React.FC<StaticPageProps> = ({ page }) => {
  const { settings } = useCart();
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactData, setContactData] = useState({ name: '', email: '', phone: '', message: '' });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitted(true);
    setTimeout(() => {
      setContactData({ name: '', email: '', phone: '', message: '' });
    }, 1000);
  };

  const sellerNameDisplay = settings.sellerName?.trim() || '[uneseno u adminu]';
  const sellerAddressDisplay = settings.sellerAddress?.trim() || '[uneseno u adminu]';
  const sellerIdDisplay = settings.sellerIdNumber?.trim() || '[uneseno u adminu]';
  const sellerEmailDisplay = settings.email?.trim() || '[uneseno u adminu]';
  const sellerPhoneDisplay = settings.phone?.trim() || '[uneseno u adminu]';

  // 1. O NAMA
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
                Svaki grad i naselje u BiH, rok 2–5 radnih dana uz plaćanje kuriru pri preuzimanju.
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

  // 2. DOSTAVA I POVRAT
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

        <div className="bg-white border-2 border-neutral-200 p-6 sm:p-10 shadow-sm space-y-8 font-['Inter'] text-xs sm:text-sm text-neutral-800 leading-relaxed">
          {/* Dostava */}
          <section className="space-y-2.5">
            <h2 className="font-['Poppins'] text-base font-black uppercase tracking-wider text-black flex items-center gap-2 border-b pb-2 border-neutral-200">
              <Truck className="w-5 h-5 text-[#0A0A0A]" />
              <span>Dostava</span>
            </h2>
            <ul className="list-disc list-inside space-y-1.5 text-neutral-700 pl-2">
              <li>Dostava se vrši na cijeloj teritoriji Bosne i Hercegovine putem ugovorene kurirske službe brze pošte.</li>
              <li>Rok isporuke je <strong>2–5 radnih dana</strong> od telefonske potvrde narudžbe.</li>
              <li>Kurir će kontaktirati kupca telefonom prije same isporuke paketa.</li>
              <li>Kupac je dužan pregledati paket pri preuzimanju, a eventualna fizička oštećenja odmah prijaviti kuriru.</li>
              <li>Cijena standardne dostave iznosi <strong>{settings.shippingFee} KM</strong>. Za sve narudžbe preko <strong>{settings.freeShippingThreshold} KM</strong>, dostava je <strong>BESPLATNA</strong>.</li>
            </ul>
          </section>

          {/* Plaćanje */}
          <section className="space-y-2.5">
            <h2 className="font-['Poppins'] text-base font-black uppercase tracking-wider text-black flex items-center gap-2 border-b pb-2 border-neutral-200">
              <ShieldCheck className="w-5 h-5 text-[#0A0A0A]" />
              <span>Plaćanje</span>
            </h2>
            <p className="text-neutral-700">
              Plaćanje se vrši isključivo <strong>pouzećem, gotovinom prilikom preuzimanja pošiljke</strong> od kurira. Kartično plaćanje je uskoro u ponudi.
            </p>
          </section>

          {/* Povrat robe */}
          <section className="space-y-2.5">
            <h2 className="font-['Poppins'] text-base font-black uppercase tracking-wider text-black flex items-center gap-2 border-b pb-2 border-neutral-200">
              <RefreshCw className="w-5 h-5 text-[#0A0A0A]" />
              <span>Povrat robe</span>
            </h2>
            <ul className="list-disc list-inside space-y-1.5 text-neutral-700 pl-2">
              <li>Rok za povrat robe je <strong>14 dana</strong> od dana prijema pošiljke.</li>
              <li>Artikal mora biti u potpunosti nenošen, neopran i u originalnom stanju s neoštećenom etiketom.</li>
              <li>Zahtjev za povrat podnosi se putem e-maila (<strong>{settings.email}</strong>), telefona (<strong>{settings.phone}</strong>) ili našeg Instagram profila <strong>@casualshop.bih</strong> uz navođenje broja narudžbe.</li>
              <li>Povrat novca se vrši u roku od <strong>14 dana</strong> od prijema i pregleda vraćene robe.</li>
            </ul>
          </section>

          {/* Zamjena veličine */}
          <section className="space-y-2.5">
            <h2 className="font-['Poppins'] text-base font-black uppercase tracking-wider text-black border-b pb-2 border-neutral-200">
              <span>Zamjena veličine</span>
            </h2>
            <p className="text-neutral-700">
              Ukoliko vam veličina ne odgovara, potrebno je da nam se javite sa brojem narudžbe. Zamjenu vršimo u dogovoru s kupcem u zavisnosti od trenutne dostupnosti zaliha željene veličine.
            </p>
          </section>

          {/* Reklamacije */}
          <section className="space-y-2.5">
            <h2 className="font-['Poppins'] text-base font-black uppercase tracking-wider text-black border-b pb-2 border-neutral-200">
              <span>Reklamacije</span>
            </h2>
            <p className="text-neutral-700">
              U slučaju fabričke greške ili oštećenja, kupac ima pravo podnijeti reklamaciju u roku od <strong>8 dana</strong> od prijema pošiljke uz priložene fotografije artikla i opis oštećenja.
            </p>
          </section>
        </div>
      </div>
    );
  }

  // 3. USLOVI KORIŠTENJA
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
          {/* Podaci o prodavcu */}
          <section className="space-y-2 bg-[#F4F2EC] p-4 border border-neutral-300">
            <h2 className="font-['Poppins'] text-sm font-bold uppercase text-black">1. Podaci o prodavcu</h2>
            <p><strong>Naziv:</strong> {sellerNameDisplay}</p>
            <p><strong>Sjedište i adresa:</strong> {sellerAddressDisplay}</p>
            <p><strong>ID / JIB broj:</strong> {sellerIdDisplay}</p>
            <p><strong>Kontakt e-mail:</strong> {sellerEmailDisplay}</p>
            <p><strong>Kontakt telefon:</strong> {sellerPhoneDisplay}</p>
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
              Sve cijene na web stranici izražene su u Konvertibilnim markama (KM) sa uračunatim porezima. Fotografije na stranici su informativnog karaktera, ali vjerodostojno prikazuju boju i detalje ponuđenih artikala.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-['Poppins'] text-sm font-bold uppercase text-black">4. Narudžba</h2>
            <p>
              Narudžba se obavlja bez potrebe za registracijom korisničkog računa. Nakon slanja narudžbenice putem checkout forme, narudžba se smatra formalno zaprimljenom. Naš tim će kontaktirati kupca telefonom radi potvrde narudžbe. Narudžba postaje obavezujuća tek nakon uspješne potvrde. U slučaju da naručeni artikal ili veličina u međuvremenu nisu dostupni, kupac će biti obaviješten u najkraćem roku.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-['Poppins'] text-sm font-bold uppercase text-black">5. Plaćanje</h2>
            <p>
              Plaćanje se vrši pouzećem gotovinom kuriru brze pošte pri preuzimanju paketa. Kartično plaćanje uskoro u ponudi.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-['Poppins'] text-sm font-bold uppercase text-black">6. Dostava</h2>
            <p>
              Isporuka se vrši kurirskom službom na području Bosne i Hercegovine u roku 2–5 radnih dana od potvrde.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-['Poppins'] text-sm font-bold uppercase text-black">7. Povrat i reklamacije</h2>
            <p>
              Kupac ima pravo na odustanak od ugovora i povrat robe u roku od 14 dana od dana prijema, pod uslovom da artikal nije nošen, opran ili oštećen i posjeduje originalne etikete. Reklamacije na vidljiva oštećenja prijavljuju se u roku od 8 dana od prijema.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-['Poppins'] text-sm font-bold uppercase text-black">8. Intelektualno vlasništvo</h2>
            <p>
              Svi dizajni, logotip Casual Shop BiH, autorski tekstovi i grafike zaštićeni su autorskim pravima. Zabranjeno je neovlašteno kopiranje i reprodukcija materijala bez izričitog odobrenja.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-['Poppins'] text-sm font-bold uppercase text-black">9. Ograničenje odgovornosti</h2>
            <p>
              Prodavac ne snosi odgovornost za kašnjenja u isporuci uzrokovana višom silom ili propustima kurirske službe, ali se obavezuje učiniti sve da kupac dobije paket u najkraćem roku.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-['Poppins'] text-sm font-bold uppercase text-black">10. Mjerodavno pravo</h2>
            <p>
              Na ove Uslove primjenjuju se važeći zakoni i propisi Bosne i Hercegovine. Eventualni sporovi rješavat će se mirnim putem, a u suprotnom pred nadležnim sudom u BiH.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-['Poppins'] text-sm font-bold uppercase text-black">11. Izmjene uslova i datum ažuriranja</h2>
            <p>
              Zadržavamo pravo ažuriranja i izmjene ovih uslova. Sve promjene stupaju na snagu objavom na sajtu. Posljednje ažuriranje: {new Date().toLocaleDateString('bs-BA')}.
            </p>
          </section>
        </div>
      </div>
    );
  }

  // 4. POLITIKA PRIVATNOSTI
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
            <p>Rukovalac ličnim podacima je <strong>{sellerNameDisplay}</strong>, sa sjedištem na adresi {sellerAddressDisplay}, kontakt e-mail: {sellerEmailDisplay}.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-['Poppins'] text-sm font-bold uppercase text-black">2. Koje podatke prikupljamo</h2>
            <ul className="list-disc list-inside space-y-1 text-neutral-700 pl-2">
              <li><strong>Podaci pri narudžbi:</strong> ime, prezime, adresa dostave, grad, poštanski broj, broj telefona i opciono e-mail adresa.</li>
              <li><strong>Newsletter:</strong> e-mail adresa prijavljenog korisnika uz izričitu saglasnost.</li>
              <li><strong>Automatski podaci:</strong> kolačići za rad korpe, sesije i analitiku (uz saglasnost).</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-['Poppins'] text-sm font-bold uppercase text-black">3. Svrha obrade</h2>
            <p>
              Prikupljeni podaci koriste se isključivo za: obradu i slanje narudžbi, kontakt kurirske službe sa kupcem radi isporuke paketa, rješavanje reklamacija i slanje newsletter obavijesti onima koji su se prijavili.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-['Poppins'] text-sm font-bold uppercase text-black">4. Dijeljenje podataka</h2>
            <p>
              Podaci o kupcu dijele se isključivo sa ugovorenom kurirskom službom radi fizičke dostave narudžbe. Vaši lični podaci se <strong>nikada ne prodaju</strong> niti ustupaju trećim licima u marketinške svrhe.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-['Poppins'] text-sm font-bold uppercase text-black">5. Rok čuvanja podataka</h2>
            <p>
              Podaci o narudžbi čuvaju se onoliko koliko je zakonski potrebno radi računovodstvenih evidencija i garantnih rokova. Podaci za newsletter čuvaju se do opoziva saglasnosti.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-['Poppins'] text-sm font-bold uppercase text-black">6. Prava korisnika</h2>
            <p>
              Korisnik ima pravo u svakom trenutku zatražiti uvid u svoje podatke, ispravku, brisanje ili povlačenje saglasnosti za primanje newslettera slanjem zahtjeva na <strong>{sellerEmailDisplay}</strong>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-['Poppins'] text-sm font-bold uppercase text-black">7. Kolačići (Cookies)</h2>
            <p>
              Stranica koristi neophodne kolačiće za funkcionisanje korpe i narudžbe. Analitički kolačići (Google Analytics 4) i marketinški pikseli (Meta Pixel) aktiviraju se isključivo nakon što korisnik na cookie banneru klikne "Prihvati sve".
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-['Poppins'] text-sm font-bold uppercase text-black">8. Datum ažuriranja</h2>
            <p>Ova politika privatnosti posljednji put je ažurirana: {new Date().toLocaleDateString('bs-BA')}.</p>
          </section>
        </div>
      </div>
    );
  }

  // 5. KONTAKT
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
                  className="flex items-center gap-3 p-3 bg-[#F4F2EC] border border-neutral-300 hover:border-black transition-colors"
                >
                  <Instagram className="w-5 h-5 text-pink-600" />
                  <div>
                    <span className="font-['Poppins'] font-bold uppercase block text-black">Instagram DM</span>
                    <span className="text-neutral-500">@casualshop.bih (Najbrži odgovor)</span>
                  </div>
                </a>

                <a
                  href={`https://wa.me/${(settings.whatsappNumber || '38761000000').replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-[#F4F2EC] border border-neutral-300 hover:border-black transition-colors"
                >
                  <Phone className="w-5 h-5 text-emerald-600" />
                  <div>
                    <span className="font-['Poppins'] font-bold uppercase block text-black">WhatsApp / Telefon</span>
                    <span className="text-neutral-500">{settings.whatsappNumber || '+387 61 000 000'}</span>
                  </div>
                </a>

                <div className="flex items-center gap-3 p-3 bg-[#F4F2EC] border border-neutral-300">
                  <Mail className="w-5 h-5 text-neutral-800" />
                  <div>
                    <span className="font-['Poppins'] font-bold uppercase block text-black">E-mail adresa</span>
                    <span className="text-neutral-500">{settings.email || 'info@casualshop.ba'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-[#F4F2EC] border border-neutral-300">
                  <MapPin className="w-5 h-5 text-neutral-800" />
                  <div>
                    <span className="font-['Poppins'] font-bold uppercase block text-black">Isporuka</span>
                    <span className="text-neutral-500">Pokrivamo sve gradove u Bosni i Hercegovini</span>
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

          {/* Forma za kontakt */}
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
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4 text-xs font-['Inter']">
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
                      E-mail *
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
                      Telefon
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
                  className="w-full py-3.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-[0.2em] transition-colors flex items-center justify-center gap-2 border-2 border-[#0A0A0A]"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Pošalji poruku</span>
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
