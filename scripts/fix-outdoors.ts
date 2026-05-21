import * as fs from "fs";
import * as path from "path";
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf-8").split("\n").forEach(line => {
    const [k, ...v] = line.split("=");
    if (k?.trim() && v.length) process.env[k.trim()] = v.join("=").trim().replace(/^"(.*)"$/, "$1");
  });
}
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import puppeteer from "puppeteer-core";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const PLACEHOLDER = "https://vienamuebles.com/wp-content/uploads/clientResources/marca-y-producto_no-image.jpg";

// Intenta URLs comunes en el image-cache de Viena con el código del producto
async function probarUrlsViena(codigo: string): Promise<string | null> {
  const variantes = [
    `https://vienamuebles.com/image-cache/images/cached/fotos_${codigo}.jpg`,
    `https://vienamuebles.com/image-cache/images/cached/fotos_${codigo.toUpperCase()}.jpg`,
    `https://vienamuebles.com/image-cache/images/cached/fotos_${codigo.toLowerCase()}.jpg`,
  ];
  for (const url of variantes) {
    try {
      const res = await fetch(url, {
        method: "HEAD",
        headers: { Referer: "https://vienamuebles.com/", "User-Agent": UA },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return url;
    } catch { /* continue */ }
  }
  return null;
}

// Busca en MercadoLibre vía web con Puppeteer
async function imagenDesdeMLWeb(page: any, nombre: string): Promise<string | null> {
  const query = nombre.replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  const url = `https://listado.mercadolibre.com.ar/${encodeURIComponent(query)}`;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForSelector("img", { timeout: 5000 }).catch(() => {});

    const imgUrl: string | null = await page.evaluate(() => {
      const NO_IMG = ["no-image", "placeholder", "default", "blank", "loading"];
      const selectores = [
        ".ui-search-result__image img",
        ".poly-component__picture img",
        ".poly-card__portada img",
        ".andes-card img",
        "article img",
      ];
      for (const sel of selectores) {
        const imgs = Array.from(document.querySelectorAll(sel)) as HTMLImageElement[];
        for (const img of imgs) {
          const src = (img.src || img.dataset?.src || (img as any).dataset?.lazy || "").split("?")[0];
          if (!src || !src.startsWith("http")) continue;
          if (NO_IMG.some(n => src.includes(n))) continue;
          if (src.includes(".jpg") || src.includes(".png") || src.includes(".webp")) return src;
        }
      }
      return null;
    });
    return imgUrl;
  } catch {
    return null;
  }
}

// Extrae el código de producto del nombre (ej: OUTD1481, OUTD9324)
function extraerCodigo(nombre: string): string | null {
  const m = nombre.match(/\b(OUTD\w+|UN-\d+\w*|OTD\w+)\b/i);
  return m ? m[1] : null;
}

async function main() {
  const sinFoto = await prisma.producto.findMany({
    where: { imagen_url: PLACEHOLDER },
    select: { id: true, nombre: true, url_origen: true },
  });

  console.log(`\n== ${sinFoto.length} productos Outdoors sin imagen ==\n`);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--ignore-certificate-errors"],
  });

  let arreglados = 0;

  for (const producto of sinFoto) {
    console.log(`[${producto.id}] ${producto.nombre.slice(0, 60)}`);

    // 1. Intenta con el código de producto en el image-cache de Viena
    const codigo = extraerCodigo(producto.nombre);
    let nuevaUrl: string | null = null;

    if (codigo) {
      nuevaUrl = await probarUrlsViena(codigo);
      if (nuevaUrl) console.log(`  -> Viena URL directa: ${nuevaUrl}`);
    }

    // 2. Busca en MercadoLibre web
    if (!nuevaUrl) {
      const page = await browser.newPage();
      await page.setUserAgent(UA);
      await page.setViewport({ width: 1280, height: 800 });
      console.log(`  -> Buscando en MercadoLibre web...`);
      nuevaUrl = await imagenDesdeMLWeb(page, producto.nombre);
      await page.close();
    }

    // 3. Busca con solo la categoría + marca (más amplio)
    if (!nuevaUrl) {
      const page = await browser.newPage();
      await page.setUserAgent(UA);
      await page.setViewport({ width: 1280, height: 800 });
      const termGenerico = producto.nombre.includes("BOTELLA")
        ? "botella termica outdoors"
        : producto.nombre.includes("MATE MUG")
        ? "mate mug acero inoxidable"
        : "termo outdoors acero inoxidable";
      console.log(`  -> Búsqueda genérica: "${termGenerico}"`);
      nuevaUrl = await imagenDesdeMLWeb(page, termGenerico);
      await page.close();
    }

    if (nuevaUrl) {
      await prisma.producto.update({
        where: { id: producto.id },
        data: { imagen_url: nuevaUrl },
      });
      console.log(`  ✓ ${nuevaUrl.slice(0, 80)}`);
      arreglados++;
    } else {
      console.log(`  ✗ Sin imagen`);
    }

    await new Promise(r => setTimeout(r, 800));
  }

  await browser.close();
  await prisma.$disconnect();
  console.log(`\n== Resueltos: ${arreglados} / ${sinFoto.length} ==`);
}

main().catch(console.error);
