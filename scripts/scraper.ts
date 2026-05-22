import puppeteer, { Browser, Page } from "puppeteer-core";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const prisma = new PrismaClient();
const DELAY_MS = 1200;

const CATEGORIAS = [
  { nombre: "Muebles", url: "https://vienamuebles.com/product-category/muebles/" },
  { nombre: "Electrodomésticos", url: "https://vienamuebles.com/product-category/electrodomesticos/" },
  { nombre: "Cocina y Lavado", url: "https://vienamuebles.com/product-category/cocina-y-lavado/" },
  { nombre: "Smart TV", url: "https://vienamuebles.com/product-category/smart-tv/" },
  { nombre: "Audio, Video y Accesorios", url: "https://vienamuebles.com/product-category/audio-video-y-accesorios/" },
  { nombre: "Climatización", url: "https://vienamuebles.com/product-category/climatizacion/" },
  { nombre: "Colchones y Sommiers", url: "https://vienamuebles.com/product-category/colchones-y-sommiers/" },
  { nombre: "Hogar y Jardín", url: "https://vienamuebles.com/product-category/hogar-y-jardin/" },
  { nombre: "Informática y Celulares", url: "https://vienamuebles.com/product-category/informatica-y-celulares/" },
  { nombre: "Deporte y Tiempo Libre", url: "https://vienamuebles.com/product-category/deporte-y-tiempo-libre/" },
  { nombre: "Salud y Fitness", url: "https://vienamuebles.com/product-category/salud-cuidado-pers-y-fitness/" },
  { nombre: "Juguetes e Infantiles", url: "https://vienamuebles.com/product-category/juguetes-e-infantiles/" },
  { nombre: "Comercial y Gastronómico", url: "https://vienamuebles.com/product-category/comercial-y-gastronomico/" },
];

const RUTAS_CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  `C:\\Users\\${process.env.USERNAME}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
];

function detectarChrome(): string {
  for (const r of RUTAS_CHROME) {
    if (fs.existsSync(r)) { console.log(`🌐 Chrome: ${r}`); return r; }
  }
  throw new Error("❌ Chrome no encontrado.");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface ProductoExtraido {
  nombre: string;
  imagen_url: string;
  url_origen: string;
  precio_costo: number;
  disponible: boolean;
}

// Lee el total de resultados del contador ("Mostrando 1–12 de 353 resultados" → 353)
async function leerTotalProductos(page: Page): Promise<number> {
  return page.evaluate(() => {
    const texto = document.querySelector(".woocommerce-result-count")?.textContent || "";
    const match = texto.match(/de\s+([\d.]+)\s+resultado/);
    if (match) return parseInt(match[1].replace(/\./g, ""), 10);
    return 0;
  });
}

async function extraerProductos(page: Page): Promise<ProductoExtraido[]> {
  return page.evaluate(() => {
    const resultado: Array<{
      nombre: string; imagen_url: string; url_origen: string; precio_costo: number; disponible: boolean;
    }> = [];

    document.querySelectorAll("li.product").forEach((item) => {
      const nombre = item.querySelector("h3")?.textContent?.trim() || "";

      let url_origen = "";
      item.querySelectorAll("a").forEach((a) => {
        const h = (a as HTMLAnchorElement).href;
        if (h.includes("/productos/") && !url_origen) url_origen = h;
      });

      const imgEl = item.querySelector("img") as HTMLImageElement | null;
      const imagen_url = imgEl?.src?.split("?")[0] || "";

      const precioTexto =
        item.querySelector(".cl-price-rating")?.textContent?.trim() ||
        item.querySelector(".woocommerce-Price-amount")?.textContent?.trim() || "";

      let precio_costo = 0;
      if (precioTexto) {
        const sinPuntos = precioTexto.replace(/[^0-9]/g, "");
        precio_costo = parseInt(sinPuntos, 10) || 0;
      }

      // WooCommerce marca los sin stock con clase "outofstock" en el li
      const disponible = !item.classList.contains("outofstock");

      if (nombre && url_origen) {
        resultado.push({ nombre, imagen_url, url_origen, precio_costo, disponible });
      }
    });

    return resultado;
  });
}

async function main() {
  console.log("🚀 Iniciando scraper completo de Viena Muebles...\n");

  let browser: Browser | null = null;
  let productosNuevos = 0;
  let productosActualizados = 0;
  const errores: string[] = [];

  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: detectarChrome(),
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    // UA simplificado: el UA completo de Chrome activa isotope JS que mueve los li del DOM
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
    await page.setViewport({ width: 1280, height: 800 });

    for (const categoria of CATEGORIAS) {
      console.log(`\n🏷️  ${categoria.nombre}`);

      try {
        // Página 1: obtener productos Y total
        await page.goto(categoria.url, { waitUntil: "networkidle2", timeout: 30000 });
        await sleep(DELAY_MS);

        const total = await leerTotalProductos(page);
        const totalPaginas = total > 0 ? Math.ceil(total / 12) : 1;
        console.log(`   📊 Total: ${total} productos → ${totalPaginas} página(s)`);

        // Procesar todas las páginas
        for (let pagina = 1; pagina <= totalPaginas; pagina++) {
          try {
            if (pagina > 1) {
              const urlPagina = `${categoria.url}page/${pagina}/`;
              console.log(`   📄 Página ${pagina}/${totalPaginas}: ${urlPagina}`);
              await page.goto(urlPagina, { waitUntil: "networkidle2", timeout: 30000 });
              await sleep(DELAY_MS);
            } else {
              console.log(`   📄 Página 1/${totalPaginas}`);
            }

            const productos = await extraerProductos(page);
            console.log(`   → ${productos.length} productos`);

            for (const p of productos) {
              try {
                const existente = await prisma.producto.findUnique({
                  where: { url_origen: p.url_origen },
                });

                if (existente) {
                  // Nunca sobreescribir imagen local con URL externa del proveedor
                  const imagenFinal = existente.imagen_url?.startsWith("/imagenes/")
                    ? existente.imagen_url
                    : (p.imagen_url || existente.imagen_url);
                  await prisma.producto.update({
                    where: { url_origen: p.url_origen },
                    data: {
                      nombre: p.nombre,
                      categoria: categoria.nombre,
                      imagen_url: imagenFinal,
                      precio_costo: p.precio_costo > 0 ? p.precio_costo : existente.precio_costo,
                      disponible: p.disponible,
                    },
                  });
                  productosActualizados++;
                } else {
                  await prisma.producto.create({
                    data: {
                      nombre: p.nombre,
                      categoria: categoria.nombre,
                      precio_costo: p.precio_costo,
                      imagen_url: p.imagen_url,
                      url_origen: p.url_origen,
                      disponible: p.disponible,
                    },
                  });
                  productosNuevos++;
                }
              } catch (err) {
                const msg = `Error guardando "${p.nombre}": ${err}`;
                errores.push(msg);
                console.error(`   ❌ ${msg}`);
              }
            }

          } catch (err) {
            const msg = `Error en página ${pagina} de ${categoria.nombre}: ${err}`;
            errores.push(msg);
            console.error(`   ❌ ${msg}`);
          }
        }

        console.log(`   ✔ Nuevos: ${productosNuevos} | Actualizados: ${productosActualizados}`);

      } catch (err) {
        const msg = `Error en categoría ${categoria.nombre}: ${err}`;
        errores.push(msg);
        console.error(`   ❌ ${msg}`);
      }
    }

  } catch (err) {
    errores.push(`Error general: ${err}`);
    console.error(`❌ Error general: ${err}`);
  } finally {
    if (browser) await browser.close();

    await prisma.logSincronizacion.create({
      data: {
        productos_nuevos: productosNuevos,
        productos_actualizados: productosActualizados,
        errores: errores.length > 0 ? errores.slice(0, 20).join("\n") : null,
      },
    });

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ Nuevos:       ${productosNuevos}`);
    console.log(`🔄 Actualizados: ${productosActualizados}`);
    console.log(`❌ Errores:      ${errores.length}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    await prisma.$disconnect();
  }
}

main();
