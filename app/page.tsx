import { prisma } from "@/lib/prisma";
import {
  calcularPrecioContado,
  calcularPrecioFinanciado,
  calcularPrecioCuota,
  calcularEntregaInicial,
} from "@/lib/calculos";
import TopBar from "@/components/home/TopBar";
import Navbar from "@/components/home/Navbar";
import Subnav from "@/components/home/Subnav";
import HeroSlider from "@/components/home/HeroSlider";
import TrustBar from "@/components/home/TrustBar";
import CategoryGrid from "@/components/home/CategoryGrid";
import ProductSection from "@/components/home/ProductSection";
import PromoGrid from "@/components/home/PromoGrid";
import CombosSection from "@/components/home/CombosSection";
import OfertaSemanal from "@/components/home/OfertaSemanal";
import FinBanner from "@/components/home/FinBanner";
import Footer from "@/components/home/Footer";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const q1 = (contains: string, cat?: string) => prisma.producto.findMany({
    where: { disponible: true, ...(cat ? { categoria: cat } : { nombre: { contains } }) },
    take: 1, orderBy: { precio_costo: "asc" },
  }).then((r) => r[0] ?? null);

  const [config, todosLosProductos, productosTrending, productosCalefaccion, productosGastronomicos,
    // Slots para combos
    slotColchon, slotAlmohada, slotBaseColchon,
    slotTv, slotRack,
    slotLavarropas, slotSecarropa, slotTendedero,
    slotCafetera, slotTostadora,
    slotHornoCombo, slotFreidoraCombo,
    slotCaloventorCombo, slotVentilador,
    slotJuguete1, slotJuguete2,
    slotSommier1p, slotColchon1p,
    slotSommier2p, slotColchon2p,
    slotAlmohadaEco,
  ] = await Promise.all([
    prisma.configuracion.findFirst(),
    prisma.producto.findMany({
      where: { disponible: true },
      take: 120,
      orderBy: { createdAt: "desc" },
    }),
    prisma.producto.findMany({
      where: { disponible: true, categoria: "Smart TV" },
      take: 12,
      orderBy: { precio_costo: "asc" },
    }),
    Promise.all([
      // Calefactores (Tromen, Longvie y otros)
      prisma.producto.findMany({
        where: { disponible: true, nombre: { contains: "alefactor" } },
        take: 5,
        orderBy: { precio_costo: "asc" },
      }),
      // Caloventores
      prisma.producto.findMany({
        where: { disponible: true, nombre: { contains: "aloventor" } },
        take: 3,
        orderBy: { precio_costo: "asc" },
      }),
      // Estufas infrarrojas (excluye termómetros infrarrojos)
      prisma.producto.findMany({
        where: {
          disponible: true,
          AND: [
            { nombre: { contains: "nfrarroj" } },
            { nombre: { not: { contains: "ermómet" } } },
            { nombre: { not: { contains: "ermometro" } } },
            { nombre: { not: { contains: "ermómetro" } } },
          ],
        },
        take: 2,
        orderBy: { precio_costo: "asc" },
      }),
      // Garraferas
      prisma.producto.findMany({
        where: { disponible: true, nombre: { contains: "arrafer" } },
        take: 2,
        orderBy: { precio_costo: "asc" },
      }),
      // Estufas a gas/eléctricas (excluye infrarrojas, calefactores y termómetros)
      prisma.producto.findMany({
        where: {
          disponible: true,
          AND: [
            { nombre: { contains: "stufa" } },
            { nombre: { not: { contains: "nfrarroj" } } },
            { nombre: { not: { contains: "alefactor" } } },
            { nombre: { not: { contains: "ermómet" } } },
            { nombre: { not: { contains: "ermometro" } } },
          ],
        },
        take: 2,
        orderBy: { precio_costo: "asc" },
      }),
    ]).then(([calefactores, caloventores, infrarrojos, garraferas, estufas]: [any[], any[], any[], any[], any[]]) => {
      const vistos = new Set<number>();
      return [...calefactores, ...caloventores, ...infrarrojos, ...garraferas, ...estufas].filter(
        (p) => { if (vistos.has(p.id)) return false; vistos.add(p.id); return true; }
      );
    }),
    Promise.all([
      prisma.producto.findMany({
        where: { disponible: true, nombre: { contains: "afetera" } },
        take: 2,
        orderBy: { precio_costo: "asc" },
      }),
      prisma.producto.findMany({
        where: { disponible: true, nombre: { contains: "ostadora" } },
        take: 2,
        orderBy: { precio_costo: "asc" },
      }),
      prisma.producto.findMany({
        where: {
          disponible: true,
          OR: [
            { nombre: { contains: "reidora" } },
            { nombre: { contains: "ir fryer" } },
            { nombre: { contains: "ir Fryer" } },
          ],
        },
        take: 4,
        orderBy: { precio_costo: "asc" },
      }),
      prisma.producto.findMany({
        where: {
          disponible: true,
          OR: [
            { nombre: { contains: "icuadora" } },
            { nombre: { contains: "atidora" } },
          ],
        },
        take: 4,
        orderBy: { precio_costo: "asc" },
      }),
      prisma.producto.findMany({
        where: {
          disponible: true,
          AND: [
            { nombre: { contains: "orno" } },
            { nombre: { not: { contains: "icrowav" } } },
            { nombre: { not: { contains: "it " } } },
            { nombre: { not: { contains: "romen" } } },
            {
              OR: [
                { nombre: { contains: "lectric" } },
                { nombre: { contains: "léctric" } },
                { nombre: { contains: "Electr" } },
              ],
            },
          ],
        },
        take: 2,
        orderBy: { precio_costo: "asc" },
      }),
    ]).then(([cafeteras, tostadoras, freidoras, batidoras, hornos]: any[]) => {
      const vistos = new Set<number>();
      return [...cafeteras, ...tostadoras, ...freidoras, ...batidoras, ...hornos].filter(
        (p) => { if (vistos.has(p.id)) return false; vistos.add(p.id); return true; }
      );
    }),
    // Slots combos
    q1("olchón", undefined), q1("lmohada", undefined), q1("ase cama", undefined),
    q1("", "Smart TV"), q1("ack TV", undefined),
    q1("awarropas", undefined), q1("ecarropa", undefined), q1("endedero", undefined),
    q1("afetera", undefined), q1("ostadora", undefined),
    q1("orno eléctric", undefined), q1("reidora", undefined),
    prisma.producto.findMany({ where: { disponible: true, nombre: { contains: "CW910" } }, take: 1, orderBy: { precio_costo: "asc" } }).then(r => r[0] ?? null),
    prisma.producto.findMany({ where: { disponible: true, nombre: { contains: "Neba 2000" } }, take: 1, orderBy: { precio_costo: "asc" } }).then(r => r[0] ?? null),
    q1("", "Juguetes e Infantiles"), q1("uñec", undefined),
    // Combo sommier 1 plaza — productos específicos
    prisma.producto.findMany({
      where: { disponible: true, nombre: { contains: "Sensations 0.80" } },
      take: 1, orderBy: { precio_costo: "asc" },
    }).then((r) => r[0] ?? null),
    prisma.producto.findMany({
      where: { disponible: true, AND: [{ nombre: { contains: "olchon" } }, { nombre: { contains: "lasico 80 x 190 x 20" } }] },
      take: 1, orderBy: { precio_costo: "asc" },
    }).then((r) => r[0] ?? null),
    // Combo sommier 2 plazas
    prisma.producto.findMany({
      where: { disponible: true, nombre: { contains: "Confort Sensations 1,40" } },
      take: 1, orderBy: { precio_costo: "asc" },
    }).then((r) => r[0] ?? null),
    prisma.producto.findMany({
      where: { disponible: true, AND: [{ nombre: { contains: "olchon" } }, { nombre: { contains: "140 x 190 x 23" } }] },
      take: 1, orderBy: { precio_costo: "asc" },
    }).then((r) => r[0] ?? null),
    // Almohada específica para combo 1 plaza
    prisma.producto.findMany({
      where: { disponible: true, nombre: { contains: "Support Compacta" } },
      take: 1, orderBy: { precio_costo: "asc" },
    }).then((r) => r[0] ?? null),
  ]);

  const cfg = config ?? {
    id: 1,
    margen_ganancia: 1.35,
    margen_financiado: 1.75,
    cuotas: 12,
    interes_cuota: 0.038,
    whatsapp_numero: "5403401642045",
  };

  const productosConPrecios = todosLosProductos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria,
    imagen_url: p.imagen_url,
    precio_contado: calcularPrecioContado(p.precio_costo, cfg),
    precio_financiado: calcularPrecioFinanciado(p.precio_costo, cfg),
    precio_cuota: calcularPrecioCuota(p.precio_costo, cfg),
    cuotas: cfg.cuotas,
    entrega_inicial: calcularEntregaInicial(p.precio_costo),
  }));

  const toProducto = (p: any) => p ? ({
    id: p.id, nombre: p.nombre, categoria: p.categoria, imagen_url: p.imagen_url,
    precio_contado: calcularPrecioContado(p.precio_costo, cfg),
    precio_financiado: calcularPrecioFinanciado(p.precio_costo, cfg),
    precio_cuota: calcularPrecioCuota(p.precio_costo, cfg),
    cuotas: cfg.cuotas,
  }) : null;

  const combos = [
    { id: "dormitorio", emoji: "🛏️", nombre: "Dormitorio Completo", productos: [slotColchon, slotAlmohada, slotBaseColchon].map(toProducto) },
    { id: "entretenimiento", emoji: "📺", nombre: "Smart TV + Mueble", productos: [slotTv, slotRack].map(toProducto) },
    { id: "lavadero", emoji: "🧺", nombre: "Lavadero Completo", productos: [slotLavarropas, slotSecarropa, slotTendedero].map(toProducto) },
    { id: "desayuno", emoji: "☕", nombre: "Desayuno Perfecto", productos: [slotCafetera, slotTostadora].map(toProducto) },
    { id: "cocina", emoji: "🍕", nombre: "Cocina Creativa", productos: [slotHornoCombo, slotFreidoraCombo].map(toProducto) },
    {
      id: "clima", emoji: "🌡️", nombre: "Combo Invierno Calefacción",
      slots: [
        { producto: toProducto(slotCaloventorCombo), cantidad: 1, label: "Turbocalefactor Liliana CW910 Split" },
        { producto: toProducto(slotVentilador), cantidad: 1, label: "Caloventor Neba 2000W Termostato" },
      ].filter((s) => s.producto),
    },
    {
      id: "sommier-1p", emoji: "🛏️", nombre: "Sommier 1 Plaza Completo",
      slots: [
        { producto: toProducto(slotSommier1p), cantidad: 1, label: "Sommier King Koil Sensations 0.80x2.00" },
        { producto: toProducto(slotColchon1p), cantidad: 1, label: "Colchón Inducol Clásico 80x190" },
        { producto: toProducto(slotAlmohadaEco), cantidad: 2, label: "Almohada Support Compacta Medium" },
      ].filter((s) => s.producto),
    },
    {
      id: "sommier-2p", emoji: "🛏️", nombre: "Sommier 2 Plazas Completo",
      slots: [
        { producto: toProducto(slotSommier2p), cantidad: 1, label: "Sommier King Koil Confort Sensations 1,40x1,90" },
        { producto: toProducto(slotColchon2p), cantidad: 1, label: "Colchón Inducol Clásico 140x190x23" },
        { producto: toProducto(slotAlmohadaEco), cantidad: 2, label: "Almohada Support Compacta Medium" },
      ].filter((s) => s.producto),
    },
  ];

  const trendingConPrecios = productosTrending.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria,
    imagen_url: p.imagen_url,
    precio_contado: calcularPrecioContado(p.precio_costo, cfg),
    precio_financiado: calcularPrecioFinanciado(p.precio_costo, cfg),
    precio_cuota: calcularPrecioCuota(p.precio_costo, cfg),
    cuotas: cfg.cuotas,
    entrega_inicial: calcularEntregaInicial(p.precio_costo),
  }));

  const gastronomicosConPrecios = productosGastronomicos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria,
    imagen_url: p.imagen_url,
    precio_contado: calcularPrecioContado(p.precio_costo, cfg),
    precio_financiado: calcularPrecioFinanciado(p.precio_costo, cfg),
    precio_cuota: calcularPrecioCuota(p.precio_costo, cfg),
    cuotas: cfg.cuotas,
    entrega_inicial: calcularEntregaInicial(p.precio_costo),
  }));

  const calefaccionConPrecios = productosCalefaccion.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria,
    imagen_url: p.imagen_url,
    precio_contado: calcularPrecioContado(p.precio_costo, cfg),
    precio_financiado: calcularPrecioFinanciado(p.precio_costo, cfg),
    precio_cuota: calcularPrecioCuota(p.precio_costo, cfg),
    cuotas: cfg.cuotas,
    entrega_inicial: calcularEntregaInicial(p.precio_costo),
  }));

  // Imágenes para el hero (4 productos variados)
  const heroImages = productosConPrecios.slice(0, 4);

  // Primeros 12 como "recién llegados"
  const destacados = productosConPrecios.slice(0, 12);

  // Secciones por categoría (máx 6 por sección, sin repetir los destacados)
  const usados = new Set(destacados.map((p) => p.id));
  const porCategoria: Record<string, typeof productosConPrecios> = {};
  for (const p of productosConPrecios) {
    if (usados.has(p.id)) continue;
    if (!porCategoria[p.categoria]) porCategoria[p.categoria] = [];
    if (porCategoria[p.categoria].length < 6) {
      porCategoria[p.categoria].push(p);
      usados.add(p.id);
    }
  }
  const todasSecciones = Object.entries(porCategoria).slice(0, 5);
  const idxGastro = todasSecciones.findIndex(([cat]) => cat === "Comercial y Gastronómico");
  const secciones = todasSecciones.filter(([cat]) => cat !== "Comercial y Gastronómico");
  const insertarOfertaEn = idxGastro >= 0 ? idxGastro : secciones.length;

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh" }}>
      <TopBar />
      <Navbar />
      <Subnav />
      <HeroSlider heroImages={heroImages} />

      <PromoGrid />

      {trendingConPrecios.length > 0 && (
        <ProductSection
          title="Lo más buscado ahora"
          products={trendingConPrecios}
          verTodosHref="/catalogo?categoria=Smart+TV"
        />
      )}

      <CategoryGrid />

      {calefaccionConPrecios.length > 0 && (
        <ProductSection
          title="🧥 Preparate para el frío — Estufas y caloventores"
          products={calefaccionConPrecios}
          verTodosHref="/catalogo?categoria=Climatizaci%C3%B3n"
        />
      )}

      {secciones.flatMap(([cat, prods], i) => {
        const items = [];
        if (i === insertarOfertaEn) {
          items.push(<OfertaSemanal key="oferta-semanal" products={gastronomicosConPrecios} />);
        }
        items.push(
          <ProductSection
            key={cat}
            title={cat}
            products={prods}
            verTodosHref={`/catalogo?categoria=${encodeURIComponent(cat)}`}
          />
        );
        return items;
      })}
      {insertarOfertaEn >= secciones.length && (
        <OfertaSemanal products={gastronomicosConPrecios} />
      )}

      <CombosSection combos={combos} />

      <TrustBar />
      <FinBanner />
      <Footer />
    </div>
  );
}
