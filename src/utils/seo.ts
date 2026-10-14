import { Product } from '../types';

// Pomocna funkcija za generisanje direktnog URL-a proizvoda za dijeljenje (Viber, WhatsApp, Social)
export const getProductShareUrl = (productId: string): string => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://casualshop.ba';
  return `${origin}/#product-detail?id=${productId}`;
};

export const updateMetaTags = (product?: Product | null, pageTitle?: string) => {
  const siteName = 'Casual Shop BiH';
  const defaultImage = 'https://res.cloudinary.com/rvlsak2u/image/upload/f_auto,q_auto,w_600/v1791551969/xpzi3atps6zrnkflak3c.jpg';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://casualshop.ba';

  let title = pageTitle || 'Casual Shop BiH | Streetwear Odjeca Online';
  let description = 'Urbani krojevi, kvalitetan ceSljani pamuk i autenticni dizajn inspirisan ulicom. Placanje pouzecem Sirom BiH.';
  let image = defaultImage;
  let canonicalUrl = typeof window !== 'undefined' ? window.location.href : currentOrigin;

  if (product) {
    title = `${product.name} (${product.price.toFixed(2)} KM) | ${siteName}`;
    description = product.description || `Kupite ${product.name} po cijeni od ${product.price.toFixed(2)} KM. Placanje pouzecem ili licno preuzimanje u Sarajevu.`;
    image = product.images?.[0] || defaultImage;
    canonicalUrl = getProductShareUrl(product.id);
  }

  // Azuriranje standardnog naslova browsera
  document.title = title;

  // Pomocna funkcija za postavljanje meta taga
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

  // Pomocna funkcija za canonical link
  const setCanonicalLink = (url: string) => {
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  };

  // OpenGraph Tagovi (Viber, WhatsApp, Facebook, Instagram)
  setMetaTag('og:title', title);
  setMetaTag('og:description', description);
  setMetaTag('og:image', image);
  setMetaTag('og:url', canonicalUrl);
  setMetaTag('og:type', product ? 'product' : 'website');
  setMetaTag('og:site_name', siteName);

  // Twitter Card Tagovi
  setMetaTag('twitter:card', 'summary_large_image', true);
  setMetaTag('twitter:title', title, true);
  setMetaTag('twitter:description', description, true);
  setMetaTag('twitter:image', image, true);

  // Canonical URL
  setCanonicalLink(canonicalUrl);
};
