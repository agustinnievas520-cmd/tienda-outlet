// SSL workaround
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

import { PrismaClient } from "@prisma/client";
import sharp from "sharp";

const prisma     = new PrismaClient();
const LOGO_PATH  = path.resolve("public/logo-marca.svg"); // versión clara, blanca
const OUTPUT_DIR = path.resolve("public/imagenes/productos");
const FINAL      = 800;

// ──────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function descargar(url: string): Promise<Buffer> {
  const isML = url.includes("mlstatic.com");
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Referer: isML ? "https://www.mercadolibre.com.ar/" : "https://vienamuebles.com/",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function procesarImagen(srcBuffer: Buffer, esViena: boolean, outPath: string) {
  // 1. Resize a 800×800 contain, fondo blanco
  const base = await sharp(srcBuffer)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .resize(FINAL, FINAL, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255 },
    })
    .png()
    .toBuffer();

  if (!esViena) {
    // Imágenes de ML: limpias, solo guardar
    await sharp(base).webp({ quality: 88 }).toFile(outPath);
    return;
  }

  // 2. Viena: tapar logo del proveedor con franja blanca FULL-WIDTH + nuestro logo
  //    Franja de 800×160 px en el borde inferior cubre el logo de Viena
  //    sin importar en qué posición esté. Nuestro logo va centrado en la franja.

  const patchH   = 160;
  const patchTop = FINAL - patchH; // 640

  const whitePatch = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${FINAL}" height="${patchH}">
      <rect width="${FINAL}" height="${patchH}" fill="white"/>
    </svg>`
  );

  const logoSize = 130;
  const logoLeft = Math.round((FINAL - logoSize) / 2);
  const logoTop  = patchTop + Math.round((patchH - logoSize) / 2);

  const logoBuffer = await sharp(LOGO_PATH)
    .resize(logoSize, logoSize, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp(base)
    .composite([
      { input: whitePatch, left: 0,        top: patchTop, blend: "over" },
      { input: logoBuffer, left: logoLeft, top: logoTop,  blend: "over" },
    ])
    .webp({ quality: 88 })
    .toFile(outPath);
}

// ──────────────────────────────────────────────────────────

async function main() {
  const inicio = Date.now();

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  if (!fs.existsSync(LOGO_PATH)) {
    console.error(`✗ Logo no encontrado: ${LOGO_PATH}`);
    process.exit(1);
  }

  // Solo procesar productos con imagen REMOTA (recuperadas por recuperar-imagenes.ts)
  const productos = await prisma.producto.findMany({
    where:   { imagen_url: { startsWith: "http" } },
    orderBy: { id: "asc" },
  });

  const total = productos.length;
  console.log(`\n== ${total} productos con imagen remota → procesando ==\n`);

  let ok = 0, errores = 0;

  for (let i = 0; i < total; i++) {
    const p        = productos[i];
    const outPath  = path.join(OUTPUT_DIR, `${p.id}.webp`);
    const localUrl = `/imagenes/productos/${p.id}.webp`;
    const idx      = `[${i + 1}/${total}]`;
    const nombre   = p.nombre.slice(0, 55);

    const esViena = p.url_origen
      ? p.url_origen.includes("vienamuebles")
      : !p.imagen_url.includes("mlstatic");

    try {
      const buffer = await descargar(p.imagen_url);
      await procesarImagen(buffer, esViena, outPath);
      await prisma.producto.update({ where: { id: p.id }, data: { imagen_url: localUrl } });
      ok++;
      if (ok % 50 === 0 || i < 3) console.log(`✓ ${idx} ${nombre}`);
      else process.stdout.write(`✓ ${idx} ${nombre.slice(0, 40)}\r`);
    } catch (err: any) {
      errores++;
      console.log(`✗ ${idx} ${nombre} — ${err.message}`);
    }
  }

  const t = ((Date.now() - inicio) / 1000).toFixed(1);
  console.log(`\n${"─".repeat(60)}`);
  console.log(`OK: ${ok} | Errores: ${errores} | ${t}s`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
