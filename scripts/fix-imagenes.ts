import * as fs from "fs";
import * as path from "path";
// Carga .env.local antes de importar prisma
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf-8").split("\n").forEach(line => {
    const [k, ...v] = line.split("=");
    if (k?.trim() && v.length) process.env[k.trim()] = v.join("=").trim().replace(/^"(.*)"$/, "$1");
  });
}
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import puppeteer from "puppeteer-core";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const PLACEHOLDER = "https://vienamuebles.com/wp-content/uploads/clientResources/marca-y-producto_no-image.jpg";

// Busca la imagen real en la página del proveedor (WooCommerce gallery)
async function imagenDesdePagina(page: any, url: string): Promise<string | null> {
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });
    const imgUrl: string | null = await page.evaluate(() => {
      const NO_IMG = "no-image";
      const selectores = [
        ".woocommerce-product-gallery__image a",
        ".woocommerce-product-gallery__image img",
        "img.wp-post-image",
        ".woocommerce-product-gallery img",
      ];
      for (const sel of selectores) {
        const el = document.querySelector(sel) as any;
        if (!el) continue;
        const src = (el.href || el.src || el.dataset?.src || "").split("?")[0];
        if (src && src.startsWith("http") && !src.includes(NO_IMG)) return src;
      }
      return null;
    });
    return imgUrl;
  } catch {
    return null;
  }
}

// Busca la imagen en la API pública de MercadoLibre Argentina
async function imagenDesdeMercadoLibre(nombre: string): Promise<string | null> {
  try {
    // Limpia el nombre para la búsqueda: queda marca + modelo principal
    const query = nombre
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);

    const url = `https://api.mercadolibre.com/sites/MLA/search?q=${encodeURIComponent(query)}&limit=5`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;

    const data: any = await res.json();
    const resultados = data.results || [];

    for (const item of resultados) {
      // Prefiere imágenes de alta resolución
      const thumbnail: string = item.thumbnail || "";
      if (thumbnail && thumbnail.startsWith("http")) {
        // Convierte thumbnail a imagen grande: reemplaza /thumbnail/ por la versión grande
        const imgGrande = thumbnail
          .replace("I.jpg", "O.jpg")  // ML trick para imagen original
          .replace("/thumbnail/", "/")
          .replace("-I.jpg", "-O.jpg");
        return imgGrande || thumbnail;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function main() {
  const sinFoto = await prisma.producto.findMany({
    where: { imagen_url: PLACEHOLDER },
    select: { id: true, nombre: true, url_origen: true, categoria: true },
  });

  console.log(`\n== ${sinFoto.length} productos sin imagen real ==\n`);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--ignore-certificate-errors"],
  });

  let arreglados = 0;
  let desdeMl = 0;
  let sinResolver = 0;

  for (const producto of sinFoto) {
    const page = await browser.newPage();
    await page.setUserAgent(UA);
    await page.setViewport({ width: 1280, height: 800 });

    console.log(`[${producto.id}] ${producto.nombre.slice(0, 55)}`);

    // 1. Intenta desde la página del proveedor
    let nuevaUrl = await imagenDesdePagina(page, producto.url_origen);
    await page.close();

    // 2. Si el proveedor no tiene imagen, busca en MercadoLibre
    if (!nuevaUrl) {
      console.log(`  -> Sin imagen en proveedor, buscando en MercadoLibre...`);
      nuevaUrl = await imagenDesdeMercadoLibre(producto.nombre);
      if (nuevaUrl) desdeMl++;
    }

    if (nuevaUrl) {
      await prisma.producto.update({
        where: { id: producto.id },
        data: { imagen_url: nuevaUrl },
      });
      console.log(`  ✓ ${nuevaUrl.slice(0, 75)}`);
      arreglados++;
    } else {
      console.log(`  ✗ No se encontró imagen`);
      sinResolver++;
    }

    await new Promise(r => setTimeout(r, 500));
  }

  await browser.close();
  await prisma.$disconnect();

  console.log(`\n== Resumen ==`);
  console.log(`Arreglados: ${arreglados} / ${sinFoto.length}`);
  console.log(`  Desde proveedor: ${arreglados - desdeMl}`);
  console.log(`  Desde MercadoLibre: ${desdeMl}`);
  console.log(`Sin resolver: ${sinResolver}`);
}

main().catch(console.error);
