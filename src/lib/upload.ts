const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD;
const PRESET = import.meta.env.VITE_CLOUDINARY_PRESET;

export async function uploadImage(file: File): Promise<string> {
  if (!CLOUD || !PRESET) throw new Error('Cloudinary nije podešen.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Slika je veća od 10 MB.');

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', PRESET);

  const res = await fetch('https://api.cloudinary.com/v1_1/' + CLOUD + '/image/upload', {
    method: 'POST',
    body: form,
  });

  if (!res.ok) throw new Error('Upload nije uspio.');

  const data = await res.json();
  return data.secure_url as string;
}

export const optimizeImage = (url: string, width = 800) =>
  url.includes('res.cloudinary.com')
    ? url.replace('/upload/', '/upload/f_auto,q_auto,w_' + width + '/')
    : url;
