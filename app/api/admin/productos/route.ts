import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcularPrecioContado, calcularPrecioCuota, calcularPrecioFinanciado } from "@/lib/calculos";

// Endpoint exclusivo del admin: devuelve todos los productos sin filtro de disponibilidad
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get("categoria");
    const pagina = Math.max(1, parseInt(searchParams.get("pagina") || "1", 10));
    const limite = 100;

    const where: Prisma.ProductoWhereInput = {};
    if (categoria) where.categoria = categoria;

    const skip = (pagina - 1) * limite;

    const config = await prisma.configuracion.findFirst();

    const [productos, total] = await Promise.all([
      prisma.producto.findMany({ where, orderBy: { nombre: "asc" }, skip, take: limite }),
      prisma.producto.count({ where }),
    ]);

    const productosConPrecios = productos.map((p) => ({
      ...p,
      precio_contado:    config ? calcularPrecioContado(p.precio_costo, config) : 0,
      precio_financiado: config ? calcularPrecioFinanciado(p.precio_costo, config) : 0,
      precio_cuota:      config ? calcularPrecioCuota(p.precio_costo, config) : 0,
      cuotas: config?.cuotas ?? 12,
    }));

    return NextResponse.json({
      productos: productosConPrecios,
      total,
      pagina,
      totalPaginas: Math.ceil(total / limite),
    });
  } catch (error) {
    console.error("Error admin productos:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
