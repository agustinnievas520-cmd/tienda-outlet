process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import * as fs from "fs";
import * as path from "path";
const envPath = path.resolve(".env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath,"utf-8").split("\n").forEach(line => {
    const m = line.match(/^([^=]+)="?([^"\n]*)"?/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
}

import puppeteer from "puppeteer-core";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const RUTAS_CHROME = [
  `C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe`,
  `C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe`,
  `C:\\Users\\${process.env.USERNAME}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
];

function detectarChrome() {
  for (const r of RUTAS_CHROME) if (fs.existsSync(r)) return r;
  throw new Error("Chrome no encontrado");
}

// Posibles URLs de la categoría lavarropas en Viena
const URLS_A_PROBAR = [
  "https://vienamuebles.com/product-category/lavarropas/",
  "https://vienamuebles.com/product-category/electrodomesticos/lavarropas/",
  "https://vienamuebles.com/product-category/cocina-y-lavado/lavarropas/",
];

async function main() {
  // Lavarropas en DB
  const enDB = await prisma.producto.findMany({
    where: { nombre: { contains: "lavarrop" } },
    select: { nombre: true, url_origen: true }
  });
  console.log(`\nEn nuestra DB: ${enDB.length} lavarropas`);
  enDB.forEach(p => console.log(" ·", p.nombre));

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: detectarChrome(),
    args: ["--no-sandbox","--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

  console.log("\n== Buscando en Viena ==");

  for (const url of URLS_A_PROBAR) {
    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });
      const total = await page.evaluate(() => {
        const t = document.querySelector(".woocommerce-result-count")?.textContent || "";
        const m = t.match(/de\s+([\d.]+)\s+resultado/);
        return m ? parseInt(m[1].replace(/\./g,""),10) : null;
      });

      if (total === null) { console.log(`  ${url} → no existe`); continue; }

      console.log(`\n✓ Encontrada: ${url}`);
      console.log(`  Total en Viena: ${total} lavarropas`);

      // Listar los productos de Viena
      const totalPags = Math.ceil(total / 12);
      const vienaProductos: string[] = [];

      for (let p = 1; p <= totalPags; p++) {
        if (p > 1) await page.goto(`${url}page/${p}/`, { waitUntil: "networkidle2", timeout: 20000 });
        const items = await page.evaluate(() => {
          return Array.from(document.querySelectorAll("li.product h3")).map(h => h.textContent?.trim() || "");
        });
        vienaProductos.push(...items);
      }

      const nombresDB = new Set(enDB.map(p => p.nombre.toLowerCase().trim()));
      const faltantes = vienaProductos.filter(n => !nombresDB.has(n.toLowerCase().trim()));

      console.log(`\n  En Viena: ${vienaProductos.length} | En DB: ${enDB.length} | Faltantes: ${faltantes.length}`);
      if (faltantes.length > 0) {
        console.log("\n  === FALTAN EN NUESTRA DB ===");
        faltantes.forEach(n => console.log("  -", n));
      } else {
        console.log("  ✓ Todos los lavarropas de Viena están en nuestra DB");
      }
      break;
    } catch (e: any) {
      console.log(`  ${url} → error: ${e.message}`);
    }
  }

  await browser.close();
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
