import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const logs = await prisma.logSincronizacion.findMany({
      orderBy: { fecha: "desc" },
      take: 10,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error al obtener logs:", error);
    return NextResponse.json(
      { error: "Error al obtener logs" },
      { status: 500 }
    );
  }
}
