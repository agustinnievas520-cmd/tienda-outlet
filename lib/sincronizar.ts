// Sincronización con el catálogo de Viena: suma productos nuevos, pone al día
// precios y stock, y oculta lo que Viena ya no tiene. Nunca borra nada y nunca
// vuelve a mostrar un producto ocultado a mano (oculto_manual).
import { prisma } from "./prisma";
import { CATEGORIAS, leerCategoria, ProductoViena, esFotoDeRelleno, leerFicha, Ficha } from "./viena";

export interface ResultadoSync {
  categorias: string[];
  leidos: number;
  nuevos: number;
  precios: number;
  mostrados: number;
  ocultados: number;
  codigos: number;
  sinCodigo: number;
  errores: string[];
}

// Cuántas páginas de producto se leen por corrida para buscar códigos.
// En Vercel hay 60 segundos, así que la diaria va de a poco; el script
// local puede leer todas de una.
const FICHAS_POR_CORRIDA = 120;

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

export async function sincronizar(slugs: string[], opciones: { maxFichas?: number } = {}): Promise<ResultadoSync> {
  const cats = CATEGORIAS.filter((c) => slugs.includes(c.slug));
  const r: ResultadoSync = { categorias: cats.map((c) => c.nombre), leidos: 0, nuevos: 0, precios: 0, mostrados: 0, ocultados: 0, codigos: 0, sinCodigo: 0, errores: [] };

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
    select: { id: true, nombre: true, url_origen: true, precio_costo: true, disponible: true, oculto_manual: true, imagen_url: true, categoria: true, codigo: true },
  });
  const porUrl = new Map(tienda.map((p) => [p.url_origen, p]));
  const porNombre = new Map<string, (typeof tienda)[number]>();
  for (const p of tienda) {
    const k = p.nombre.trim().toLowerCase();
    if (!porNombre.has(k) || porNombre.get(k)!.disponible === false) porNombre.set(k, p);
  }

  const buscar = (v: ProductoViena) => porUrl.get(v.url_origen) || porNombre.get(v.nombre.trim().toLowerCase());

  // Páginas de producto a leer:
  //  - fotos de relleno (logo de Viena) en el listado: la foto real está en la
  //    página del producto, salvo que la tienda ya tenga una foto buena;
  //  - productos sin código de artículo (no viene en el listado).
  // Primero los nuevos y los sin foto, después el resto de los sin código.
  const leidosViena = lecturas.flatMap((l) => l.productos).filter((v) => v.precio_costo > 0 || buscar(v));
  const necesitaFoto = (v: ProductoViena) => {
    if (!esFotoDeRelleno(v.imagen_url)) return false;
    const t = buscar(v);
    return !t || esFotoDeRelleno(t.imagen_url);
  };
  const urgentes = leidosViena.filter((v) => !buscar(v) || necesitaFoto(v));
  const resto = leidosViena.filter((v) => !urgentes.includes(v) && !buscar(v)!.codigo);
  const maxFichas = opciones.maxFichas ?? FICHAS_POR_CORRIDA;
  const aLeer = [...urgentes, ...resto].slice(0, Math.max(urgentes.length, maxFichas));
  const fichas = new Map<string, Ficha>();
  await enTandas(aLeer, 8, async (v) => {
    const f = await leerFicha(v.url_origen);
    if (f) fichas.set(v.url_origen, f);
  });
  for (const v of leidosViena) {
    const f = fichas.get(v.url_origen);
    if (f?.foto && esFotoDeRelleno(v.imagen_url)) v.imagen_url = f.foto;
  }
  const codigoDe = (v: ProductoViena) => fichas.get(v.url_origen)?.codigo || undefined;

  // "vistos" es de toda la corrida: si un producto se mudó de categoría,
  // no se oculta por no estar en la vieja.
  const vistos = new Set<number>();
  const cambios: (() => Promise<unknown>)[] = [];

  for (const { productos } of lecturas) {
    r.leidos += productos.length;

    for (const v of productos) {
      const t = buscar(v);
      if (t && vistos.has(t.id)) continue;
      if (!t) {
        // Producto nuevo (sin foto real no se muestra)
        if (v.precio_costo <= 0) continue;
        r.nuevos++;
        if (codigoDe(v)) r.codigos++;
        cambios.push(() =>
          prisma.producto.create({
            data: {
              nombre: v.nombre,
              categoria: v.categoria,
              precio_costo: v.precio_costo,
              imagen_url: v.imagen_url,
              disponible: v.disponible && !esFotoDeRelleno(v.imagen_url),
              url_origen: v.url_origen,
              codigo: codigoDe(v),
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
      // Nombres con letras rotas (tildes mal leídas): se corrigen con el de Viena
      if (t.nombre.includes("�") && !v.nombre.includes("�")) data.nombre = v.nombre;
      if (t.url_origen !== v.url_origen && !porUrl.has(v.url_origen)) data.url_origen = v.url_origen;
      if (foto !== t.imagen_url) data.imagen_url = foto;
      const codigo = codigoDe(v);
      if (codigo && codigo !== t.codigo) {
        data.codigo = codigo;
        r.codigos++;
      }
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
  r.sinCodigo = leidosViena.filter((v) => !codigoDe(v) && !buscar(v)?.codigo).length;

  try {
    await prisma.logSincronizacion.create({
      data: {
        productos_nuevos: r.nuevos,
        productos_actualizados: r.precios + r.mostrados + r.ocultados,
        errores: `[${slugs.join(",")}] precios:${r.precios} mostrados:${r.mostrados} ocultados:${r.ocultados} codigos:${r.codigos} sin-codigo:${r.sinCodigo}` +
          (r.errores.length ? `\n${r.errores.slice(0, 10).join("\n")}` : ""),
      },
    });
  } catch {
    // el registro es opcional
  }
  return r;
}
