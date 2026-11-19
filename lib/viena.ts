// Lectura del catálogo del proveedor (Viena Muebles) sin navegador:
// las páginas de categoría vienen armadas desde el servidor, así que alcanza
// con descargar el HTML y leerlo. Se usa en el script de comparación y en la
// sincronización automática diaria.
import * as cheerio from "cheerio";

export const BASE_URL = "https://www.vienamuebles.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export const CATEGORIAS = [
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

export interface ProductoViena {
  nombre: string;
  categoria: string;
  url_origen: string;
  imagen_url: string;
  precio_costo: number;
  disponible: boolean;
}

function absoluta(u: string): string {
  if (!u) return "";
  if (u.startsWith("http")) return u;
  return BASE_URL + "/" + u.replace(/^\//, "");
}

export function leerPagina(html: string, categoria: string): ProductoViena[] {
  const $ = cheerio.load(html);
  const out: ProductoViena[] = [];
  $(".product-box").each((_, el) => {
    const box = $(el);
    const nombre = box.find('meta[itemprop="name"]').first().attr("content")?.trim() || "";
    const url_origen = box.find('link[itemprop="url"]').first().attr("href") || "";
    if (!nombre || !url_origen) return;

    // Precio de lista y precio de contado (con descuento); el de contado es el costo real.
    const lista = Math.round(parseFloat(box.find('meta[itemprop="price"]').first().attr("content") || "0")) || 0;
    const contadoTxt = box.find(".product_price_bank_discounts_till_container_list .price").first().text();
    const contado = Math.round(parseFloat(contadoTxt.replace(/[^\d,]/g, "").replace(",", "."))) || 0;

    const disponibilidad = box.find('meta[itemprop="availability"]').first().attr("content") || "";

    // Foto de mayor resolución del srcset
    const img = box.find(".thumb img").first();
    let imagen = img.attr("src") || "";
    const srcset = img.attr("srcset") || "";
    if (srcset) {
      const mejor = srcset
        .split(",")
        .map((e) => {
          const [u, w] = e.trim().split(/\s+/);
          return { u, w: parseInt(w) || 0 };
        })
        .filter((c) => c.u)
        .sort((a, b) => b.w - a.w)[0];
      if (mejor) imagen = mejor.u;
    }

    out.push({
      nombre,
      categoria,
      url_origen: absoluta(url_origen),
      imagen_url: absoluta(imagen),
      precio_costo: contado > 0 ? contado : lista,
      disponible: disponibilidad.includes("InStock"),
    });
  });
  // la misma tarjeta puede repetirse (versión móvil/escritorio): sin duplicados
  const vistos = new Set<string>();
  return out.filter((p) => (vistos.has(p.url_origen) ? false : (vistos.add(p.url_origen), true)));
}

async function descargar(url: string): Promise<string> {
  for (let intento = 0; intento < 3; intento++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
      if (res.ok) return await res.text();
      if (res.status === 404) return "";
    } catch {
      // reintenta
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`No se pudo leer ${url}`);
}

// Imagen de relleno de Viena (su logo): nunca se usa como foto de producto
export function esFotoDeRelleno(url: string): boolean {
  return !url || /logo-vienamuebles|no-image/i.test(url);
}

// Cuando el listado trae la imagen de relleno, la foto real suele estar en la
// página del producto.
export async function fotoDesdePagina(urlProducto: string): Promise<string> {
  try {
    const html = await descargar(urlProducto);
    const og = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1];
    const candidatas = [
      og,
      ...Array.from(html.matchAll(/["'(]((?:https?:\/\/[^"' )]+)?\/?mods\/html\/fil\/Model\/Product\/[^"' )]+\.(?:jpg|jpeg|png|webp)(?:\.webp)?)/gi)).map((m) => m[1]),
    ]
      .filter((u): u is string => !!u)
      .map(absoluta)
      .filter((u) => !esFotoDeRelleno(u));
    return candidatas[0] || "";
  } catch {
    return "";
  }
}

// Lee todas las páginas de una categoría, de a 4 páginas a la vez
// (más rápido; la sincronización diaria tiene un tiempo máximo en Vercel).
export async function leerCategoria(cat: { nombre: string; slug: string }): Promise<ProductoViena[]> {
  const todos: ProductoViena[] = [];
  const vistos = new Set<string>();
  const TANDA = 4;
  for (let desde = 1; desde <= 80; desde += TANDA) {
    const paginas = Array.from({ length: TANDA }, (_, i) => desde + i);
    const htmls = await Promise.all(
      paginas.map((n) => descargar(`${BASE_URL}/${cat.slug}${n > 1 ? `?page=${n}` : ""}`))
    );
    let terminó = false;
    for (const html of htmls) {
      const productos = leerPagina(html, cat.nombre).filter((p) => !vistos.has(p.url_origen));
      if (productos.length === 0) {
        terminó = true; // página vacía: se terminó la categoría
        break;
      }
      productos.forEach((p) => vistos.add(p.url_origen));
      todos.push(...productos);
    }
    if (terminó) break;
  }
  return todos;
}
