import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sincronizar, GRUPOS } from "@/lib/sincronizar";

// Sincronización diaria con Viena. Vercel la llama sola todas las mañanas
// (ver vercel.json), un grupo de categorías por llamada para no pasar el
// tiempo máximo. Cualquiera puede llamarla, pero cada grupo corre como mucho
// una vez cada 6 horas (así nadie puede cargar de pedidos al proveedor).
// Desde el admin (con la contraseña) se puede forzar.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function ultimaVez(slugs: string[]): Promise<number> {
  const ultimo = await prisma.logSincronizacion.findFirst({
    where: { errores: { startsWith: `[${slugs.join(",")}]` } },
    orderBy: { fecha: "desc" },
  });
  return ultimo ? ultimo.fecha.getTime() : 0;
}

// ?grupo=1..3 sincroniza ese grupo. Sin grupo (lo que llama Vercel cada
// mañana) hace los 3, empezando por el que hace más que no se actualiza,
// y corta antes del tiempo máximo (lo que falte sigue al otro día).
export async function GET(request: NextRequest) {
  const param = request.nextUrl.searchParams.get("grupo");
  const forzado = request.headers.get("x-api-key") === process.env.ADMIN_PASSWORD;
  const inicio = Date.now();

  let grupos = GRUPOS;
  if (param) {
    const g = GRUPOS[Number(param) - 1];
    if (!g) return NextResponse.json({ error: "Grupo inválido (1 a 3)" }, { status: 400 });
    grupos = [g];
  }

  const conFecha = await Promise.all(grupos.map(async (g) => ({ g, fecha: await ultimaVez(g) })));
  conFecha.sort((a, b) => a.fecha - b.fecha);

  const resultados = [];
  for (const { g, fecha } of conFecha) {
    if (!forzado && Date.now() - fecha < 6 * 60 * 60 * 1000) {
      resultados.push({ categorias: g, salteado: "ya se sincronizó hace menos de 6 horas" });
      continue;
    }
    if (Date.now() - inicio > 40_000) {
      resultados.push({ categorias: g, salteado: "sin tiempo, sigue en la próxima" });
      continue;
    }
    resultados.push(await sincronizar(g));
  }
  return NextResponse.json({ segundos: Math.round((Date.now() - inicio) / 1000), resultados });
}
