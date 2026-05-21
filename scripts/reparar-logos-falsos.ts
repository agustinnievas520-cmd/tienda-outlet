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
import https from "https";
import http from "http";

const prisma = new PrismaClient();
const OUTPUT_DIR = path.resolve("public/imagenes/productos");
const LOGO_PATH = path.resolve("public/logo-marca.svg");
const FINAL = 800;

// IDs afectados por el script anterior (con detección demasiado laxa)
const AFFECTED_IDS = new Set([9,23,32,38,66,68,75,90,93,94,105,109,110,111,114,121,132,146,153,158,174,185,209,218,219,231,257,266,270,298,303,310,344,415,418,423,424,431,432,438,445,456,459,466,473,477,513,519,520,530,538,541,543,545,548,551,552,556,560,594,597,599,603,606,611,618,621,622,631,632,634,639,652,709,735,739,761,765,811,821,853,864,891,893,894,895,896,897,898,899,903,905,911,912,926,927,929,932,933,934,935,936,937,938,939,960,961,962,967,977,981,984,998,1014,1017,1037,1055,1056,1059,1065,1074,1078,1087,1089,1090,1099,1102,1119,1129,1136,1141,1160,1179,1183,1185,1208,1276,1295,1300,1313,1326,1348,1349,1378,1417,1422,1439,1440,1441,1443,1444,1461,1479,1559,1573,1583,1590,1593,1595,1604,1662,1665]);

function descargarBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const agent = new (https.Agent as any)({ rejectUnauthorized: false });
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

// Extrae URL de imagen del HTML de la página Viena
function extraerImagenUrl(html: string): string | null {
  // Patrón: src="/image-cache/images/cached/fotos_XXXXX.jpg..."
  const m = html.match(/src="(\/image-cache\/images\/cached\/[^?"]+\.(?:jpg|jpeg|png|webp))/i);
  if (m) return "https://vienamuebles.com" + m[1];
  return null;
}

async function fetchVienaPageHtml(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const agent = new (https.Agent as any)({ rejectUnauthorized: false });
    https.get(url, { agent, headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } }, (res: any) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchVienaPageHtml(res.headers.location).then(resolve).catch(reject);
      }
      let data = "";
      res.on("data", (c: Buffer) => data += c.toString());
      res.on("end", () => resolve(data));
      res.on("error", reject);
    }).on("error", reject);
  });
}

// Detección de logo Viena MEJORADA — mucho más estricta para evitar falsos positivos
function detectarLogoViena(data: Buffer, width: number, height: number): { x: number, y: number, w: number, h: number } | null {
  const checkBottom = height - 160;
  let minX = width, maxX = 0, minY = height, maxY = 0;
  let count = 0;

  for (let y = 0; y < checkBottom; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      if (r > 170 && g > 90 && g < r - 30 && b < 110 && r > g + 40) {
        count++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Umbral más alto
  if (count < 150) return null;

  const logoW = maxX - minX;
  const logoH = maxY - minY;

  // Tamaño estricto: entre 30 y 200px
  if (logoW < 30 || logoH < 30) return null;
  if (logoW > 200 || logoH > 200) return null;

  // Centralidad: el centro del logo debe estar en el 20%-80% del ancho y 10%-75% del alto
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  if (centerX < width * 0.20 || centerX > width * 0.80) return null;
  if (centerY < height * 0.10 || centerY > height * 0.75) return null;

  // Circularidad estricta: ancho y alto deben ser similares
  if (Math.abs(logoW - logoH) > Math.max(logoW, logoH) * 0.4) return null;

  // Densidad: al menos 15% del bounding box debe ser dorado
  const density = count / (logoW * logoH);
  if (density < 0.15) return null;

  const padding = 30;
  return {
    x: Math.max(0, minX - padding),
    y: Math.max(0, minY - padding),
    w: Math.min(FINAL - Math.max(0, minX - padding), logoW + padding * 2),
    h: Math.min(FINAL - Math.max(0, minY - padding), logoH + padding * 2),
  };
}

async function procesarImagen(srcBuffer: Buffer, outputPath: string, id: number): Promise<string> {
  // 1. Aplicar parche inferior (siempre)
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

  // Imagen base redimensionada con fondo blanco y parche inferior
  const baseBuffer = await sharp(srcBuffer)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .resize(FINAL, FINAL, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
    .composite([
      { input: whitePatch, left: 0, top: patchTop, blend: "over" },
      { input: logoBuffer, left: logoLeft, top: logoTop, blend: "over" },
    ])
    .webp({ quality: 88 })
    .toBuffer();

  // 2. Detectar logo Viena en la imagen ya con parche inferior (para no detectar nuestro logo)
  const { data, info } = await sharp(baseBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const logo = detectarLogoViena(data, info.width, info.height);

  const tmpPath = outputPath.replace(".webp", `_${id}_tmp.webp`);

  if (logo) {
    // Aplicar parche adicional sobre el logo Viena detectado
    const coverPatch = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${logo.w}" height="${logo.h}">
        <rect width="${logo.w}" height="${logo.h}" fill="white"/>
      </svg>`
    );
    await sharp(baseBuffer)
      .composite([{ input: coverPatch, left: logo.x, top: logo.y, blend: "over" }])
      .webp({ quality: 88 })
      .toFile(tmpPath);
  } else {
    await sharp(baseBuffer).toFile(tmpPath);
  }

  const buf = fs.readFileSync(tmpPath);
  fs.writeFileSync(outputPath, buf);
  fs.unlinkSync(tmpPath);
  return logo ? "logo_cubierto" : "ok";
}

async function main() {
  const productos = await prisma.producto.findMany({
    where: { id: { in: [...AFFECTED_IDS] }, url_origen: { contains: "vienamuebles" } },
    select: { id: true, nombre: true, url_origen: true },
    orderBy: { id: "asc" },
  });

  console.log(`Re-procesando ${productos.length} productos...\n`);
  let ok = 0, logosTapados = 0, errores = 0;

  for (let i = 0; i < productos.length; i++) {
    const prod = productos[i];
    const outputPath = path.join(OUTPUT_DIR, `${prod.id}.webp`);
    const idx = `[${i + 1}/${productos.length}]`;

    try {
      const html = await fetchVienaPageHtml(prod.url_origen);
      const imgUrl = extraerImagenUrl(html);

      if (!imgUrl) {
        console.log(`✗ ${idx} Sin imagen en Viena: ${prod.nombre.slice(0, 55)}`);
        errores++;
        continue;
      }

      const srcBuffer = await descargarBuffer(imgUrl);
      const resultado = await procesarImagen(srcBuffer, outputPath, prod.id);

      ok++;
      if (resultado === "logo_cubierto") {
        logosTapados++;
        console.log(`✓ ${idx} Logo tapado: ${prod.nombre.slice(0, 55)}`);
      } else {
        if ((i + 1) % 20 === 0) process.stdout.write(`  Procesados ${i + 1}/${productos.length}...\r`);
      }

    } catch (e: any) {
      errores++;
      console.log(`✗ ${idx} Error [${prod.id}]: ${e.message?.slice(0, 60)}`);
    }
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`OK: ${ok} | Logos tapados: ${logosTapados} | Errores: ${errores}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
