/**
 * Genera descripciones de productos usando la API de Claude.
 * Ejecutar: npx tsx scripts/generar-descripciones.ts
 *
 * Requiere ANTHROPIC_API_KEY en .env.local
 */

import { PrismaClient } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

// Cargar .env.local manualmente
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
  }
}

const prisma = new PrismaClient();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BATCH = 5; // productos por tanda (para no saturar la API)
const DELAY_MS = 1000; // pausa entre tandas

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function generarDescripcion(nombre: string, categoria: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Eres experto en electrodomésticos y productos del hogar para Argentina.
Generá una descripción de producto CORTA y ÚTIL para una tienda online.

Producto: "${nombre}"
Categoría: "${categoria}"

Formato de respuesta (solo esto, sin texto extra):
• [característica 1]
• [característica 2]
• [característica 3]
• [característica 4]
• [característica 5]

Incluí: tecnología/tipo, capacidad/tamaño si aplica, consumo energético si aplica, materiales, uso recomendado. Máximo 5 bullets concisos en español argentino.`,
      },
    ],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  return text;
}

async function main() {
  // Solo productos sin descripción
  const productos = await (prisma as any).producto.findMany({
    where: { descripcion: null, disponible: true },
    select: { id: true, nombre: true, categoria: true },
    orderBy: { id: "asc" },
  });

  console.log(`📦 ${productos.length} productos sin descripción`);
  if (productos.length === 0) {
    console.log("✅ Todos los productos ya tienen descripción");
    return;
  }

  let ok = 0;
  let err = 0;

  for (let i = 0; i < productos.length; i += BATCH) {
    const tanda = productos.slice(i, i + BATCH);
    console.log(`\n🔄 Tanda ${Math.floor(i / BATCH) + 1} — procesando ${tanda.length} productos...`);

    await Promise.all(
      tanda.map(async (p: { id: number; nombre: string; categoria: string }) => {
        try {
          const desc = await generarDescripcion(p.nombre, p.categoria);
          await (prisma as any).producto.update({
            where: { id: p.id },
            data: { descripcion: desc },
          });
          console.log(`  ✅ [${p.id}] ${p.nombre.slice(0, 50)}`);
          ok++;
        } catch (e) {
          console.error(`  ❌ [${p.id}] ${p.nombre.slice(0, 50)} — ${e}`);
          err++;
        }
      })
    );

    if (i + BATCH < productos.length) {
      console.log(`  ⏳ Esperando ${DELAY_MS}ms...`);
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n✅ Completado: ${ok} generadas, ${err} errores`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
