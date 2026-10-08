const CLOUD_NAME = 'rvlsak2u';
// ⚠️ Zamijeni 'ml_default' sa imenom preseta koji si napravio u Koraku 1
const UPLOAD_PRESET = 'ml_default'; 

export async function uploadImage(file: File): Promise<string> {
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
        errorData?.error?.message || 'Upload nije uspio. Provjerite da li je Preset označen kao Unsigned.'
      );
    }

    const data = await res.json();
    return data.secure_url as string;
  } catch (error: any) {
    console.error('Greška pri slanju na Cloudinary:', error);
    throw new Error(error.message || 'Mrežna greška pri slanju slike.');
  }
}

export const optimizeImage = (url: string, width = 800) =>
  url && url.includes('res.cloudinary.com')
    ? url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`)
    : url;
