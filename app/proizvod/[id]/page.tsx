import { Metadata } from "next";
import { getProductById } from "../../../src/lib/db";
import { ProductDetailPage } from "../../../src/views/ProductDetailPage";

// 1. DINAMIČKI SEO (Ovo se izvršava na serveru prije nego što se stranica pošalje u preglednik)
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  
  // Dohvaćamo proizvod direktno iz Firebasea
  const product = await getProductById(id);
  
  // Ako proizvod ne postoji, vraćamo generičke podatke (ili 404)
  if (!product) {
    return {
      title: "Proizvod nije pronađen | Casualshop BiH",
      description: "Traženi proizvod trenutno nije dostupan u našem webshopu."
    };
  }

  return {
    title: `${product.name} | Casualshop BiH`,
    description: product.description || `Kupite ${product.name} po cijeni od ${product.price} KM uz brzu dostavu širom BiH.`,
    openGraph: {
      title: `${product.name} | Casualshop BiH`,
      description: product.description || `Kupite ${product.name} po cijeni od ${product.price} KM uz brzu dostavu širom BiH.`,
      type: "website",
      images: [product.imageUrl], // OVDJE JE MAGIJA - Facebook/Viber sada vide pravu sliku!
    }
  };
}

// 2. PRIKAZ STRANICE PROIZVODA
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  // Komponenta ProductDetailPage (iz src/pages) je vjerojatno napisana kao klijentska komponenta
  // i ona unutar sebe vjerojatno čita ID iz URL-a. 
  // U Next.js-u to možemo jednostavno renderirati pozivajući tu tvoju staru komponentu.
  
  // Napomena: Da bi ProductDetailPage radila bez React Routera, možda ćemo morati dodati malo
  // Next.js magije u nju, ali prvo da postavimo ovaj temelj.
  return <ProductDetailPage />;
}
