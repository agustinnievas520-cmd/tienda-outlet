import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcularPrecioContado, calcularPrecioCuota, calcularPrecioFinanciado, calcularEntregaInicial } from "@/lib/calculos";

const LIMITE_POR_PAGINA = 48;

// Sinónimos frecuentes verificados contra el catálogo real: casos donde el
// producto existe pero bajo una palabra distinta a la que buscaría un
// cliente (ej. "frigorífico" no aparece nunca, pero "heladera" sí). No
// incluye abreviaturas cortas como "pc" porque chocan con códigos de
// modelo (DLD02PC, PCA012NE, etc.) y ensucian resultados no relacionados.
const GRUPOS_SINONIMOS: string[][] = [
  ["heladera", "frigorifico", "refrigerador"],
  ["pileta", "piscina"],
  ["computadora", "compu", "notebook", "laptop"],
  ["pesa", "mancuerna", "gimnasio"],
  ["aire", "split", "acondicionado"],
];

function sinonimosDe(palabra: string): string[] {
  return GRUPOS_SINONIMOS.find((grupo) => grupo.includes(palabra)) ?? [];
}

// Variantes simples de una palabra para tolerar singular/plural en español
// ("muebles" → también probar "mueble", "colchones" → también "colchon",
// "luces" → también "luz") y sinónimos verificados.
function variantesPalabra(palabra: string): string[] {
  const variantes = new Set([palabra]);
  if (palabra.length > 4 && palabra.endsWith("es")) variantes.add(palabra.slice(0, -2));
  if (palabra.length > 3 && palabra.endsWith("s")) variantes.add(palabra.slice(0, -1));
  // Plural irregular de palabras terminadas en "z": luz→luces, lápiz→lápices
  if (palabra.length > 4 && palabra.endsWith("ces")) variantes.add(palabra.slice(0, -3) + "z");

  for (const v of Array.from(variantes)) {
    sinonimosDe(v).forEach((s) => variantes.add(s));
  }

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
      const variantesPorPalabra = palabras.map(variantesPalabra);
      const condicionesPalabras = variantesPorPalabra.map((variantes) => {
        const condicionesVariantes = variantes.map(
          (v) => Prisma.sql`(unaccent(nombre) ILIKE unaccent(${"%" + v + "%"}) OR unaccent(categoria) ILIKE unaccent(${"%" + v + "%"}))`
        );
        return Prisma.sql`(${Prisma.join(condicionesVariantes, " OR ")})`;
      });
      const condicionBusqueda = Prisma.join(condicionesPalabras, " AND ");
      const condicionCategoria = categoria ? Prisma.sql`AND categoria = ${categoria}` : Prisma.empty;

      // Relevancia: un match "flojo" (solo por categoría, como "Tendedero" al
      // buscar "cocina") no debe competir en pie de igualdad con un producto
      // que de verdad se llama así. Sin esto, con el orden por precio por
      // defecto, las cocinas de verdad (caras) quedaban enterradas detrás de
      // anafes y balanzas baratos de la misma categoría "Cocina y Lavado".
      const condEmpiezaConNombre = Prisma.join(
        variantesPorPalabra[0].map((v) => Prisma.sql`unaccent(nombre) ILIKE unaccent(${v + "%"})`),
        " OR "
      );
      const condContieneEnNombre = Prisma.join(
        variantesPorPalabra.flat().map((v) => Prisma.sql`unaccent(nombre) ILIKE unaccent(${"%" + v + "%"})`),
        " OR "
      );
      const relevanciaRaw = Prisma.sql`
        CASE
          WHEN (${condEmpiezaConNombre}) THEN 0
          WHEN (${condContieneEnNombre}) THEN 1
          ELSE 2
        END
      `;

      let ordenRaw = Prisma.sql`"createdAt" DESC`;
      if (orden === "precio_asc") ordenRaw = Prisma.sql`precio_costo ASC`;
      if (orden === "precio_desc") ordenRaw = Prisma.sql`precio_costo DESC`;

      const [filas, filasTotal] = await Promise.all([
        prisma.$queryRaw<any[]>`
          SELECT * FROM "Producto"
          WHERE disponible = true ${condicionCategoria} AND (${condicionBusqueda})
          ORDER BY (${relevanciaRaw}) ASC, ${ordenRaw}
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
