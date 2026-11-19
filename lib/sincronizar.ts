// Sincronización con el catálogo de Viena: suma productos nuevos, pone al día
// precios y stock, y oculta lo que Viena ya no tiene. Nunca borra nada y nunca
// vuelve a mostrar un producto ocultado a mano (oculto_manual).
import { prisma } from "./prisma";
import { CATEGORIAS, leerCategoria, ProductoViena, esFotoDeRelleno, fotoDesdePagina } from "./viena";

export interface ResultadoSync {
  categorias: string[];
  leidos: number;
  nuevos: number;
  precios: number;
  mostrados: number;
  ocultados: number;
  errores: string[];
}

// Grupos para la sincronización diaria (cada uno entra en el tiempo de Vercel)
export const GRUPOS: string[][] = [
  ["muebles", "electrodomesticos", "smart-tv", "informatica-y-celulares"],
  ["cocina-y-lavado", "climatizacion", "colchones-y-sommiers"],
  [
    "hogar-y-jardin",
    "deporte-y-tiempo-libre",
    "audio-video-y-accesorios",
    "salud-cuidado-pers-y-fitness",
    "juguetes-e-infantiles",
    "comercial-y-gastronomico",
  ],
];

function esImagenPropia(url: string): boolean {
  return url.startsWith("/imagenes/") || url.startsWith("/subidas/");
}

async function enTandas<T>(items: T[], tam: number, fn: (x: T) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += tam) {
    await Promise.all(items.slice(i, i + tam).map(fn));
  }
}

export async function sincronizar(slugs: string[]): Promise<ResultadoSync> {
  const cats = CATEGORIAS.filter((c) => slugs.includes(c.slug));
  const r: ResultadoSync = { categorias: cats.map((c) => c.nombre), leidos: 0, nuevos: 0, precios: 0, mostrados: 0, ocultados: 0, errores: [] };

  // 1) Leer Viena (categorías en paralelo)
  const lecturas = await Promise.all(
    cats.map(async (c) => {
      try {
        return { cat: c, productos: await leerCategoria(c), ok: true };
      } catch (e) {
        r.errores.push(`${c.nombre}: ${(e as Error).message}`);
        return { cat: c, productos: [] as ProductoViena[], ok: false };
      }
    })
  );

  // 2) Productos de la tienda para emparejar (por dirección y, si no, por nombre)
  const tienda = await prisma.producto.findMany({
    select: { id: true, nombre: true, url_origen: true, precio_costo: true, disponible: true, oculto_manual: true, imagen_url: true, categoria: true },
  });
  const porUrl = new Map(tienda.map((p) => [p.url_origen, p]));
  const porNombre = new Map<string, (typeof tienda)[number]>();
  for (const p of tienda) {
    const k = p.nombre.trim().toLowerCase();
    if (!porNombre.has(k) || porNombre.get(k)!.disponible === false) porNombre.set(k, p);
  }

  // Fotos de relleno (logo de Viena) en el listado: se busca la foto real en
  // la página del producto, salvo que la tienda ya tenga una foto buena.
  const sinFoto = lecturas
    .flatMap((l) => l.productos)
    .filter((v) => {
      if (!esFotoDeRelleno(v.imagen_url)) return false;
      const t = porUrl.get(v.url_origen) || porNombre.get(v.nombre.trim().toLowerCase());
      return !t || esFotoDeRelleno(t.imagen_url);
    });
  await enTandas(sinFoto, 8, async (v) => {
    const foto = await fotoDesdePagina(v.url_origen);
    if (foto) v.imagen_url = foto;
  });

  // "vistos" es de toda la corrida: si un producto se mudó de categoría,
  // no se oculta por no estar en la vieja.
  const vistos = new Set<number>();
  const cambios: (() => Promise<unknown>)[] = [];

  for (const { productos } of lecturas) {
    r.leidos += productos.length;

    for (const v of productos) {
      const t = porUrl.get(v.url_origen) || porNombre.get(v.nombre.trim().toLowerCase());
      if (t && vistos.has(t.id)) continue;
      if (!t) {
        // Producto nuevo (sin foto real no se muestra)
        if (v.precio_costo <= 0) continue;
        r.nuevos++;
        cambios.push(() =>
          prisma.producto.create({
            data: {
              nombre: v.nombre,
              categoria: v.categoria,
              precio_costo: v.precio_costo,
              imagen_url: v.imagen_url,
              disponible: v.disponible && !esFotoDeRelleno(v.imagen_url),
              url_origen: v.url_origen,
            },
          })
        );
        continue;
      }
      vistos.add(t.id);
      // Foto: nunca pisar una propia; si la de Viena es real y cambió, se actualiza
      const foto = esImagenPropia(t.imagen_url)
        ? t.imagen_url
        : !esFotoDeRelleno(v.imagen_url)
        ? v.imagen_url
        : t.imagen_url;
      // Se muestra solo si Viena lo tiene, no fue ocultado a mano y tiene foto real
      const disponible = v.disponible && !t.oculto_manual && !esFotoDeRelleno(foto);
      const data: Record<string, unknown> = {};
      if (v.precio_costo > 0 && Math.abs(v.precio_costo - t.precio_costo) >= 1) {
        data.precio_costo = v.precio_costo;
        r.precios++;
      }
      if (disponible !== t.disponible) {
        data.disponible = disponible;
        if (disponible) r.mostrados++;
        else r.ocultados++;
      }
      if (t.categoria !== v.categoria) data.categoria = v.categoria;
      if (t.url_origen !== v.url_origen && !porUrl.has(v.url_origen)) data.url_origen = v.url_origen;
      if (foto !== t.imagen_url) data.imagen_url = foto;
      if (Object.keys(data).length) cambios.push(() => prisma.producto.update({ where: { id: t.id }, data }));
    }
  }

  // 3) Lo que se ve en estas categorías pero Viena ya no tiene → se oculta.
  //    Solo categorías leídas completas (si una falló, no se toca nada de ella).
  const leidasOk = new Set(lecturas.filter((l) => l.ok && l.productos.length > 0).map((l) => l.cat.nombre));
  const faltantes = tienda.filter((t) => leidasOk.has(t.categoria) && t.disponible && !vistos.has(t.id));
  r.ocultados += faltantes.length;
  for (const f of faltantes) cambios.push(() => prisma.producto.update({ where: { id: f.id }, data: { disponible: false } }));

  await enTandas(cambios, 10, (fn) => fn().catch((e) => r.errores.push(String(e).slice(0, 200))));

  try {
    await prisma.logSincronizacion.create({
      data: {
        productos_nuevos: r.nuevos,
        productos_actualizados: r.precios + r.mostrados + r.ocultados,
        errores: `[${slugs.join(",")}] precios:${r.precios} mostrados:${r.mostrados} ocultados:${r.ocultados}` +
          (r.errores.length ? `\n${r.errores.slice(0, 10).join("\n")}` : ""),
      },
    });
  } catch {
    // el registro es opcional
  }
  return r;
}
