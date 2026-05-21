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
import sharp from "sharp";
import https from "https";
import http from "http";

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

const OUTPUT_DIR = path.resolve("public/imagenes/productos");
const LOGO_PATH = path.resolve("public/logo-marca.svg");
const FINAL = 800;

function descargar(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const agent = new (mod === https ? require("https").Agent : require("http").Agent)({ rejectUnauthorized: false });
    mod.get(url, { agent }, res => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return descargar(res.headers.location).then(resolve).catch(reject);
      }
      const chunks: Buffer[] = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

async function procesarImagen(srcBuffer: Buffer, outPath: string) {
  const base = await sharp(srcBuffer)
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
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: detectarChrome(),
    args: ["--no-sandbox","--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

  // Ir a búsqueda para encontrar la secadora
  await page.goto("https://vienamuebles.com/?s=lavarrop&post_type=product", { waitUntil: "networkidle2", timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));

  // Buscar la secadora en la página 2
  const secadoraInfo = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll("li.product"));
    for (const el of items) {
      const nombre = el.querySelector("h3")?.textContent?.trim() || "";
      if (nombre.toLowerCase().includes("secadora")) {
        const url = Array.from(el.querySelectorAll("a")).find((a: any) => a.href?.includes("/productos/"))?.href || "";
        const img = (el.querySelector("img") as HTMLImageElement);
        const imgUrl = img?.getAttribute("data-src") || img?.getAttribute("src") || "";
        return { nombre, url, imgUrl };
      }
    }
    return null;
  });

  let info = secadoraInfo;

  if (!info) {
    // Intentar página 2
    await page.goto("https://vienamuebles.com/page/2/?s=lavarrop&post_type=product", { waitUntil: "networkidle2", timeout: 20000 });
    await new Promise(r => setTimeout(r, 1500));
    info = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll("li.product"));
      for (const el of items) {
        const nombre = el.querySelector("h3")?.textContent?.trim() || "";
        if (nombre.toLowerCase().includes("secadora")) {
          const url = Array.from(el.querySelectorAll("a")).find((a: any) => a.href?.includes("/productos/"))?.href || "";
          const img = (el.querySelector("img") as HTMLImageElement);
          const imgUrl = img?.getAttribute("data-src") || img?.getAttribute("src") || "";
          return { nombre, url, imgUrl };
        }
      }
      return null;
    });
  }

  if (!info) {
    console.log("No se encontró la secadora en la búsqueda. Intentando buscar directamente por nombre...");
    await page.goto("https://vienamuebles.com/?s=secadora&post_type=product", { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));
    info = await page.evaluate(() => {
      const el = document.querySelector("li.product");
      if (!el) return null;
      const nombre = el.querySelector("h3")?.textContent?.trim() || "";
      const url = Array.from(el.querySelectorAll("a")).find((a: any) => a.href?.includes("/productos/"))?.href || "";
      const img = (el.querySelector("img") as HTMLImageElement);
      const imgUrl = img?.getAttribute("data-src") || img?.getAttribute("src") || "";
      return { nombre, url, imgUrl };
    });
  }

  if (!info || !info.url) {
    console.error("No se pudo encontrar la secadora");
    await browser.close();
    await prisma.$disconnect();
    return;
  }

  console.log(`Encontrada: ${info.nombre}`);
  console.log(`URL producto: ${info.url}`);
  console.log(`URL imagen listado: ${info.imgUrl}`);

  // Visitar la página del producto para obtener más datos
  await page.goto(info.url, { waitUntil: "networkidle2", timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  const detalle = await page.evaluate(() => {
    const precio = (document.querySelector(".price .woocommerce-Price-amount bdi") as HTMLElement)?.innerText?.trim() ||
                   (document.querySelector(".price") as HTMLElement)?.innerText?.trim() || "";
    const descripcion = (document.querySelector(".woocommerce-product-details__short-description") as HTMLElement)?.innerText?.trim() || "";
    const imgs = Array.from(document.querySelectorAll(".woocommerce-product-gallery__image img"));
    const imgGaleria = imgs.map((i: any) => i.getAttribute("data-large_image") || i.getAttribute("data-src") || i.src).filter(Boolean);
    return { precio, descripcion, imgGaleria };
  });

  console.log(`Precio: ${detalle.precio}`);
  console.log(`Imágenes galería: ${detalle.imgGaleria.length}`);

  // Obtener la mejor URL de imagen (asegurar URL absoluta)
  const toAbs = (u: string) => u.startsWith("http") ? u : `https://vienamuebles.com${u.startsWith("/") ? "" : "/"}${u}`;
  const rawImg = detalle.imgGaleria[0] || info.imgUrl;
  const imgUrl = toAbs(rawImg.split("&")[0]); // quitar parámetros extra si los hay
  console.log(`Usando imagen: ${imgUrl}`);

  // Extraer precio numérico
  const precioNum = parseFloat(detalle.precio.replace(/[^0-9,.]/g,"").replace(/\./g,"").replace(",",".")) || 0;
  console.log(`Precio numérico: ${precioNum}`);

  // Ver categorías disponibles en la DB
  const ejemploLav = await prisma.producto.findFirst({
    where: { nombre: { contains: "lavarrop" } },
    select: { categoria: true }
  });
  const categoriaStr = ejemploLav?.categoria || "Electrodomésticos";
  console.log(`Usando categoría: ${categoriaStr}`);

  // Verificar si ya existe
  const existe = await prisma.producto.findFirst({
    where: { url_origen: info.url }
  });
  if (existe) {
    console.log("La secadora ya existe en la DB:", existe.nombre);
    await browser.close();
    await prisma.$disconnect();
    return;
  }

  // Descargar imagen y procesar
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Crear el producto primero para obtener el ID
  const producto = await prisma.producto.create({
    data: {
      nombre: info.nombre,
      precio_costo: precioNum,
      imagen_url: imgUrl,
      url_origen: info.url,
      categoria: categoriaStr,
      disponible: true,
    }
  });
  console.log(`Producto creado con ID: ${producto.id}`);

  // Descargar y procesar imagen
  const outPath = path.join(OUTPUT_DIR, `${producto.id}.webp`);
  try {
    const imgBuffer = await descargar(imgUrl);
    await procesarImagen(imgBuffer, outPath);
    await prisma.producto.update({
      where: { id: producto.id },
      data: { imagen_url: `/imagenes/productos/${producto.id}.webp` }
    });
    console.log(`Imagen guardada: ${outPath}`);
    console.log("✓ Secadora agregada correctamente a la DB con imagen procesada");
  } catch (e: any) {
    console.error("Error procesando imagen:", e.message);
    console.log("El producto fue creado pero la imagen sigue siendo la URL remota");
  }

  await browser.close();
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
