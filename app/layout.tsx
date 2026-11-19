import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
// Letra de los títulos, igual de elegante que la del Instagram
const titulo = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-titulo",
});

export const metadata: Metadata = {
  title: "Outlet Hogar — Electrodomésticos, Tecnología y Muebles con financiación",
  description:
    "Comprá electrodomésticos, tecnología, muebles, motos y bicicletas con financiación directa. Solo con DNI, sin tarjeta ni banco. El Trébol, Santa Fe.",
  openGraph: {
    title: "Outlet Hogar",
    description: "Financiación directa con DNI. Sin tarjeta ni banco.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${titulo.variable}`}>
      <body className="min-h-screen" style={{ fontFamily: "var(--font-inter), Inter, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
