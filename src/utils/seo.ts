import { Product } from '../types';

export const updateMetaTags = (product?: Product | null, pageTitle?: string) => {
  const siteName = 'Casual Shop BiH';
  const defaultImage = 'https://res.cloudinary.com/rvlsak2u/image/upload/f_auto,q_auto,w_600/v1791551969/xpzi3atps6zrnkflak3c.jpg';

  let title = pageTitle || 'Casual Shop BiH | Streetwear Odjeća Online';
  let description = 'Urbani krojevi, kvalitetan češljani pamuk i autentični dizajn inspirisan ulicom. Plaćanje pouzećem širom BiH.';
  let image = defaultImage;

  if (product) {
    title = `${product.name} (${product.price.toFixed(2)} KM) | ${siteName}`;
    description = product.description || `Kupite ${product.name} po cijeni od ${product.price.toFixed(2)} KM. Plaćanje pouzećem ili lično preuzimanje u Sarajevu.`;
    image = product.images?.[0] || defaultImage;
  }

  // Ažuriranje standardnog naslova
  document.title = title;

  // Pomoćna funkcija za postavljanje meta taga
  const setMetaTag = (property: string, content: string, isName = false) => {
    const attr = isName ? 'name' : 'property';
    let element = document.querySelector(`meta[${attr}="${property}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attr, property);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  };

  // OpenGraph Tagovi (Viber, WhatsApp, Facebook, Instagram)
  setMetaTag('og:title', title);
  setMetaTag('og:description', description);
  setMetaTag('og:image', image);
  setMetaTag('og:type', product ? 'product' : 'website');
  setMetaTag('og:site_name', siteName);

  // Twitter Card Tagovi
  setMetaTag('twitter:card', 'summary_large_image', true);
  setMetaTag('twitter:title', title, true);
  setMetaTag('twitter:description', description, true);
  setMetaTag('twitter:image', image, true);
};
