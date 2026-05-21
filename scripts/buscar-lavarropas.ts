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

async function main() {
  const enDB = await prisma.producto.findMany({
    where: { nombre: { contains: "lavarrop" } },
    select: { nombre: true, url_origen: true }
  });
  console.log(`En nuestra DB: ${enDB.length} lavarropas`);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: detectarChrome(),
    args: ["--no-sandbox","--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

  // Buscar en Viena
  await page.goto("https://vienamuebles.com/?s=lavarrop&post_type=product", { waitUntil: "networkidle2", timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  const { total, items } = await page.evaluate(() => {
    const t = document.querySelector(".woocommerce-result-count")?.textContent || "";
    const m = t.match(/de\s+([\d.]+)\s+resultado/);
    const total = m ? parseInt(m[1].replace(/\./g,""),10) : 0;
    const items = Array.from(document.querySelectorAll("li.product")).map(el => ({
      nombre: el.querySelector("h3")?.textContent?.trim() || "",
      url: Array.from(el.querySelectorAll("a")).find((a: any) => a.href?.includes("/productos/"))?.href || "",
    })).filter(i => i.nombre);
    return { total, items };
  });

  console.log(`En Viena (búsqueda): ${total} → página 1 muestra ${items.length}`);

  // Paginar si hay más
  const allItems = [...items];
  const totalPags = Math.ceil(total / 12);
  for (let p = 2; p <= totalPags; p++) {
    await page.goto(`https://vienamuebles.com/page/${p}/?s=lavarrop&post_type=product`, { waitUntil: "networkidle2", timeout: 20000 });
    const more = await page.evaluate(() =>
      Array.from(document.querySelectorAll("li.product")).map(el => ({
        nombre: el.querySelector("h3")?.textContent?.trim() || "",
        url: Array.from(el.querySelectorAll("a")).find((a: any) => a.href?.includes("/productos/"))?.href || "",
      })).filter(i => i.nombre)
    );
    allItems.push(...more);
  }

  console.log(`\nTotal encontrados en Viena: ${allItems.length}`);

  const urlsDB = new Set(enDB.map(p => p.url_origen?.replace(/\/$/, "").toLowerCase()));
  const nombresDB = new Set(enDB.map(p => p.nombre.toLowerCase().trim()));

  const faltantes = allItems.filter(v =>
    !urlsDB.has(v.url.replace(/\/$/, "").toLowerCase()) &&
    !nombresDB.has(v.nombre.toLowerCase().trim())
  );

  console.log(`\nFaltantes en nuestra DB: ${faltantes.length}`);
  faltantes.forEach(f => console.log(` - ${f.nombre}`));
  console.log("\nYa tenemos:");
  allItems.filter(v => !faltantes.includes(v)).forEach(f => console.log(` ✓ ${f.nombre}`));

  await browser.close();
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
