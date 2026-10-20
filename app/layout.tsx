import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import ClientLayout from './ClientLayout';
import './globals.css';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID;

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://casualshop.ba'),
  title: 'Casual Shop BiH • Autentični Streetwear',
  description: 'Urbana streetwear odjeća vrhunskog kvaliteta. Plaćanje pouzećem i brza dostava širom Bosne i Hercegovine.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/logo.png', sizes: 'any', type: 'image/png' },
    ],
    shortcut: '/logo.png',
    apple: [
      { url: '/logo.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Casual Shop',
  },
  openGraph: {
    title: 'Casual Shop BiH • Autentični Streetwear',
    description: 'Urbana streetwear odjeća vrhunskog kvaliteta. Plaćanje pouzećem i brza dostava širom Bosne i Hercegovine.',
    url: 'https://casualshop.ba',
    siteName: 'Casual Shop BiH',
    images: [
      {
        url: '/images/seo-cover.webp',
        width: 1200,
        height: 630,
        alt: 'Casual Shop BiH Kolekcija',
      },
    ],
    locale: 'bs_BA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Casual Shop BiH • Autentični Streetwear',
    description: 'Urbana streetwear odjeća vrhunskog kvaliteta. Plaćanje pouzećem i brza dostava širom Bosne i Hercegovine.',
    images: ['/images/seo-cover.webp'],
  },
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@700;800;900&display=swap"
        />
      </head>
      <body className="bg-[#FAF9F5] text-neutral-900 antialiased font-['Inter']">
        {/* GOOGLE ANALYTICS INTEGRACIJA PREKO VARIJABLE */}
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            />
            <Script
              id="google-analytics-init"
              strategy="afterInteractive"
            >
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}

        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}