import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import CatalogoCliente from "@/components/CatalogoCliente";
import TopBar from "@/components/home/TopBar";
import Navbar from "@/components/home/Navbar";
import Subnav from "@/components/home/Subnav";
import Footer from "@/components/home/Footer";

async function getWhatsapp(): Promise<{ numero1: string; numero2: string }> {
  try {
    const config = await prisma.configuracion.findFirst();
    return {
      numero1: config?.whatsapp_numero ?? process.env.NEXT_PUBLIC_WHATSAPP ?? "5491100000000",
      numero2: config?.whatsapp_numero_2 ?? "",
    };
  } catch {
    return { numero1: process.env.NEXT_PUBLIC_WHATSAPP ?? "5491100000000", numero2: "" };
  }
}

export default async function CatalogoPage() {
  const { numero1, numero2 } = await getWhatsapp();

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh" }}>
      <TopBar />
      <Navbar />
      <Subnav />

      <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#999" }}>Cargando catálogo...</div>}>
        <CatalogoCliente whatsappNumero={numero1} whatsappNumero2={numero2} />
      </Suspense>

      <Footer />
    </div>
  );
}
