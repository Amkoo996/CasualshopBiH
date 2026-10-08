const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD || 'rvlsak2u';
// ⚠️ Zamijeni 'casual_preset' sa tačnim imenom Unsigned Preset-a iz Cloudinary Settings -> Upload
const PRESET = import.meta.env.VITE_CLOUDINARY_PRESET || 'casual_preset';

export async function uploadImage(file: File): Promise<string> {
  // 1. Provjera da li je unesen preset
  if (!PRESET || PRESET === 'TVOJ_UNSIGNED_PRESET') {
    throw new Error('Cloudinary Unsigned Preset nije podešen u upload.ts.');
  }

  // 2. Ograničenje veličine slike na 10 MB
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Slika je veća od 10 MB. Odaberite manji fajl.');
  }

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', PRESET);

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
      method: 'POST',
      body: form,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('Cloudinary API Error:', errorData);
      throw new Error(
        errorData?.error?.message || 'Upload slike nije uspio. Provjerite da li je Preset označen kao Unsigned u Cloudinary-ju.'
      );
    }

    const data = await res.json();
    return data.secure_url as string;
  } catch (error: any) {
    console.error('Greška pri slanju na Cloudinary:', error);
    throw new Error(error.message || 'Mrežna greška pri slanju slike.');
  }
}

// Pomoćna funkcija za automatsku optimizaciju i promjenu dimenzija slika na klijentu
export const optimizeImage = (url: string, width = 800) =>
  url && url.includes('res.cloudinary.com')
    ? url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`)
    : url;
