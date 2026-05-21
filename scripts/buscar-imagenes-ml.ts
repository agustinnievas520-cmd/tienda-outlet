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
  console.log(`Hashes placeholder: ${PLACEHOLDER_HASHES.size}`);
}

function esPlaceholder(id: number): boolean {
  const ruta = path.join(OUTPUT_DIR, `${id}.webp`);
  if (!fs.existsSync(ruta)) return true;
  const h = crypto.createHash("md5").update(fs.readFileSync(ruta)).digest("hex");
  return PLACEHOLDER_HASHES.has(h);
}

// ── Construir query inteligente ────────────────────────────
function construirQuery(nombre: string): string {
  return nombre
    // Reemplazar separadores
    .replace(/[/\\+&]/g, " ")
    .replace(/["""″]/g, " ")
    // Quitar códigos técnicos puros tipo "DLD03PCGS", "OUTD1481", "KSO", "RPM"
    .replace(/\b[A-Z]{1,4}[A-Z0-9]{4,}\b/g, " ")
    // Quitar dimensiones tipo "113.5X190X53", "130X85", "180X61.5"
    .replace(/[\d.,]+[Xx][\d.,]+([Xx][\d.,]+)?/gi, " ")
    // Quitar números de serie largos sueltos
    .replace(/\b\d{5,}\b/g, " ")
    // Quitar abreviaturas de colores/materiales al final
    .replace(/\b(BCO|NBN|RNB|GRS|NEG|BLN|NVD|PCG|SOMB|FRESNO|NEVADA|PINO|CASCINA)\b/gi, " ")
    // Quitar texto técnico de modelos Viena
    .replace(/\b(CSTG|LFDR|ELAC|ELAF|MSNIC|MDRT|MDRT|EEPE|ESEB|WBCAW|WBCNW)\b/gi, " ")
    // Quitar número de cuotas/piezas cuando está solo
    .replace(/\b\d{1,2}P\b/g, " ")
    // Reducir espacios
    .replace(/\s+/g, " ")
    .trim()
    // Tomar solo las primeras palabras significativas (máx 60 chars)
    .split(" ").filter(w => w.length > 1).slice(0, 6).join(" ")
    .slice(0, 60);
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

// ── Procesar imagen ────────────────────────────────────────
async function procesarImagen(srcBuffer: Buffer, outPath: string): Promise<void> {
  await sharp(srcBuffer)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .resize(FINAL, FINAL, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
    .webp({ quality: 88 })
    .toFile(outPath);
}

// ── Main ───────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  calcularHashesPlaceholder();

  const todos = await prisma.producto.findMany({ select: { id: true, nombre: true } });
  const conPlaceholder = todos.filter(p => esPlaceholder(p.id));
  console.log(`\nProductos con imagen placeholder: ${conPlaceholder.length}\n`);

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
    const query = construirQuery(prod.nombre);

    try {
      const mlUrl = `https://listado.mercadolibre.com.ar/${encodeURIComponent(query.replace(/\s+/g, "-"))}`;
      await page.goto(mlUrl, { waitUntil: "networkidle2", timeout: 25000 });
      await new Promise(r => setTimeout(r, 1500));

      // Obtener la primera imagen del primer resultado (clase poly-component__picture)
      const imgUrl = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll("img"));
        for (const img of imgs) {
          const src = (img as HTMLImageElement).src || "";
          const cls = (img as HTMLImageElement).className || "";
          if (
            src.includes("mlstatic.com") &&
            !cls.includes("image-option") &&
            !src.includes("logo")
          ) {
            // Convertir a imagen grande (-E.webp o -O.jpg)
            return src
              .replace(/-[A-Z]\.jpg$/, "-O.jpg")
              .replace("-I.jpg", "-O.jpg");
          }
        }
        return null;
      });

      if (!imgUrl) {
        console.log(`✗ ${idx} Sin imagen ML: ${prod.nombre.slice(0, 55)}`);
        sinImagen++;
        continue;
      }

      const buf = await descargarBuffer(imgUrl);
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
