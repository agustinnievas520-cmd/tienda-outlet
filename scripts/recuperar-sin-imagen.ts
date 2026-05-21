process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import * as fs from "fs";
import * as path from "path";
const envPath = path.resolve(".env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf-8").split("\n").forEach(line => {
    const m = line.match(/^([^=]+)="?([^"\n]*)"?/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
}

import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import crypto from "crypto";
import https from "https";
import http from "http";
import puppeteer from "puppeteer-core";

const prisma = new PrismaClient();
const OUTPUT_DIR = path.resolve("public/imagenes/productos");
const LOGO_PATH = path.resolve("public/logo-marca.svg");
const FINAL = 800;

const RUTAS_CHROME = [
  `C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe`,
  `C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe`,
  `C:\\Users\\${process.env.USERNAME}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
];
function detectarChrome() {
  for (const r of RUTAS_CHROME) if (fs.existsSync(r)) return r;
  throw new Error("Chrome no encontrado");
}

// ── Detectar placeholders ──────────────────────────────────
const PLACEHOLDER_HASHES = new Set<string>();

function calcularHashesPlaceholder(): void {
  const files = fs.readdirSync(OUTPUT_DIR);
  const conteo: Record<string, number[]> = {};
  for (const f of files) {
    const buf = fs.readFileSync(path.join(OUTPUT_DIR, f));
    const h = crypto.createHash("md5").update(buf).digest("hex");
    const id = parseInt(f.replace(".webp", ""));
    conteo[h] = conteo[h] || [];
    conteo[h].push(id);
  }
  for (const [h, ids] of Object.entries(conteo)) {
    if (ids.length > 3) PLACEHOLDER_HASHES.add(h);
  }
}

function esPlaceholder(id: number): boolean {
  const ruta = path.join(OUTPUT_DIR, `${id}.webp`);
  if (!fs.existsSync(ruta)) return true;
  const h = crypto.createHash("md5").update(fs.readFileSync(ruta)).digest("hex");
  return PLACEHOLDER_HASHES.has(h);
}

// ── Descargar imagen ───────────────────────────────────────
function descargarBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const agent = new (mod === https ? https : http).Agent({ rejectUnauthorized: false });
    (mod as any).get(url, { agent }, (res: any) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return descargarBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

// ── Procesar imagen con franja blanca + logo ───────────────
async function procesarImagen(srcBuffer: Buffer, outPath: string): Promise<void> {
  const base = await sharp(srcBuffer)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .resize(FINAL, FINAL, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
    .png().toBuffer();

  const patchH = 160;
  const patchTop = FINAL - patchH;
  const whitePatch = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${FINAL}" height="${patchH}">
      <rect width="${FINAL}" height="${patchH}" fill="white"/>
    </svg>`
  );
  const logoSize = 130;
  const logoLeft = Math.round((FINAL - logoSize) / 2);
  const logoTop = patchTop + Math.round((patchH - logoSize) / 2);
  const logoBuffer = await sharp(LOGO_PATH)
    .resize(logoSize, logoSize, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png().toBuffer();

  await sharp(base)
    .composite([
      { input: whitePatch, left: 0, top: patchTop, blend: "over" },
      { input: logoBuffer, left: logoLeft, top: logoTop, blend: "over" },
    ])
    .webp({ quality: 88 })
    .toFile(outPath);
}

// ── Main ───────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  calcularHashesPlaceholder();

  const todos = await prisma.producto.findMany({
    select: { id: true, nombre: true, url_origen: true }
  });
  const conPlaceholder = todos.filter(p => esPlaceholder(p.id));
  console.log(`Placeholders detectados: ${PLACEHOLDER_HASHES.size}`);
  console.log(`Productos con imagen placeholder: ${conPlaceholder.length}\n`);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: detectarChrome(),
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

  let ok = 0, sinImagen = 0;

  for (let i = 0; i < conPlaceholder.length; i++) {
    const prod = conPlaceholder[i];
    const idx = `[${i + 1}/${conPlaceholder.length}]`;

    if (!prod.url_origen || !prod.url_origen.includes("vienamuebles")) {
      console.log(`✗ ${idx} Sin url_origen Viena: ${prod.nombre.slice(0, 55)}`);
      sinImagen++;
      continue;
    }

    try {
      await page.goto(prod.url_origen, { waitUntil: "domcontentloaded", timeout: 20000 });
      await new Promise(r => setTimeout(r, 1000));

      // Buscar imagen principal del producto en la galería de Woocommerce
      const imgUrl = await page.evaluate(() => {
        // Imagen principal de la galería
        const galeriaImg = document.querySelector(
          ".woocommerce-product-gallery__image img, .product-gallery img, .wp-post-image"
        ) as HTMLImageElement;
        if (galeriaImg) {
          return galeriaImg.getAttribute("data-large_image") ||
                 galeriaImg.getAttribute("data-src") ||
                 galeriaImg.src || null;
        }
        // Fallback: og:image
        const ogImg = document.querySelector('meta[property="og:image"]') as HTMLMetaElement;
        if (ogImg) return ogImg.content;
        return null;
      });

      if (!imgUrl || imgUrl.includes("placeholder") || imgUrl.includes("woocommerce-placeholder")) {
        console.log(`✗ ${idx} Viena sin imagen real: ${prod.nombre.slice(0, 55)}`);
        sinImagen++;
        continue;
      }

      // Asegurar URL absoluta
      const absUrl = imgUrl.startsWith("http") ? imgUrl : `https://vienamuebles.com${imgUrl}`;

      const buf = await descargarBuffer(absUrl);
      const outPath = path.join(OUTPUT_DIR, `${prod.id}.webp`);
      await procesarImagen(buf, outPath);
      await prisma.producto.update({
        where: { id: prod.id },
        data: { imagen_url: `/imagenes/productos/${prod.id}.webp` }
      });
      ok++;
      console.log(`✓ ${idx} ${prod.nombre.slice(0, 55)}`);

    } catch (e: any) {
      console.log(`✗ ${idx} Error: ${prod.nombre.slice(0, 40)} — ${e.message?.slice(0, 60)}`);
      sinImagen++;
    }
  }

  await browser.close();
  console.log(`\n${"─".repeat(60)}`);
  console.log(`OK: ${ok} | Sin imagen: ${sinImagen}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
