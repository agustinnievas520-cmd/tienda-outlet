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

// ── Queries manuales para los productos problemáticos ──────
const QUERIES: Record<number, string> = {
  // Termos / mates / jarros OUTDOORS
  95:  "botella termica outdoors 750ml retro",
  96:  "botella termica outdoors 750ml negra",
  1306: "jarro outdoors tumbler 600ml",
  1308: "mate mug outdoors 192ml azul",
  1309: "mate mug outdoors 192ml verde",
  1310: "mate mug outdoors 192ml rosa",
  1429: "termo outdoors 750ml negro",
  1430: "termo outdoors 750ml verde",
  1431: "termo outdoors 750ml azul",
  1432: "termo outdoors 1 litro blanco",
  1433: "termo outdoors 1 litro negro",
  1434: "termo outdoors clasico 1 litro azul",
  1435: "termo outdoors clasico 1 litro verde",
  1436: "termo outdoors 1.4 litros verde",
  // Muebles DELOS / Ricchezze (marcas exclusivas Viena)
  229: "comoda 1 cajon 2 puertas pino gris",
  230: "comoda 1 cajon 2 puertas roble",
  234: "comoda 4 cajones pino gris",
  295: "mesa de luz 2 cajones roble",
  380: "placard 2 puertas corredizas 1.80 pino",
  381: "placard 4 puertas 4 cajones espejo pino blanco",
  386: "placard 2 puertas blanco",
  387: "placard 2 puertas corredizas blanco",
  388: "placard 2 puertas corredizas blanco frizze",
  389: "placard 3 puertas corredizas blanco 170",
  390: "placard 3 puertas 2 cajones fresno blanco",
  391: "placard 3 puertas 2 cajones nevada",
  392: "placard 4 puertas 2 cajones blanco",
  393: "placard 4 puertas 2 cajones blanco frizze",
  394: "placard 4 puertas 2 cajones nevada",
  395: "placard alto 2 puertas corredizas 220 fresno blanco",
  396: "placard alto 2 puertas corredizas 220 blanco",
  404: "rack tv varillado roble nogal",
  405: "rack tv varillado 65 pulgadas",
  406: "rack tv 55 pulgadas 1 puerta",
  407: "rack tv 55 pulgadas 1 puerta",
  272: "futon mariani 3 cuerpos colchon",
  277: "juego comedor mesa 4 sillas negro",
  // Electro
  661: "calefon orbis digital 315 gas natural",
  662: "calefon orbis digital 315 gas envasado",
  663: "calefon orbis digital 320 gas natural 20 litros",
  664: "calefon orbis digital 320 gas envasado 20 litros",
  748: "heladera briket 325 litros no frost 2 puertas gris",
  797: "horno electrico lusqtoff 45 litros crema",
  798: "horno electrico lusqtoff 65 litros crema conveccion",
  799: "horno electrico lusqtoff 85 litros crema conveccion",
  824: "kit disco tromen 42 cm enlozado",
  827: "lavarropas candy 7kg carga superior 1400rpm",
  954: "televisor noblex 55 4k smart google tv",
  957: "televisor philips 32 smart hd",
  958: "televisor philips 43 smart full hd",
  966: "televisor rca 50 smart full hd",
  985: "parlante kioto 60w 8 pulgadas bluetooth",
  1035: "radio portatil",
  117: "bicicleta fija magnetica",
  1587: "coche per bambini calypso travel system",
  1661: "freidora electrica 12 litros acero inoxidable",
};

// ── Placeholder detection ──────────────────────────────────
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

// ── Procesar imagen ────────────────────────────────────────
async function procesarImagen(srcBuffer: Buffer, outPath: string): Promise<void> {
  await sharp(srcBuffer)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .resize(FINAL, FINAL, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
    .webp({ quality: 88 })
    .toFile(outPath);
}

// ── Buscar imagen en ML ────────────────────────────────────
async function buscarEnML(browser: any, query: string): Promise<string | null> {
  const mlUrl = `https://listado.mercadolibre.com.ar/${query.replace(/\s+/g, "-")}`;

  // Página fresca por cada búsqueda para evitar captcha acumulado
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });
  await page.setViewport({ width: 1366, height: 768 });
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

  try {
    await page.goto(mlUrl, { waitUntil: "networkidle2", timeout: 25000 });
    // Check if we hit a captcha
    const finalUrl = page.url();
    if (finalUrl.includes("captcha")) {
      await page.close();
      return null;
    }
    await new Promise(r => setTimeout(r, 2000));

    const imgUrl = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll("img"));
      for (const img of imgs) {
        const src = (img as HTMLImageElement).src || "";
        if (src.includes("mlstatic.com") && src.length > 40 && !src.includes("logo")) {
          return src;
        }
      }
      return null;
    });

    await page.close();
    return imgUrl;
  } catch (e) {
    await page.close();
    return null;
  }
}

// ── Main ───────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  calcularHashesPlaceholder();

  const todos = await prisma.producto.findMany({ select: { id: true, nombre: true } });
  const conPlaceholder = todos.filter(p => esPlaceholder(p.id));
  console.log(`Productos con imagen placeholder: ${conPlaceholder.length}\n`);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: detectarChrome(),
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--window-size=1366,768",
    ],
  });

  // Anti-detección global
  const context = browser.defaultBrowserContext();
  const page = await context.newPage();
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });
  await page.setViewport({ width: 1366, height: 768 });
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

  let ok = 0, sinImagen = 0;

  for (let i = 0; i < conPlaceholder.length; i++) {
    const prod = conPlaceholder[i];
    const idx = `[${i + 1}/${conPlaceholder.length}]`;
    const query = QUERIES[prod.id];

    if (!query) {
      console.log(`✗ ${idx} Sin query definido: ${prod.nombre.slice(0, 55)}`);
      sinImagen++;
      continue;
    }

    try {
      const imgUrl = await buscarEnML(browser, query);

      if (!imgUrl) {
        console.log(`✗ ${idx} Sin imagen ML (${query}): ${prod.nombre.slice(0, 40)}`);
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
