import { Metadata } from "next";
import { getProductById, getProducts } from "../../../src/lib/db";
import { ProductDetailPage } from "../../../src/views/ProductDetailPage";

// Generira statičke rute za sve postojeće artikle
export async function generateStaticParams() {
  try {
    const products = await getProducts();
    return products.map((product) => ({
      id: product.id,
    }));
  } catch (e) {
    console.error("Greška pri generiranju parametara proizvoda:", e);
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);
  
  if (!product) {
    return {
      title: "Proizvod nije pronađen | Casualshop BiH",
      description: "Traženi proizvod trenutno nije dostupan."
    };
  }

  return {
    title: `${product.name} | Casualshop BiH`,
    description: product.description || `Kupite ${product.name} po cijeni od ${product.price} KM uz brzu dostavu širom BiH.`,
    openGraph: {
      title: `${product.name} | Casualshop BiH`,
      description: product.description || `Kupite ${product.name} po cijeni od ${product.price} KM uz brzu dostavu širom BiH.`,
      type: "website",
      images: [product.images?.[0] || ''],
    }
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    return (
      <div className="min-h-screen pt-24 text-center font-bold">
        Proizvod nije pronađen.
      </div>
    );
  }

  return <ProductDetailPage product={product} />;
}