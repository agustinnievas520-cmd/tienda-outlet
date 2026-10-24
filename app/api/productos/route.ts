import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcularPrecioContado, calcularPrecioCuota, calcularPrecioFinanciado, calcularEntregaInicial } from "@/lib/calculos";

const LIMITE_POR_PAGINA = 48;

// Variantes simples de una palabra para tolerar singular/plural en español
// ("muebles" → también probar "mueble", "colchones" → también "colchon").
function variantesPalabra(palabra: string): string[] {
  const variantes = new Set([palabra]);
  if (palabra.length > 4 && palabra.endsWith("es")) variantes.add(palabra.slice(0, -2));
  if (palabra.length > 3 && palabra.endsWith("s")) variantes.add(palabra.slice(0, -1));
  return Array.from(variantes);
}

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

    const skip = (pagina - 1) * limite;

    let productos;
    let total;

    if (busqueda) {
      // Búsqueda sin tildes, por nombre Y categoría, tolerando singular/plural
      // (así "muebles" encuentra la categoría aunque ningún nombre de producto
      // contenga literalmente esa palabra).
      const palabras = busqueda.split(/\s+/).filter(Boolean);
      const condicionesPalabras = palabras.map((palabra) => {
        const condicionesVariantes = variantesPalabra(palabra).map(
          (v) => Prisma.sql`(unaccent(nombre) ILIKE unaccent(${"%" + v + "%"}) OR unaccent(categoria) ILIKE unaccent(${"%" + v + "%"}))`
        );
        return Prisma.sql`(${Prisma.join(condicionesVariantes, " OR ")})`;
      });
      const condicionBusqueda = Prisma.join(condicionesPalabras, " AND ");
      const condicionCategoria = categoria ? Prisma.sql`AND categoria = ${categoria}` : Prisma.empty;

      let ordenRaw = Prisma.sql`"createdAt" DESC`;
      if (orden === "precio_asc") ordenRaw = Prisma.sql`precio_costo ASC`;
      if (orden === "precio_desc") ordenRaw = Prisma.sql`precio_costo DESC`;

      const [filas, filasTotal] = await Promise.all([
        prisma.$queryRaw<any[]>`
          SELECT * FROM "Producto"
          WHERE disponible = true ${condicionCategoria} AND (${condicionBusqueda})
          ORDER BY ${ordenRaw}
          LIMIT ${limite} OFFSET ${skip}
        `,
        prisma.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(*)::bigint as count FROM "Producto"
          WHERE disponible = true ${condicionCategoria} AND (${condicionBusqueda})
        `,
      ]);
      productos = filas;
      total = Number(filasTotal[0]?.count ?? 0);
    } else {
      const where: Prisma.ProductoWhereInput = { disponible: true };
      if (categoria) where.categoria = categoria;

      let orderBy: Prisma.ProductoOrderByWithRelationInput = { createdAt: "desc" };
      if (orden === "precio_asc") orderBy = { precio_costo: "asc" };
      if (orden === "precio_desc") orderBy = { precio_costo: "desc" };

      [productos, total] = await Promise.all([
        prisma.producto.findMany({ where, orderBy, skip, take: limite }),
        prisma.producto.count({ where }),
      ]);
    }

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
