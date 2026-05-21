// Recupera las URLs originales de imagen scrapeando Viena por categoría,
// actualiza imagen_url en la DB y elimina los .webp locales obsoletos.
// Correr ANTES de aplicar-logo.ts para tener fuente limpia.

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import * as fs from "fs";
import * as path from "path";

const envPath = path.resolve(".env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf-8")
    .split("\n")
    .forEach((line) => {
      const m = line.match(/^([^=]+)="?([^"\n]*)"?/);
      if (m) process.env[m[1].trim()] = m[2].trim();
    });
}

import puppeteer, { Browser, Page } from "puppeteer-core";
import { PrismaClient } from "@prisma/client";

const prisma     = new PrismaClient();
const OUTPUT_DIR = path.resolve("public/imagenes/productos");
const DELAY_MS   = 1000;

const RUTAS_CHROME = [
  `C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe`,
  `C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe`,
  `C:\\Users\\${process.env.USERNAME}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
];

const CATEGORIAS = [
  "https://vienamuebles.com/product-category/muebles/",
  "https://vienamuebles.com/product-category/electrodomesticos/",
  "https://vienamuebles.com/product-category/cocina-y-lavado/",
  "https://vienamuebles.com/product-category/smart-tv/",
  "https://vienamuebles.com/product-category/audio-video-y-accesorios/",
  "https://vienamuebles.com/product-category/climatizacion/",
  "https://vienamuebles.com/product-category/colchones-y-sommiers/",
  "https://vienamuebles.com/product-category/hogar-y-jardin/",
  "https://vienamuebles.com/product-category/informatica-y-celulares/",
  "https://vienamuebles.com/product-category/deporte-y-tiempo-libre/",
  "https://vienamuebles.com/product-category/salud-cuidado-pers-y-fitness/",
  "https://vienamuebles.com/product-category/juguetes-e-infantiles/",
  "https://vienamuebles.com/product-category/comercial-y-gastronomico/",
];

function detectarChrome(): string {
  for (const r of RUTAS_CHROME) {
    if (fs.existsSync(r)) return r;
  }
  throw new Error("Chrome no encontrado en rutas conocidas.");
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function leerTotalPaginas(page: Page): Promise<number> {
  return page.evaluate(() => {
    const texto = document.querySelector(".woocommerce-result-count")?.textContent || "";
    const m = texto.match(/de\s+([\d.]+)\s+resultado/);
    const total = m ? parseInt(m[1].replace(/\./g, ""), 10) : 0;
    return total > 0 ? Math.ceil(total / 12) : 1;
  });
}

async function extraerUrls(page: Page): Promise<{ url_origen: string; imagen_url: string }[]> {
  return page.evaluate(() => {
    const resultado: { url_origen: string; imagen_url: string }[] = [];
    document.querySelectorAll("li.product").forEach((item) => {
      let url_origen = "";
      item.querySelectorAll("a").forEach((a) => {
        const h = (a as HTMLAnchorElement).href;
        if (h.includes("/productos/") && !url_origen) url_origen = h;
      });
      const imgEl = item.querySelector("img") as HTMLImageElement | null;
      // Preferir data-src (lazy) sobre src
      const imagen_url = (imgEl?.getAttribute("data-src") || imgEl?.src || "").split("?")[0];
      if (url_origen && imagen_url.startsWith("http")) {
        resultado.push({ url_origen, imagen_url });
      }
    });
    return resultado;
  });
}

async function main() {
  console.log("\n== Recuperando URLs de imagen desde Viena ==\n");

  let browser: Browser | null = null;
  let actualizados = 0;
  let noEncontrados = 0;

  // Cargar todos los productos de la DB (url_origen → id)
  const todos = await prisma.producto.findMany({ select: { id: true, url_origen: true, imagen_url: true } });
  const mapaUrl = new Map<string, number>();
  for (const p of todos) {
    if (p.url_origen) {
      // Normalizar: sin trailing slash
      const key = p.url_origen.replace(/\/$/, "");
      mapaUrl.set(key, p.id);
    }
  }
  console.log(`${todos.length} productos en DB, ${mapaUrl.size} con url_origen\n`);

  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: detectarChrome(),
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
    await page.setViewport({ width: 1280, height: 800 });

    for (const catUrl of CATEGORIAS) {
      console.log(`\n📂 ${catUrl.split("/").slice(-2, -1)[0]}`);

      try {
        await page.goto(catUrl, { waitUntil: "networkidle2", timeout: 30000 });
        await sleep(DELAY_MS);

        const totalPaginas = await leerTotalPaginas(page);
        console.log(`   ${totalPaginas} página(s)`);

        for (let p = 1; p <= totalPaginas; p++) {
          if (p > 1) {
            await page.goto(`${catUrl}page/${p}/`, { waitUntil: "networkidle2", timeout: 30000 });
            await sleep(DELAY_MS);
          }

          const items = await extraerUrls(page);
          console.log(`   Pág ${p}: ${items.length} productos`);

          for (const item of items) {
            const key = item.url_origen.replace(/\/$/, "");
            const id  = mapaUrl.get(key);
            if (!id) { noEncontrados++; continue; }

            // Eliminar .webp local obsoleto
            const webpPath = path.join(OUTPUT_DIR, `${id}.webp`);
            if (fs.existsSync(webpPath)) fs.unlinkSync(webpPath);

            // Actualizar DB con la URL remota original
            await prisma.producto.update({
              where: { id },
              data:  { imagen_url: item.imagen_url },
            });
            actualizados++;
          }
        }
      } catch (e: any) {
        console.log(`   ✗ Error en categoría: ${e.message}`);
      }
    }
  } finally {
    await browser?.close();
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Actualizados: ${actualizados} | No encontrados: ${noEncontrados}`);
  console.log(`\nAhora corré: npm run logo\n`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
