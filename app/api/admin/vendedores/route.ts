import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { esCodigoVendedor, generarCodigo, limpiarNumero } from "@/lib/whatsapp";

function autorizado(request: NextRequest) {
  return request.headers.get("x-api-key") === process.env.ADMIN_PASSWORD;
}

// Lista de vendedores (solo admin)
export async function GET(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const vendedores = await prisma.vendedor.findMany({ orderBy: { createdAt: "asc" } });
    return NextResponse.json(vendedores);
  } catch (error) {
    console.error("Error al listar vendedores:", error);
    return NextResponse.json({ error: "Error al listar vendedores" }, { status: 500 });
  }
}

// Crear vendedor
export async function POST(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const nombre = String(body.nombre ?? "").trim();
    const localidad = String(body.localidad ?? "").trim();
    const whatsapp = limpiarNumero(String(body.whatsapp ?? ""));
    if (!nombre) return NextResponse.json({ error: "Falta el nombre" }, { status: 400 });
    if (whatsapp.length < 10) {
      return NextResponse.json({ error: "El WhatsApp no parece válido (con código de país, ej: 5493401...)" }, { status: 400 });
    }

    // Código del link: el que mandaron o uno generado del nombre.
    // "1" y "2" quedan reservados para los números de la Configuración.
    let base = generarCodigo(String(body.codigo ?? "") || nombre) || "vendedor";
    if (base === "1" || base === "2") base = `vendedor-${base}`;
    if (!esCodigoVendedor(base)) {
      return NextResponse.json({ error: "Código de link inválido" }, { status: 400 });
    }
    let codigo = base;
    for (let i = 2; await prisma.vendedor.findUnique({ where: { codigo } }); i++) {
      codigo = `${base}-${i}`.slice(0, 40);
    }

    const vendedor = await prisma.vendedor.create({
      data: { nombre, localidad, whatsapp, codigo },
    });
    return NextResponse.json(vendedor);
  } catch (error) {
    console.error("Error al crear vendedor:", error);
    return NextResponse.json({ error: "Error al crear vendedor" }, { status: 500 });
  }
}
