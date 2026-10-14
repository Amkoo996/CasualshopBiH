import type { Metadata } from 'next';
import ClientLayout from './ClientLayout';
import './globals.css';

export const metadata: Metadata = {
  title: 'Casual Shop BiH • Autentični Streetwear',
  description: 'Urbana streetwear odjeća vrhunskog kvaliteta. Plaćanje pouzećem i brza dostava širom Bosne i Hercegovine.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bs">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Poppins:wght@700;800;900&display=swap"
        />
      </head>
      <body className="bg-[#FAF9F5] text-neutral-900 antialiased font-['Inter']">
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}