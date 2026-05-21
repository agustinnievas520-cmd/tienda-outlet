import { prisma } from "@/lib/prisma";
import * as cheerio from "cheerio";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
export const dynamic = "force-dynamic";

async function checkStock(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    if (res.status === 404) return false; // producto eliminado del proveedor → sin stock
    if (!res.ok) return true; // otro error (timeout, 5xx) → asumimos en stock

    const html = await res.text();
    const $ = cheerio.load(html);

    const stockText = $(".stock").text().toLowerCase();

    // Fuera de stock si dice agotado, sin stock, out-of-stock, etc.
    if (
      stockText.includes("agotado") ||
      stockText.includes("fuera de stock") ||
      stockText.includes("sin stock") ||
      stockText.includes("out of stock") ||
      $(".stock.out-of-stock").length > 0
    ) {
      return false;
    }

    return true; // en stock por defecto
  } catch {
    return true; // si hay error, asumimos en stock
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const desde = parseInt(searchParams.get("desde") ?? "0", 10);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (msg: string) => {
        try { controller.enqueue(encoder.encode(`data: ${msg}\n\n`)); } catch {}
      };

      try {
        const productos = await prisma.$queryRawUnsafe<{ id: number; nombre: string; url_origen: string; disponible: boolean }[]>(
          `SELECT id, nombre, url_origen, disponible FROM "Producto" ORDER BY id ASC OFFSET ${desde}`
        );

        const total = productos.length;
        send(`📦 Retomando desde #${desde + 1} — ${total} productos restantes. No cierres esta pestaña.`);

        let enStock = 0, sinStock = 0, actualizados = 0;

        for (let i = 0; i < productos.length; i++) {
          const p = productos[i];
          const disponible = await checkStock(p.url_origen);
          const disponibleActual = Boolean(p.disponible);

          if (disponible !== disponibleActual) {
            await prisma.$executeRawUnsafe(
              `UPDATE "Producto" SET disponible = $1, "updatedAt" = NOW() WHERE id = $2`,
              disponible, p.id
            );
            const cambio = disponible ? "🟢 volvió al stock" : "🔴 sin stock";
            send(`${cambio} [${desde + i + 1}] ${p.nombre.slice(0, 50)}`);
            actualizados++;
          } else {
            send(`${disponible ? "✅" : "⚠️"} [${desde + i + 1}] ${p.nombre.slice(0, 50)}`);
          }

          if (disponible) enStock++; else sinStock++;
          await new Promise(r => setTimeout(r, 400));
        }

        send(`🎉 COMPLETADO: ${enStock} en stock, ${sinStock} sin stock, ${actualizados} actualizados.`);
      } catch (e) {
        send(`❌ Error: ${e}`);
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
