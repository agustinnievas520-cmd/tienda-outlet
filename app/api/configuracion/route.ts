import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const config = await prisma.configuracion.findFirst();
    if (!config) {
      return NextResponse.json(
        { error: "Configuración no encontrada" },
        { status: 404 }
      );
    }
    return NextResponse.json(config);
  } catch (error) {
    console.error("Error al obtener configuración:", error);
    return NextResponse.json(
      { error: "Error al obtener configuración" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verificar API key (usa la misma contraseña de admin)
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { margen_ganancia, margen_financiado, cuotas, interes_cuota, whatsapp_numero, whatsapp_numero_2 } = body;

    // Buscar la configuración existente
    const existente = await prisma.configuracion.findFirst();

    if (!existente) {
      // Crear si no existe
      const nueva = await prisma.configuracion.create({
        data: {
          margen_ganancia:  Number(margen_ganancia)  || 1.35,
          margen_financiado: Number(margen_financiado) || 1.75,
          cuotas:           Number(cuotas)           || 12,
          interes_cuota:    Number(interes_cuota)    || 0.038,
          whatsapp_numero:   String(whatsapp_numero)   || "5491100000000",
          whatsapp_numero_2: String(whatsapp_numero_2 ?? ""),
        },
      });
      return NextResponse.json(nueva);
    }

    // Actualizar la existente
    const actualizada = await prisma.configuracion.update({
      where: { id: existente.id },
      data: {
        ...(margen_ganancia   !== undefined && { margen_ganancia:   Number(margen_ganancia)   }),
        ...(margen_financiado !== undefined && { margen_financiado: Number(margen_financiado) }),
        ...(cuotas            !== undefined && { cuotas:            Number(cuotas)            }),
        ...(interes_cuota     !== undefined && { interes_cuota:     Number(interes_cuota)     }),
        ...(whatsapp_numero   !== undefined && { whatsapp_numero:   String(whatsapp_numero)   }),
        ...(whatsapp_numero_2 !== undefined && { whatsapp_numero_2: String(whatsapp_numero_2) }),
      },
    });

    return NextResponse.json(actualizada);
  } catch (error) {
    console.error("Error al actualizar configuración:", error);
    return NextResponse.json(
      { error: "Error al actualizar configuración" },
      { status: 500 }
    );
  }
}
