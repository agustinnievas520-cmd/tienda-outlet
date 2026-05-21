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

const prisma = new PrismaClient();
const OUTPUT_DIR = path.resolve("public/imagenes/productos");
const LOGO_PATH = path.resolve("public/logo-marca.svg");
const FINAL = 800;

// Detecta si hay píxeles dorados/amarillos del logo de Viena fuera de la franja inferior
// Color del logo Viena: tonos dorado/ámbar (R alto, G medio, B bajo)
function detectarLogoViena(data: Buffer, width: number, height: number): { x: number, y: number, w: number, h: number } | null {
  // Buscar en la zona SUPERIOR (top 600px) para encontrar logos fuera del parche inferior
  const checkBottom = height - 160; // nuestro parche ya cubre esto
  let minX = width, maxX = 0, minY = height, maxY = 0;
  let count = 0;

  for (let y = 0; y < checkBottom; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      // Dorado/ámbar del logo Viena: R>180, G>100, G<R-40, B<120
      if (r > 170 && g > 90 && g < r - 30 && b < 110 && r > g + 40) {
        count++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Si hay suficientes píxeles dorados agrupados, hay logo
  if (count < 50) return null;

  const logoW = maxX - minX;
  const logoH = maxY - minY;

  // El logo debe ser aproximadamente circular (ancho ≈ alto)
  if (logoW < 20 || logoH < 20) return null;
  if (logoW > 400 || logoH > 400) return null; // demasiado grande, no es logo
  if (Math.abs(logoW - logoH) > logoW * 0.8) return null; // muy rectangular

  // Ampliar el área para cubrir bien
  const padding = 30;
  return {
    x: Math.max(0, minX - padding),
    y: Math.max(0, minY - padding),
    w: Math.min(FINAL - Math.max(0, minX - padding), logoW + padding * 2),
    h: Math.min(FINAL - Math.max(0, minY - padding), logoH + padding * 2),
  };
}

async function procesarImagen(inputPath: string, outputPath: string, id: number): Promise<boolean> {
  // Read into buffer first so Sharp releases the file handle before we overwrite
  const srcBuf = fs.readFileSync(inputPath);
  const { data, info } = await sharp(srcBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const logo = detectarLogoViena(data, info.width, info.height);
  if (!logo) return false;

  // Calcular la posición del parche inferior (que ya tiene nuestro logo)
  const patchH = 160;
  const patchTop = FINAL - patchH;

  // Parche blanco sobre el logo detectado
  const coverPatch = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${logo.w}" height="${logo.h}">
      <rect width="${logo.w}" height="${logo.h}" fill="white"/>
    </svg>`
  );

  // Parche inferior (mantener nuestro logo de Outlet Hogar)
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

  // Escribir a un path temporal en el mismo directorio, luego sobreescribir
  const tmpPath = outputPath.replace(".webp", `_${id}_tmp.webp`);
  await sharp(srcBuf)
    .composite([
      { input: coverPatch, left: logo.x, top: logo.y, blend: "over" },
      { input: whitePatch, left: 0, top: patchTop, blend: "over" },
      { input: logoBuffer, left: logoLeft, top: logoTop, blend: "over" },
    ])
    .webp({ quality: 88 })
    .toFile(tmpPath);

  // Leer el tmp y escribir directamente al destino (evita EPERM por rename)
  const buf = fs.readFileSync(tmpPath);
  fs.writeFileSync(outputPath, buf);
  fs.unlinkSync(tmpPath);
  return true;
}

async function main() {
  // Solo procesar imágenes de productos de Viena
  const productos = await prisma.producto.findMany({
    where: {
      imagen_url: { startsWith: "/" },
      url_origen: { contains: "vienamuebles" },
    },
    select: { id: true, nombre: true },
  });

  console.log(`Analizando ${productos.length} imágenes de Viena...\n`);

  let encontrados = 0, errores = 0;

  for (let i = 0; i < productos.length; i++) {
    const prod = productos[i];
    const imgPath = path.join(OUTPUT_DIR, `${prod.id}.webp`);

    if (!fs.existsSync(imgPath)) continue;

    try {
      const encontrado = await procesarImagen(imgPath, imgPath, prod.id);
      if (encontrado) {
        encontrados++;
        console.log(`✓ Logo tapado [${i + 1}/${productos.length}]: ${prod.nombre.slice(0, 55)}`);
      } else {
        // Sin logo detectable — solo progreso cada 100
        if ((i + 1) % 200 === 0) process.stdout.write(`  Procesados ${i + 1}/${productos.length}...\r`);
      }
    } catch (e: any) {
      errores++;
      console.log(`✗ Error [${prod.id}]: ${e.message?.slice(0, 60)}`);
    }
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`Logos detectados y tapados: ${encontrados} | Errores: ${errores}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
