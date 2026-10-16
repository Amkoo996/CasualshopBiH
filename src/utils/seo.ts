import { Product } from '../types';

// Pomoćna funkcija za generisanje direktnog URL-a proizvoda za dijeljenje (Viber, WhatsApp, Social)
export const getProductShareUrl = (productId: string): string => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://casualshop.ba';
  return `${origin}/#product-detail?id=${productId}`;
};

export const updateMetaTags = (product?: Product | null, pageTitle?: string) => {
  const siteName = 'Casual Shop BiH';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://casualshop.ba';
  
  // Ovdje postavljamo putanju do nove SEO slike (iz public/images/ foldera)
  const defaultImage = `${currentOrigin}/images/seo-cover.webp`;

  let title = pageTitle || 'Casual Shop BiH | Streetwear Odjeća Online';
  let description = 'Urbani krojevi, kvalitetan češljani pamuk i autentični dizajn inspirisan ulicom. Plaćanje pouzećem širom BiH.';
  let image = defaultImage;
  let canonicalUrl = typeof window !== 'undefined' ? window.location.href : currentOrigin;

  if (product) {
    title = `${product.name} (${product.price.toFixed(2)} KM) | ${siteName}`;
    description = product.description || `Kupite ${product.name} po cijeni od ${product.price.toFixed(2)} KM. Plaćanje pouzećem ili lično preuzimanje u Sarajevu.`;
    image = product.images?.[0] || defaultImage;
    canonicalUrl = getProductShareUrl(product.id);
  }

  // Ažuriranje standardnog naslova browsera
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

  // Pomoćna funkcija za canonical link
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
