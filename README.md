Evo potpuno ažuriranog, profesionalnog i sređenog **`README.md`** fajla za repozitorij.

Uklonjeni su svi naznake ranijih neispravnosti i zastarjelih faza, usklađeni su nazivi (Next.js arhitektura umjesto Vite-a), ubačeno je uputstvo za pokretanje i izgradnju projekta, te su jasno definisana pravila za deployment na Cloudflare Pages.

```markdown
# 🛍️ Casual Shop BiH – E-Commerce Platforma

Moderni, visokooptimizirani e-commerce web shop namijenjen za prodaju streetwear odjeće u Bosni i Hercegovini. Projekat je izgrađen na **Next.js (App Router)** tehnologiji, sa **Firebase (Firestore, Auth)** bazom podataka u realnom vremenu i **Cloudflare Pages / Functions** serverless pozadinom za obradu notifikacija i sigurnost.

---

## 🛠️ Tehnološki Stog (Tech Stack)

* **Okvir (Framework):** [Next.js 16](https://nextjs.org/) (React 19, TypeScript, Turbopack)
* **Stilizovanje:** [Tailwind CSS v4](https://tailwindcss.com/) & Lucide React Ikone
* **Baza podataka i Auth:** [Firebase Firestore](https://firebase.google.com/docs/firestore) & Firebase Authentication
* **Serverless Backend:** [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/platform/functions/)
* **Notifikacije & Slanje e-maila:** EmailJS API & Telegram Bot API
* **Mediji & Slike:** Cloudinary CDN Image Optimization

---

## 🚀 Brzi Početak (Lokalni Razvoj)

Za lokalno pokretanje i testiranje projekta na vašoj mašini, pratite sljedeće korake:

### 1. Kloniranje repozitorija
```bash
git clone [https://github.com/Amkoo996/CasualshopBiH.git](https://github.com/Amkoo996/CasualshopBiH.git)
cd CasualshopBiH

```

### 2. Instalacija zavisnosti (Dependencies)

```bash
npm install

```

### 3. Podešavanje varijabli okruženja (`.env.local`)

Kreirajte `.env.local` fajl u korijenu projekta i popunite potrebne Firebase i analitičke ključeve:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=vaš_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=casualshop-bih.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=casualshop-bih
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=casualshop-bih.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=vaš_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=vaš_app_id

# Analitika (Opciono)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_META_PIXEL_ID=XXXXXXXXXXXXXX

```

### 4. Pokretanje razvojnog servera

```bash
npm run dev

```

Otvorite [http://localhost:3000](http://localhost:3000) u vašem pregledniku.

---

## 📦 Izgradnja i Produkcija (Build & Deploy)

Projekat koristi statički export prilagođen za Cloudflare Pages i Next.js routere.

### Lokalna provjera build-a i tipova:

```bash
# 1. Provjera TypeScript tipova bez generisanja koda
npx tsc --noEmit

# 2. Kompajliranje i priprema produkcijskog paketa
npm run build

```

---

## ⚙️ Cloudflare Pages & Serverless Postavke

Prilikom podešavanja projekta na **Cloudflare Pages** konzoli, unesite sljedeće konfiguracije:

* **Build command:** `npm run build`
* **Build output directory:** `dist`
* **Node.js Version:** `20.x` ili novija

### Varijable Okruženja u Cloudflare Konzoli (Environment Variables):

Dodajte sljedeće varijable pod **Settings > Environment variables** (za Cloudflare Functions):

| Varijabla | Opis |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | Token vašeg Telegram bota za obavijesti o novim narudžbama |
| `TELEGRAM_CHAT_IDS` | ID-ovi Telegram chatova odvojeni zarezom |
| `EMAILJS_SERVICE_ID` | Service ID sa vašeg EmailJS računa |
| `EMAILJS_TEMPLATE_ID` | Template ID za potvrdu narudžbe kupcu |
| `EMAILJS_AB_TEMPLATE_ID` | Template ID za podsjetnik napuštene korpe |
| `EMAILJS_PUBLIC_KEY` | EmailJS Public Key |
| `EMAILJS_PRIVATE_KEY` | EmailJS Private Key (za verifikaciju poziva sa servera) |
| `FIREBASE_API_KEY` | Firebase API key za autentifikaciju admina |
| `ADMIN_UIDS` | Firebase Admin UID-ovi odvojeni zarezom |

---

## 🔒 Sigurnost i Firestore Pravila

Sigurnosna pravila baze nalaze se u datoteci `firestore.rules`.
Prilikom izmjena pravila, obavezno ažurirajte datoteku u repozitoriju i objavite izmjene u **Firebase Console > Firestore Database > Rules > Publish**.

* **Narudžbe (`orders`):** Kupac može isključivo kreirati novu narudžbu uz provjeru stavki, dok čitanje, izmjenu i brisanje narudžbi može vršiti samo prijavljeni **Admin**.
* **Praćenje narudžbe (`order_tracking`):** Kupac ima pravo isključivo na `get` zahtjev po tačnom broju narudžbe (bez opcije listanja baze) i vidi samo status pošiljke.
* **Proizvodi (`products`):** Kupci mogu smanjivati zalihe u transakciji do minimalno 0, dok sve ostale izmjene vrši Admin.

---

## 📂 Struktura Projekta

```text
CasualshopBiH/
├── app/                      # Next.js App Router (Rute: /shop, /proizvod, /kontakt, /admin...)
├── functions/                # Cloudflare Pages Functions (API rute: /api/notify)
├── public/                   # Statički resursi (Slike, ikone, logo.png, manifest.json, robots.txt)
├── src/
│   ├── components/           # Reusable UI komponente (Navbar, Cart, ProductCard, Admin...)
│   ├── context/              # React Context (CartContext, WishlistContext, AuthContext)
│   ├── lib/                  # Logika za bazu (db.ts), Firebase config, validaciju i analitiku
│   ├── types/                # TypeScript interfejsi i tipovi podataka
│   └── views/                # Prikazi stranica (HomePage, ShopPage, CheckoutPage, AdminDashboard)
├── firestore.rules           # Sigurnosna pravila za Firebase Firestore
└── next.config.mjs           # Next.js konfiguracija

```

---

## 📄 Licenca i Vlasništvo

Sva prava zadržana © **Casual Shop BiH**. Može se koristiti i modificirati isključivo za potrebe zvanične Casual Shop BiH e-commerce platforme.

```

Možeš slobodno zamijeniti sadržaj svog `README.md` fajla ovim kodom! Vaš web shop je sada 100% spreman i pokriven po svim tehničkim i estetskim standardima.

```