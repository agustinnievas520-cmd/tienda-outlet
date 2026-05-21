import { prisma } from "@/lib/prisma";
import * as cheerio from "cheerio";

// Ignorar SSL para vienamuebles.com
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export const dynamic = "force-dynamic";

async function fetchDescripcion(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    const tabDesc = $("#tab-description");
    tabDesc.find("script, style").remove();
    let texto = tabDesc.text().trim();

    if (!texto) {
      texto = $(".woocommerce-product-details__short-description").text().trim();
    }

    if (!texto) {
      const attrs: string[] = [];
      $(".woocommerce-product-attributes tr").each((_, el) => {
        const k = $(el).find("th").text().trim();
        const v = $(el).find("td").text().trim();
        if (k && v) attrs.push(`${k}: ${v}`);
      });
      if (attrs.length) texto = attrs.join("\n");
    }

    if (!texto) return null;

    texto = texto.replace(/\t+/g, " ").replace(/[ ]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    if (texto.length > 800) texto = texto.slice(0, 797) + "...";
    return texto || null;
  } catch {
    return null;
  }
}

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (msg: string) => {
        try { controller.enqueue(encoder.encode(`data: ${msg}\n\n`)); } catch {}
      };

      try {
        const productos = await prisma.$queryRawUnsafe<{ id: number; nombre: string; url_origen: string }[]>(
          `SELECT id, nombre, url_origen FROM "Producto" WHERE disponible = true AND (descripcion IS NULL OR descripcion = '') ORDER BY id ASC`
        );

        const total = productos.length;
        send(`📦 TOTAL: ${total} productos para procesar. No cierres esta pestaña.`);

        let ok = 0, sin = 0;

        for (let i = 0; i < productos.length; i++) {
          const p = productos[i];
          const desc = await fetchDescripcion(p.url_origen);

          if (desc) {
            await prisma.$executeRawUnsafe(
              `UPDATE "Producto" SET descripcion = $1, "updatedAt" = NOW() WHERE id = $2`,
              desc, p.id
            );
            send(`✅ [${i + 1}/${total}] ${p.nombre.slice(0, 60)}`);
            ok++;
          } else {
            send(`⚠️ [${i + 1}/${total}] Sin descripción — ${p.nombre.slice(0, 40)}`);
            sin++;
          }

          await new Promise(r => setTimeout(r, 500));
        }

        send(`🎉 COMPLETADO: ${ok} descripciones guardadas, ${sin} sin contenido.`);
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
