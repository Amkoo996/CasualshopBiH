import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "./ClientLayout";

export const metadata: Metadata = {
  title: "Casual Shop BiH | Udobna i stilska odjeća online",
  description: "Udobna odjeća za svaki dan. Majice, duksevi, kape i streetwear komadi uz brzu dostavu širom BiH i plaćanje pouzećem.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bs">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Poppins:wght@700;800;900&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" type="image/svg+xml" href="/logo-favicon.svg" />
      </head>
      <body className="antialiased bg-[#F4F2EC] text-[#111111]">
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}