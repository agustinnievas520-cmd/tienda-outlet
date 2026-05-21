/**
 * Scraper de descripciones desde vienamuebles.com
 * Extrae el contenido de #tab-description de cada producto y lo guarda en la DB.
 *
 * Ejecutar: npx tsx scripts/scraper-descripciones.ts
 */

// Cargar variables de entorno desde .env.local
import * as fs from "fs";
import * as path from "path";
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const [k, ...v] = line.split("=");
    if (k?.trim() && v.length) process.env[k.trim()] = v.join("=").trim();
  }
}

// Desactivar verificación SSL para poder acceder a vienamuebles.com
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { PrismaClient } from "@prisma/client";
import * as cheerio from "cheerio";

const prisma = new PrismaClient();

const DELAY_MS = 800;   // pausa entre requests (no saturar el servidor)
const BATCH    = 5;     // productos por tanda
const TIMEOUT  = 10000; // 10 segundos por página

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchDescripcion(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "es-AR,es;q=0.9",
      },
    });

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    // 1. Intentar tab de descripción principal
    const tabDesc = $("#tab-description");
    tabDesc.find("script, style").remove();
    let texto = tabDesc.text().trim();

    // 2. Fallback: descripción corta de WooCommerce
    if (!texto) {
      texto = $(".woocommerce-product-details__short-description, .product-description, .entry-summary .description").text().trim();
    }

    // 3. Fallback: tabla de atributos/especificaciones
    if (!texto) {
      const attrs: string[] = [];
      $(".woocommerce-product-attributes tr, .shop_attributes tr").each((_, el) => {
        const k = $(el).find("th, td:first-child").first().text().trim();
        const v = $(el).find("td, td:last-child").last().text().trim();
        if (k && v && k !== v) attrs.push(`${k}: ${v}`);
      });
      if (attrs.length) texto = attrs.join("\n");
    }

    if (!texto) return null;

    // Limpiar espacios y líneas vacías
    texto = texto
      .replace(/\t+/g, " ")
      .replace(/[ ]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // Truncar si es muy largo (máx 800 chars)
    if (texto.length > 800) texto = texto.slice(0, 797) + "...";

    return texto || null;
  } catch {
    return null;
  }
}

async function main() {
  // Usar SQL directo para no depender del cliente Prisma generado
  const productos = await prisma.$queryRawUnsafe<{ id: number; nombre: string; url_origen: string }[]>(
    `SELECT id, nombre, url_origen FROM Producto WHERE disponible = 1 AND (descripcion IS NULL OR descripcion = '') ORDER BY id ASC`
  );

  console.log(`📦 ${productos.length} productos sin descripción`);
  if (productos.length === 0) {
    console.log("✅ Todos los productos ya tienen descripción");
    return;
  }

  let ok = 0;
  let sinContenido = 0;
  let errores = 0;

  for (let i = 0; i < productos.length; i += BATCH) {
    const tanda = productos.slice(i, i + BATCH);
    const progreso = `[${i + 1}-${Math.min(i + BATCH, productos.length)}/${productos.length}]`;
    console.log(`\n🔄 ${progreso}`);

    for (const p of tanda) {
      const desc = await fetchDescripcion(p.url_origen);

      if (desc) {
        await prisma.$executeRawUnsafe(
          `UPDATE Producto SET descripcion = ?, updatedAt = datetime('now') WHERE id = ?`,
          desc, p.id
        );
        console.log(`  ✅ [${p.id}] ${p.nombre.slice(0, 50)}`);
        ok++;
      } else {
        console.log(`  ⚠️  [${p.id}] Sin descripción — ${p.nombre.slice(0, 40)}`);
        sinContenido++;
      }

      await sleep(DELAY_MS);
    }
  }

  console.log(`\n✅ Completado: ${ok} con descripción, ${sinContenido} sin contenido, ${errores} errores`);
  console.log(`💾 Descripciones guardadas en la base de datos`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
