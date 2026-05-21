import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcularPrecioContado, calcularPrecioCuota, calcularPrecioFinanciado, calcularEntregaInicial } from "@/lib/calculos";

const LIMITE_POR_PAGINA = 48;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get("categoria");
    const busqueda = searchParams.get("q")?.trim();
    const orden = searchParams.get("orden") || "nuevo";
    const pagina = Math.max(1, parseInt(searchParams.get("pagina") || "1", 10));
    const limite = Math.min(
      LIMITE_POR_PAGINA,
      parseInt(searchParams.get("limite") || String(LIMITE_POR_PAGINA), 10)
    );

    const config = await prisma.configuracion.findFirst();
    if (!config) {
      return NextResponse.json({ error: "Configuración no encontrada" }, { status: 500 });
    }

    // Filtros
    const where: Prisma.ProductoWhereInput = {
      disponible: true,
    };
    if (categoria) where.categoria = categoria;
    if (busqueda) {
      where.nombre = { contains: busqueda, mode: "insensitive" };
    }

    // Ordenamiento
    let orderBy: Prisma.ProductoOrderByWithRelationInput = { createdAt: "desc" };
    if (orden === "precio_asc") orderBy = { precio_costo: "asc" };
    if (orden === "precio_desc") orderBy = { precio_costo: "desc" };

    const skip = (pagina - 1) * limite;

    // Consulta con total para paginación
    const [productos, total] = await Promise.all([
      prisma.producto.findMany({ where, orderBy, skip, take: limite }),
      prisma.producto.count({ where }),
    ]);

    const productosConPrecios = productos.map((p) => ({
      ...p,
      precio_contado:   calcularPrecioContado(p.precio_costo, config),
      precio_financiado: calcularPrecioFinanciado(p.precio_costo, config),
      precio_cuota:     calcularPrecioCuota(p.precio_costo, config),
      cuotas:           config.cuotas,
      entrega_inicial:  calcularEntregaInicial(p.precio_costo),
    }));

    return NextResponse.json({
      productos: productosConPrecios,
      total,
      pagina,
      totalPaginas: Math.ceil(total / limite),
      limite,
    });
  } catch (error) {
    console.error("Error al obtener productos:", error);
    return NextResponse.json({ error: "Error al obtener productos" }, { status: 500 });
  }
}
