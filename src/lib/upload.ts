const CLOUD_NAME = 'rvlsak2u';
const UPLOAD_PRESET = 'casual_preset'; 

/**
 * Pomoćna funkcija za automatsku optimizaciju, fiksno pretvaranje u WebP format i izmjenu dimenzija.
 * Čak i ako korisnik učita PNG ili JPG sliku, Cloudinary će je isporučiti u brzom WebP formatu.
 */
export const optimizeImage = (url: string, width = 800): string => {
  if (!url || !url.includes('res.cloudinary.com')) return url;

  // Transformacija: f_webp (forsira webp format), q_auto (automatska kompresija bez vidljivog gubitka kvaliteta), w_width, c_limit (ne razvlači manje slike)
  const transformation = `f_webp,q_auto,w_${width},c_limit`;

  if (url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/${transformation}/`);
  }

  return url;
};

/**
 * Upload slika na Cloudinary uz provjeru veličine i automatski povratak optimizovanog URL-a.
 */
export async function uploadImage(file: File): Promise<string> {
  // 1. Provjera veličine slike (limit 10 MB)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Slika je veća od 10 MB. Odaberite manji fajl.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('Cloudinary API Error:', errorData);
      throw new Error(
        errorData?.error?.message || 'Upload slike nije uspio.'
      );
    }

    const data = await res.json();
    const rawUrl = data.secure_url as string;

    // Vraćamo odmah optimizirani URL sa f_webp i q_auto
    return optimizeImage(rawUrl);
  } catch (error: any) {
    console.error('Greška pri slanju na Cloudinary:', error);
    throw new Error(error.message || 'Mrežna greška pri slanju slike.');
  }
}
