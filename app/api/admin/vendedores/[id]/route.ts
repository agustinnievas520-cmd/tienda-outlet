import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { limpiarNumero } from "@/lib/whatsapp";

function autorizado(request: NextRequest) {
  return request.headers.get("x-api-key") === process.env.ADMIN_PASSWORD;
}

// Editar vendedor (nombre, socia, localidad, WhatsApp, activo). El código del
// link no se cambia, para no romper los links que ya se compartieron.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const id = Number((await params).id);
    const body = await request.json();
    const data: { nombre?: string; socia?: string; localidad?: string; whatsapp?: string; activo?: boolean } = {};
    if (body.nombre !== undefined) {
      data.nombre = String(body.nombre).trim();
      if (!data.nombre) return NextResponse.json({ error: "Falta el nombre" }, { status: 400 });
    }
    if (body.localidad !== undefined) data.localidad = String(body.localidad).trim();
    if (body.socia !== undefined) data.socia = String(body.socia).trim();
    if (body.whatsapp !== undefined) {
      data.whatsapp = limpiarNumero(String(body.whatsapp));
      if (data.whatsapp.length < 10) {
        return NextResponse.json({ error: "El WhatsApp no parece válido" }, { status: 400 });
      }
    }
    if (body.activo !== undefined) data.activo = Boolean(body.activo);

    const vendedor = await prisma.vendedor.update({ where: { id }, data });
    return NextResponse.json(vendedor);
  } catch (error) {
    console.error("Error al editar vendedor:", error);
    return NextResponse.json({ error: "Error al editar vendedor" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const id = Number((await params).id);
    await prisma.vendedor.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error al borrar vendedor:", error);
    return NextResponse.json({ error: "Error al borrar vendedor" }, { status: 500 });
  }
}
