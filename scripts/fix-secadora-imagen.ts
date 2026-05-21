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

import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import https from "https";
import http from "http";

const prisma = new PrismaClient();
const OUTPUT_DIR = path.resolve("public/imagenes/productos");
const LOGO_PATH = path.resolve("public/logo-marca.svg");
const FINAL = 800;

function descargar(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const agent = new (require(url.startsWith("https") ? "https" : "http").Agent)({ rejectUnauthorized: false });
    (mod as any).get(url, { agent }, (res: any) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return descargar(res.headers.location).then(resolve).catch(reject);
      }
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

async function main() {
  const prod = await prisma.producto.findFirst({
    where: { imagen_url: { startsWith: "http" }, nombre: { contains: "ESEB7" } }
  });

  if (!prod) {
    console.log("No se encontró la secadora con URL remota");
    await prisma.$disconnect();
    return;
  }

  console.log(`ID: ${prod.id} — ${prod.nombre}`);
  console.log(`URL imagen: ${prod.imagen_url}`);

  const imgBuffer = await descargar(prod.imagen_url);
  const outPath = path.join(OUTPUT_DIR, `${prod.id}.webp`);

  const base = await sharp(imgBuffer)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .resize(FINAL, FINAL, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
    .png().toBuffer();

  const patchW = 300, patchH = 180;
  const patchTop = FINAL - patchH;
  const whitePatch = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${patchW}" height="${patchH}">
      <rect width="${patchW}" height="${patchH}" fill="white"/>
    </svg>`
  );
  const logoSize = 148;
  const logoLeft = Math.round((patchW - logoSize) / 2);
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

  await prisma.producto.update({
    where: { id: prod.id },
    data: { imagen_url: `/imagenes/productos/${prod.id}.webp` }
  });

  console.log(`✓ Imagen guardada y DB actualizada: /imagenes/productos/${prod.id}.webp`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
