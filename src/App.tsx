import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { WishlistPage } from './pages/WishlistPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderSuccessPage } from './pages/OrderSuccessPage';
import { StaticPages } from './pages/StaticPages';
@@ -34,18 +35,16 @@ export function AppContent() {

const init = async () => {
try {
        // Preuzimanje i primjena postavki trgovine i teme iz Firebase-a
const settings = await getStoreSettings();
if (settings) {
applyTheme(settings);
}
} catch (e) {
console.error('Greška pri učitavanju postavki teme:', e);
        applyTheme(); // Vraća na default u slučaju greške
        applyTheme();
}

try {
        // Dohvatanje kataloga proizvoda
const data = await getProducts(false);
setProducts(data);
} catch (e) {
@@ -61,6 +60,7 @@ export function AppContent() {
const titles: Record<string, string> = {
home: 'Casual Shop BiH | Casual odjeća online',
shop: 'Kolekcija | Casual Shop BiH',
      wishlist: 'Moja lista želja | Casual Shop BiH',
about: 'O nama | Casual Shop BiH',
shipping: 'Dostava i povrat | Casual Shop BiH',
terms: 'Uslovi korištenja | Casual Shop BiH',
@@ -81,7 +81,7 @@ export function AppContent() {
useEffect(() => {
const handleHash = () => {
const hash = window.location.hash.replace('#/', '').replace('#', '');
      if (['admin', 'shop', 'about', 'contact', 'shipping', 'terms', 'privacy'].includes(hash)) {
      if (['admin', 'shop', 'wishlist', 'about', 'contact', 'shipping', 'terms', 'privacy'].includes(hash)) {
setCurrentTab(hash);
}
};
@@ -155,6 +155,14 @@ export function AppContent() {
/>
)}

        {currentTab === 'wishlist' && (
          <WishlistPage
            products={products}
            onSelectProduct={handleSelectProduct}
            onExploreProducts={() => handleNavigateToShop('Sve')}
          />
        )}

{currentTab === 'checkout' && (
<CheckoutPage
onBack={() => setCurrentTab('shop')}
@@ -192,7 +200,7 @@ export function AppContent() {
{/* Cart Slide-Over Drawer */}
<CartDrawer onCheckout={() => setCurrentTab('checkout')} />

      {/* Floating Instagram & WhatsApp Action */}
      {/* Floating Action */}
<FloatingActions />

{/* Cookie Consent Banner */}
