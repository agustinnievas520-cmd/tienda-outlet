import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Obtener categorías únicas de productos disponibles
    const categorias = await prisma.producto.findMany({
      where: { disponible: true },
      select: { categoria: true },
      distinct: ["categoria"],
      orderBy: { categoria: "asc" },
    });

    const lista = categorias.map((c) => c.categoria).filter(Boolean);

    return NextResponse.json(lista);
  } catch (error) {
    console.error("Error al obtener categorías:", error);
    return NextResponse.json(
      { error: "Error al obtener categorías" },
      { status: 500 }
    );
  }
}
