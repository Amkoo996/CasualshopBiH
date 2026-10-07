# Casual Shop BiH – Plan izmjena prije lansiranja
**Pripremljeno:** 7. oktobar 2026.  
**Repozitorij:** [Amkoo996/CasualshopBiH](https://github.com/Amkoo996/CasualshopBiH.git)

---

## 📌 Kako koristiti ovaj dokument
Idite redom po prioritetima: **P0 ➔ P1 ➔ P2 ➔ P3 ➔ P4**.  
* Putanje fajlova su relativne u odnosu na korijen repozitorija.
* Brojevi linija u kodu su okvirni, pa pretražujte fajlove po nazivu funkcija.
* Nakon svake završene grupe izmjena obavezno pokrenite `npm run build` kako biste odmah uočili eventualne greške.

> **Ispravka ranijeg pregleda:** Meta Pixel u kodu postoji (`src/lib/analytics.ts`), ali se ne pokreće jer se `initAnalytics` nigdje ne poziva[cite: 1]. Isto važi i za Google Analytics[cite: 1]. Ovo je detaljno obrađeno u sekciji **P2**[cite: 1].

---

## 📊 Pregled prioriteta

| Prioritet | Šta treba uraditi | Zašto | Procijenjeno vrijeme |
| :--- | :--- | :--- | :--- |
| **P0** | Popraviti pokvaren build (`tracking.ts`) | Zadnji commit se ne može izgraditi[cite: 1] | 10 min |
| **P1** | Zamijeniti `firestore.rules` | Trenutno svako može čitati i pisati po bazi[cite: 1] | 20 min |
| **P1** | Admin prijava preko UID-a, ukloniti demo admina | Pogrešan e-mail, demo pristup, opasna dugmad[cite: 1] | 30 min |
| **P1** | Narudžba u jednoj transakciji | Kupac vidi potvrdu iako narudžba nije spremljena u bazu[cite: 1] | 20 min |
| **P1** | Obrisati lažnu statistiku | Dashboard prikazuje izmišljene brojke[cite: 1] | 15 min |
| **P2** | Upload slika sa uređaja (Cloudinary) | Vlasnik ne može postaviti sliku sa telefona[cite: 1] | 40 min |
| **P2** | Cookie baner i pokretanje GA4/Meta Pixela | Skripte se nikada ne učitavaju[cite: 1] | 30 min |
| **P2** | Ukloniti Listu želja (Wishlist) | Prijava kupaca ne radi[cite: 1] | 15 min |
| **P3** | Sitemap, OG slika, rute, domena, `.gitignore` | SEO, pravilno dijeljenje na mrežama i higijena[cite: 2] | 1 - 2 h |
| **P4** | Testiranje prije objave | Detaljna provjera cijelog toka kupovine[cite: 2] | 1 h |

---

## 🛠️ Detaljne instrukcije po prioritetima

### P0: Popraviti pokvaren build
* **Problem:** Fajl `src/lib/tracking.ts` je odsječen na kraju (funkcija `getAnalyticsStats` završava usred riječi `return { uniqueVisitorsCount: total`). Zbog ovoga `npm run build` pada sa greškom `}' expected`[cite: 2].
* **Rješenje:**
  1. Vratite fajl iz prethodnog commita:
     ```bash
     git log --oneline src/lib/tracking.ts
     git checkout <ID_PRETHODNOG_COMMITA> src/lib/tracking.ts
     npm run build
     ```
  2. Provjerite da li funkcija `saveCartSession` i dalje postoji u `tracking.ts` jer je uvoze `src/pages/CheckoutPage.tsx` i `src/context/CartContext.tsx`[cite: 2].
  3. Pokrenite `npx tsc --noEmit` i ispravite sve prijavljene greške[cite: 2].

---

### P1: Sigurnost, Baza i Admin

#### P1.1: Zamijeniti pravila baze (`firestore.rules`)
Ažurirajte fajl `firestore.rules` u repozitoriju, a zatim isti sadržaj kopirajte u **Firebase Console > Firestore Database > Rules > Publish**[cite: 2]:

* **Ključne promjene:**
  * `store_metrics` i `analytics_events` su osigurani samo za admine[cite: 2, 4, 5].
  * U `products` je dozvoljeno samo smanjenje zalihe od strane kupaca, i to ne ispod 0[cite: 2, 3].
  * Admin se prepoznaje preko UID-a iz kolekcije `admins`, a ne preko e-mail adrese[cite: 3].

* **Nakon objave pravila u Firebase konzoli:**
  1. U **Authentication > Users** kreirajte račune za admine i kopirajte njihov UID[cite: 6].
  2. U **Firestore Database** napravite kolekciju `admins` i kreirajte dokument sa ID-jem jednakim tom UID-u (npr. sa poljem `role: "owner"`)[cite: 6].
  3. U **Authentication > Settings > Authorized domains** dodajte vašu Cloudflare Pages domenu i buduću zvaničnu domenu[cite: 6].
  4. U **Google Cloud Console > Credentials** ograničite Browser API ključ na vaše HTTP referrere[cite: 6].

#### P1.2: Admin prijava preko UID-a (bez demo pristupa)
* **Fajl:** `src/context/AuthContext.tsx` – zamijenite provjeru tako da učitava dokument `/admins/{uid}` iz Firestore-a umjesto provere e-maila[cite: 6, 7].
* **Fajl:** `src/pages/AdminDashboard.tsx` – uklonite sledeće:
  1. `loginAsDemoAdmin` i `isDemoAdmin` iz `useAuth()`[cite: 9].
  2. Sekciju i dugme za "Brzi Demo Admin Pristup"[cite: 9].
  3. Paragraf koji javno prikazuje admin e-mail adresu (`redemption19@gmail.com`)[cite: 9].
  4. Značku "DEMO NAČIN RADA"[cite: 9].
  5. Dugme koje poziva `resetDemoProducts()`[cite: 9].

#### P1.3: Narudžba u jednoj transakciji
* **Fajl:** `src/lib/db.ts`
  * Zamijenite funkciju `createOrder` da koristi `runTransaction`.
  * Transaction prvo mora pročitati sve stavke, provjeriti ima li dovoljno zaliha na stanju, te istovremeno upisati novu narudžbu i umanjiti zalihu[cite: 9, 10].
* **Fajl:** `src/pages/CheckoutPage.tsx`
  * U `catch` bloku prikazati poruku o grešci kupcu (npr. ako nema dovoljno zaliha) i osigurati da se korpa ne prazni u slučaju greške[cite: 10].

#### P1.4: Obrisati lažnu statistiku
* **Fajl:** `src/lib/tracking.ts`
  * Postavite `DEFAULT_METRICS` na nule (`totalVisits: 0`, itd.)[cite: 10, 11].
  * Uklonite "Baseline organic numbers" i generisanje lažnih trendova (`wave`) u `getAnalyticsStats`[cite: 11].
* **Firebase Console:** Izbrišite lažne/demo podatke u kolekcijama `store_metrics`, `analytics_events`, `orders` i `abandoned_carts`[cite: 11].

---

### P2: Upload slika, Analitika i Čišćenje

#### P2.1: Upload slika sa uređaja (Cloudinary)
1. Otvorite besplatan nalog na **Cloudinary.com** i kreirajte *Unsigned* Upload Preset[cite: 11, 12].
2. U Cloudflare Pages varijable dodajte `VITE_CLOUDINARY_CLOUD` i `VITE_CLOUDINARY_PRESET`[cite: 12].
3. Kreirajte pomoćni fajl `src/lib/upload.ts` sa funkcijom za slanje slika na Cloudinary API[cite: 12].
4. U `src/pages/AdminDashboard.tsx` dodajte `<input type="file" accept="image/*" multiple />` dugme koje poziva upload funkciju i dodaje dobijene URL-ove u proizvod[cite: 12, 13].

#### P2.2: Cookie baner, Google Analytics i Meta Pixel
1. **Fajl:** `src/components/common/CookieConsent.tsx` – Omogućite korisniku izbor između "Samo neophodni" i "Prihvati sve"[cite: 14, 15].
2. **Fajl:** `src/lib/tracking.ts` – Dodajte provjeru saglasnosti:
   ```typescript
   if (localStorage.getItem('casualshop_cookie_consent') !== 'accepted') return;
