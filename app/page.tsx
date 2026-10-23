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
import ZonaCobertura from "@/components/home/ZonaCobertura";
import CategoryGrid from "@/components/home/CategoryGrid";
import ProductSection from "@/components/home/ProductSection";
import PromoGrid from "@/components/home/PromoGrid";
import OfertaSemanal from "@/components/home/OfertaSemanal";
import FinBanner from "@/components/home/FinBanner";
import Footer from "@/components/home/Footer";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [config, todosLosProductos, productosTrending, productosVerano, productosGastronomicos,
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
      // Ventiladores
      prisma.producto.findMany({
        where: { disponible: true, nombre: { contains: "entilador" } },
        take: 4,
        orderBy: { precio_costo: "asc" },
      }),
      // Aires acondicionados / split (excluye el turbocalefactor "tipo split")
      prisma.producto.findMany({
        where: {
          disponible: true,
          OR: [
            { nombre: { contains: "ire acondicionado" } },
            { nombre: { contains: "split", mode: "insensitive" } },
          ],
          AND: [{ nombre: { not: { contains: "alefactor" } } }],
        },
        take: 3,
        orderBy: { precio_costo: "asc" },
      }),
      // Piletas
      prisma.producto.findMany({
        where: { disponible: true, nombre: { contains: "ileta" } },
        take: 3,
        orderBy: { precio_costo: "asc" },
      }),
      // Reposeras
      prisma.producto.findMany({
        where: { disponible: true, nombre: { contains: "eposera" } },
        take: 2,
        orderBy: { precio_costo: "asc" },
      }),
      // Sombrillas
      prisma.producto.findMany({
        where: { disponible: true, nombre: { contains: "ombrilla" } },
        take: 2,
        orderBy: { precio_costo: "asc" },
      }),
    ]).then(([ventiladores, aires, piletas, reposeras, sombrillas]: [any[], any[], any[], any[], any[]]) => {
      const vistos = new Set<number>();
      return [...ventiladores, ...aires, ...piletas, ...reposeras, ...sombrillas].filter(
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

  const veranoConPrecios = productosVerano.map((p) => ({
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

      {veranoConPrecios.length > 0 && (
        <ProductSection
          title="🏖️ Preparate para el verano — Piletas, ventiladores y aires"
          products={veranoConPrecios}
          verTodosHref="/catalogo"
        />
      )}

      <TrustBar />
      <ZonaCobertura />
      <FinBanner />
      <Footer />
    </div>
  );
}
