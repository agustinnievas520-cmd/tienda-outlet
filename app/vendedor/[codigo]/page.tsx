import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { esCodigoVendedor } from "@/lib/whatsapp";
import PanelVendedor from "@/components/PanelVendedor";

export const dynamic = "force-dynamic";

// Página privada de cada vendedor: no aparece en Google.
export const metadata: Metadata = {
  title: "Panel de vendedor — Outlet Hogar",
  robots: { index: false, follow: false },
};

export default async function VendedorPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const vendedor = esCodigoVendedor(codigo)
    ? await prisma.vendedor.findUnique({ where: { codigo } })
    : null;

  if (!vendedor?.activo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F1E8] p-6 text-center">
        <div>
          <p className="text-xl font-semibold text-[#3B2A1E]">Este link de vendedor no está activo</p>
          <p className="text-gray-500 mt-2">Pedile a Outlet Hogar que te pase tu link actualizado.</p>
        </div>
      </div>
    );
  }

  let categorias: string[] = [];
  try {
    const filas = await prisma.producto.findMany({
      where: { disponible: true },
      select: { categoria: true },
      distinct: ["categoria"],
      orderBy: { categoria: "asc" },
    });
    categorias = filas.map((f) => f.categoria);
  } catch {
    // sin categorías, igual funciona el buscador
  }

  return (
    <PanelVendedor
      vendedor={{ nombre: vendedor.nombre, codigo: vendedor.codigo }}
      categorias={categorias}
    />
  );
}
