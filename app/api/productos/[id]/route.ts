import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularPrecioContado, calcularPrecioCuota } from "@/lib/calculos";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idNum = parseInt(id, 10);

    if (isNaN(idNum)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const config = await prisma.configuracion.findFirst();
    if (!config) {
      return NextResponse.json(
        { error: "Configuración no encontrada" },
        { status: 500 }
      );
    }

    const producto = await prisma.producto.findUnique({
      where: { id: idNum },
    });

    if (!producto) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...producto,
      precio_contado: calcularPrecioContado(producto.precio_costo, config),
      precio_cuota: calcularPrecioCuota(producto.precio_costo, config),
      cuotas: config.cuotas,
    });
  } catch (error) {
    console.error("Error al obtener producto:", error);
    return NextResponse.json(
      { error: "Error al obtener producto" },
      { status: 500 }
    );
  }
}

// Actualizar precio_costo o disponibilidad de un producto (requiere API key)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const { precio_costo, disponible } = body;

    const data: Record<string, unknown> = {};
    if (precio_costo !== undefined) data.precio_costo = Number(precio_costo);
    if (disponible !== undefined) data.disponible = Boolean(disponible);

    const actualizado = await prisma.producto.update({
      where: { id: idNum },
      data,
    });

    const config = await prisma.configuracion.findFirst();
    if (!config) {
      return NextResponse.json(actualizado);
    }

    return NextResponse.json({
      ...actualizado,
      precio_contado: calcularPrecioContado(actualizado.precio_costo, config),
      precio_cuota: calcularPrecioCuota(actualizado.precio_costo, config),
      cuotas: config.cuotas,
    });
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    return NextResponse.json(
      { error: "Error al actualizar producto" },
      { status: 500 }
    );
  }
}
