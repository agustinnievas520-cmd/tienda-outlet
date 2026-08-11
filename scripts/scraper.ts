import puppeteer, { Browser, Page } from "puppeteer-core";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

// Cargar .env.local automáticamente (Next.js lo hace, ts-node no)
const envFile = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx);
    let val = trimmed.slice(idx + 1);
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}

const prisma = new PrismaClient();
const DELAY_MS = 1200;
const BASE_URL = "https://www.vienamuebles.com";
const PRODUCTOS_POR_PAGINA = 12;

// Viena Muebles migró de plataforma en 2026-08: nuevas URLs de categoría (sin /product-category/,
// sin barra final) y paginación por query string ?page=N. Los slugs se relevaron desde el nav del sitio.
const CATEGORIAS = [
  { nombre: "Muebles", slug: "muebles" },
  { nombre: "Electrodomésticos", slug: "electrodomesticos" },
  { nombre: "Cocina y Lavado", slug: "cocina-y-lavado" },
  { nombre: "Smart TV", slug: "smart-tv" },
  { nombre: "Audio, Video y Accesorios", slug: "audio-video-y-accesorios" },
  { nombre: "Climatización", slug: "climatizacion" },
  { nombre: "Colchones y Sommiers", slug: "colchones-y-sommiers" },
  { nombre: "Hogar y Jardín", slug: "hogar-y-jardin" },
  { nombre: "Informática y Celulares", slug: "informatica-y-celulares" },
  { nombre: "Deporte y Tiempo Libre", slug: "deporte-y-tiempo-libre" },
  { nombre: "Salud y Fitness", slug: "salud-cuidado-pers-y-fitness" },
  { nombre: "Juguetes e Infantiles", slug: "juguetes-e-infantiles" },
  { nombre: "Comercial y Gastronómico", slug: "comercial-y-gastronomico" },
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

async function leerTotalProductos(page: Page): Promise<number> {
  return page.evaluate(() => {
    const texto = document.body.innerText || "";
    const match = texto.match(/de\s+([\d.]+)\s+productos/i);
    if (match) return parseInt(match[1].replace(/\./g, ""), 10);
    return 0;
  });
}

// El listado usa carga diferida: cada <img> arranca con el logo de Viena como placeholder
// y recién se reemplaza por la foto real cuando el elemento entra en el viewport. Sin este
// scroll, se termina guardando el logo como si fuera la imagen del producto.
async function forzarCargaDeImagenes(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const paso = 300;
    const alturaTotal = document.body.scrollHeight;
    for (let y = 0; y < alturaTotal; y += paso) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 150));
    }
  });

  // Reintentos dirigidos: forzar al viewport cualquier imagen que siga en el placeholder
  for (let intento = 0; intento < 3; intento++) {
    const pendientes = await page.evaluate(
      () => document.querySelectorAll(".product-box .thumb img[src*='logo-vienamuebles']").length
    );
    if (pendientes === 0) break;
    await page.evaluate(() => {
      document.querySelectorAll(".product-box .thumb img[src*='logo-vienamuebles']").forEach((img) =>
        img.scrollIntoView({ block: "center" })
      );
    });
    await sleep(700);
  }

  await page.evaluate(() => window.scrollTo(0, 0));
}

// Última instancia: si en el listado la imagen sigue siendo el placeholder, se busca
// la foto real entrando a la ficha del producto (ahí carga directo, sin lazy-load).
async function obtenerImagenDesdeFicha(page: Page, urlProducto: string): Promise<string | null> {
  try {
    await page.goto(urlProducto, { waitUntil: "networkidle2", timeout: 20000 });
    await sleep(1000);
    const imagen = await page.evaluate(() => {
      const img = Array.from(document.querySelectorAll(".thumb img.img-contained")).find(
        (i) => !(i as HTMLImageElement).src.includes("logo-vienamuebles")
      ) as HTMLImageElement | undefined;
      return img?.src || null;
    });
    return imagen;
  } catch {
    return null;
  }
}

async function extraerProductos(page: Page, baseUrl: string): Promise<ProductoExtraido[]> {
  return page.evaluate((base) => {
    const resultado: Array<{
      nombre: string; imagen_url: string; url_origen: string; precio_costo: number; disponible: boolean;
    }> = [];

    document.querySelectorAll(".product-box").forEach((box) => {
      const nombre = box.querySelector('meta[itemprop="name"]')?.getAttribute("content")?.trim() || "";
      const url_origen = box.querySelector('link[itemprop="url"]')?.getAttribute("href") || "";

      const precioStr = box.querySelector('meta[itemprop="price"]')?.getAttribute("content") || "0";
      const precio_costo = Math.round(parseFloat(precioStr)) || 0;

      const disponibilidad = box.querySelector('meta[itemprop="availability"]')?.getAttribute("content") || "";
      const disponible = disponibilidad.includes("InStock");

      let imagen_url = box.querySelector(".thumb img")?.getAttribute("src") || "";
      if (imagen_url && !imagen_url.startsWith("http")) {
        imagen_url = base.replace(/\/$/, "") + "/" + imagen_url.replace(/^\//, "");
      }

      if (nombre && url_origen) {
        resultado.push({ nombre, imagen_url, url_origen, precio_costo, disponible });
      }
    });

    return resultado;
  }, baseUrl);
}

async function main() {
  console.log("🚀 Iniciando scraper completo de Viena Muebles...\n");

  let browser: Browser | null = null;
  let productosActualizados = 0;
  const errores: string[] = [];
  const sinMatch: ProductoExtraido[] = [];
  const idsEmparejados = new Set<number>();

  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: detectarChrome(),
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
    await page.setViewport({ width: 1280, height: 800 });

    for (const categoria of CATEGORIAS) {
      console.log(`\n🏷️  ${categoria.nombre}`);
      const categoriaUrl = `${BASE_URL}/${categoria.slug}`;

      try {
        await page.goto(categoriaUrl, { waitUntil: "networkidle2", timeout: 30000 });
        await sleep(DELAY_MS);

        const total = await leerTotalProductos(page);
        const totalPaginas = total > 0 ? Math.ceil(total / PRODUCTOS_POR_PAGINA) : 1;
        console.log(`   📊 Total: ${total} productos → ${totalPaginas} página(s)`);

        for (let pagina = 1; pagina <= totalPaginas; pagina++) {
          try {
            if (pagina > 1) {
              const urlPagina = `${categoriaUrl}?page=${pagina}`;
              console.log(`   📄 Página ${pagina}/${totalPaginas}: ${urlPagina}`);
              await page.goto(urlPagina, { waitUntil: "networkidle2", timeout: 30000 });
              await sleep(DELAY_MS);
            } else {
              console.log(`   📄 Página 1/${totalPaginas}`);
            }

            await forzarCargaDeImagenes(page);
            const productos = await extraerProductos(page, BASE_URL);
            console.log(`   → ${productos.length} productos`);

            const conPlaceholder = productos.filter((p) => p.imagen_url.includes("logo-vienamuebles"));
            if (conPlaceholder.length > 0) {
              console.log(`   🔁 Buscando foto real de ${conPlaceholder.length} producto(s) en su ficha...`);
              for (const p of conPlaceholder) {
                const imagenReal = await obtenerImagenDesdeFicha(page, p.url_origen);
                if (imagenReal) p.imagen_url = imagenReal;
                await sleep(400);
              }
              // volver a la pagina de listado por si quedan mas paginas en esta categoria
              await page.goto(pagina > 1 ? `${categoriaUrl}?page=${pagina}` : categoriaUrl, {
                waitUntil: "domcontentloaded",
                timeout: 30000,
              });
            }

            for (const p of productos) {
              try {
                // 1) match por url_origen (sirve para sincronizaciones futuras, ya con la URL nueva)
                let existente = await prisma.producto.findUnique({ where: { url_origen: p.url_origen } });

                // 2) fallback: match por nombre exacto contra el catálogo pre-migración,
                //    evitando reusar una fila ya emparejada en esta misma corrida
                if (!existente) {
                  existente = await prisma.producto.findFirst({
                    where: {
                      nombre: { equals: p.nombre, mode: "insensitive" },
                      id: { notIn: Array.from(idsEmparejados) },
                    },
                  });
                }

                if (existente) {
                  idsEmparejados.add(existente.id);
                  // Nunca sobreescribir imagen local (ya limpiada de logo) con URL externa del proveedor
                  const imagenFinal = existente.imagen_url?.startsWith("/imagenes/")
                    ? existente.imagen_url
                    : (p.imagen_url || existente.imagen_url);
                  await prisma.producto.update({
                    where: { id: existente.id },
                    data: {
                      nombre: p.nombre,
                      categoria: categoria.nombre,
                      imagen_url: imagenFinal,
                      precio_costo: p.precio_costo > 0 ? p.precio_costo : existente.precio_costo,
                      disponible: p.disponible,
                      url_origen: p.url_origen,
                    },
                  });
                  productosActualizados++;
                } else {
                  // No se encontró coincidencia: no se inserta automáticamente,
                  // se reporta aparte para revisión manual (evita duplicados/altas erróneas).
                  sinMatch.push({ ...p, nombre: `[${categoria.nombre}] ${p.nombre}` });
                }
              } catch (err) {
                const msg = `Error procesando "${p.nombre}": ${err}`;
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

        console.log(`   ✔ Actualizados hasta ahora: ${productosActualizados}`);

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

    if (sinMatch.length > 0) {
      const reportePath = path.join(__dirname, "_productos-sin-match.json");
      fs.writeFileSync(reportePath, JSON.stringify(sinMatch, null, 2), "utf-8");
      console.log(`\n📝 Reporte de productos sin match guardado en: ${reportePath}`);
    }

    try {
      await prisma.logSincronizacion.create({
        data: {
          productos_nuevos: 0,
          productos_actualizados: productosActualizados,
          errores: errores.length > 0 ? errores.slice(0, 20).join("\n") : null,
        },
      });
    } catch (logErr) {
      console.error(`⚠️  No se pudo guardar el log: ${logErr}`);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🔄 Actualizados:   ${productosActualizados}`);
    console.log(`❓ Sin match:      ${sinMatch.length}`);
    console.log(`❌ Errores:        ${errores.length}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    await prisma.$disconnect();
  }
}

main();
