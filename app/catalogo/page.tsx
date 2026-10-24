import { Suspense } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import CatalogoCliente from "@/components/CatalogoCliente";
import { resolverWhatsapp, vendedorActivo } from "@/lib/whatsapp";

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
  const { v: vQuery } = await searchParams;
  const cookieStore = await cookies();
  const v = vendedorActivo(vQuery, cookieStore.get("vendedor")?.value);
  const whatsappActivo = resolverWhatsapp(v, numero1, numero2);
  const vendedorFijo = v === "2" && numero2 ? numero2 : v === "1" ? numero1 : undefined;

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh" }}>
      <TopBar whatsappNumero={whatsappActivo} />
      <Navbar whatsappNumero={whatsappActivo} />
      <Subnav />

      <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#999" }}>Cargando catálogo...</div>}>
        <CatalogoCliente whatsappNumero={numero1} whatsappNumero2={numero2} vendedorFijo={vendedorFijo} />
      </Suspense>

      <Footer whatsappNumero={whatsappActivo} />
    </div>
  );
}
