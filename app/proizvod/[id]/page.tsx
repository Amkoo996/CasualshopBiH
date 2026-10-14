import { Metadata } from "next";

// 1. Dinamički SEO Meta tagovi (Ovo rješava problem s dijeljenjem linkova)
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  
  // Ovdje ćemo u sljedećem koraku povući podatke iz Firebasea za ovaj specifični ID
  // Trenutno stavljamo "placeholder" podatke kako bi testirali strukturu
  const nazivProizvoda = `Streetwear Komad #${id}`; 
  const opisProizvoda = "Pregledajte našu najnoviju streetwear kolekciju uz brzu dostavu u cijeloj BiH.";
  
  return {
    title: `${nazivProizvoda} | Casualshop BiH`,
    description: opisProizvoda,
    openGraph: {
      title: `${nazivProizvoda} | Casualshop BiH`,
      description: opisProizvoda,
      type: "website",
      // images: [slikaProizvoda], -> ovo ćemo otključati kad spojimo bazu
    }
  };
}

// 2. Glavna SSR komponenta stranice
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-gray-50 pt-24 px-4 flex flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Proizvod ID: {id}</h1>
      <p className="mt-4 text-lg text-gray-600 max-w-xl">
        Ovo je dinamička stranica. Uskoro ćemo ovdje dodati logiku koja iz Firebasea povlači sliku, cijenu, dostupne veličine i gumb za dodavanje u košaricu.
      </p>
      <a href="/" className="mt-8 px-6 py-3 bg-black text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 transition-colors">
        Povratak na naslovnicu
      </a>
    </div>
  );
}
