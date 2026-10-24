import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import CatalogoCliente from "@/components/CatalogoCliente";
import { resolverWhatsapp } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
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

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const { numero1, numero2 } = await getWhatsapp();
  const { v } = await searchParams;
  const whatsappActivo = resolverWhatsapp(v, numero1, numero2);

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh" }}>
      <TopBar whatsappNumero={whatsappActivo} />
      <Navbar whatsappNumero={whatsappActivo} />
      <Subnav />

      <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#999" }}>Cargando catálogo...</div>}>
        <CatalogoCliente whatsappNumero={numero1} whatsappNumero2={numero2} />
      </Suspense>

      <Footer whatsappNumero={whatsappActivo} />
    </div>
  );
}
