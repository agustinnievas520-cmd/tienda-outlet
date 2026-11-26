import type { Metadata } from "next";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { limpiarNumero, resolverWhatsapp, vendedorActivo } from "@/lib/whatsapp";
import { formatearPrecio } from "@/lib/calculos";
import { ACTUALIZADO, GARANTIA_DIAS, IPHONES_USADOS, ORDEN_MODELOS, type IphoneUsado } from "@/lib/data/iphonesUsados";
import TopBar from "@/components/home/TopBar";
import Navbar from "@/components/home/Navbar";
import Subnav from "@/components/home/Subnav";
import Footer from "@/components/home/Footer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "iPhone Usados con garantía y financiación — Outlet Hogar",
  description: `iPhone 13, 14, 15 y 16 usados con ${GARANTIA_DIAS} días de garantía. Financiación en 4 meses solo con DNI.`,
};

async function numeroPrincipal(): Promise<{ numero1: string; numero2: string }> {
  try {
    const config = await prisma.configuracion.findFirst();
    return {
      numero1: config?.whatsapp_numero ?? process.env.NEXT_PUBLIC_WHATSAPP ?? "5491100000000",
      numero2: config?.whatsapp_numero_2 ?? "",
    };
  } catch {
    return { numero1: process.env.NEXT_PUBLIC_WHATSAPP ?? "5491100000000", numero2: "" };
  }
}

function fechaLinda(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

const anclaModelo = (m: string) => m.toLowerCase().replace(/\s+/g, "-");

function Tarjeta({ p, whatsapp }: { p: IphoneUsado; whatsapp: string }) {
  const nombre = `${p.modelo} ${p.capacidad} ${p.color}`;
  const mensaje =
    `¡Hola! Quiero consultar stock del ${nombre} (batería ${p.bateria}%, ${p.conCaja ? "con caja" : "sin caja"}). ` +
    `Entrega inicial ${formatearPrecio(p.entrega)}. ¿Está disponible?`;
  const urlWA = `https://wa.me/${whatsapp}?text=${encodeURIComponent(mensaje)}`;

  return (
    <article className="bg-white rounded-3xl shadow-sm border border-[#EADBC4] overflow-hidden flex flex-col">
      <div className="relative bg-white aspect-square p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.foto} alt={`${nombre} (imagen ilustrativa)`} loading="lazy" className="w-full h-full object-contain" />
        <span className="absolute top-3 left-3 bg-[#3B2A1E] text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
          Usado · {GARANTIA_DIAS} días de garantía
        </span>
        <span className="absolute bottom-2 right-3 text-[10px] text-gray-400">Imagen ilustrativa</span>
      </div>

      <div className="p-4 sm:p-5 flex flex-col flex-1 border-t border-[#F3EADC]">
        <h3 className="font-semibold text-[#3B2A1E] text-xl leading-tight" style={{ fontFamily: "inherit" }}>
          {p.modelo}
        </h3>
        <p className="text-sm text-[#5A4530] mt-0.5">
          {p.capacidad} · {p.color}
        </p>

        <div className="flex flex-wrap gap-1.5 mt-3 text-xs">
          <span className="bg-[#F3EADC] text-[#3B2A1E] px-2.5 py-1 rounded-full">🔋 Batería {p.bateria}%</span>
          <span className="bg-[#F3EADC] text-[#3B2A1E] px-2.5 py-1 rounded-full">{p.conCaja ? "📦 Con caja" : "Sin caja"}</span>
          <span className="bg-[#F3EADC] text-[#3B2A1E] px-2.5 py-1 rounded-full">🛡️ Garantía {GARANTIA_DIAS} días</span>
        </div>

        <div className="mt-4 rounded-2xl bg-[#C9994F] text-white px-4 py-3">
          <p className="text-[11px] font-bold tracking-widest opacity-90">ENTREGA INICIAL</p>
          <p className="text-2xl font-bold leading-tight">{formatearPrecio(p.entrega)}</p>
        </div>

        <p className="text-xs font-semibold text-[#A67A3A] mt-4 mb-1.5">Y el resto en cuotas, elegí cómo pagar:</p>
        <ul className="text-sm text-[#3B2A1E] divide-y divide-[#F3EADC] border border-[#F3EADC] rounded-xl">
          <li className="flex justify-between px-3 py-2">
            <span>16 cuotas semanales</span>
            <strong>{formatearPrecio(p.semanal)}</strong>
          </li>
          <li className="flex justify-between px-3 py-2">
            <span>8 cuotas quincenales</span>
            <strong>{formatearPrecio(p.quincenal)}</strong>
          </li>
          <li className="flex justify-between px-3 py-2">
            <span>4 cuotas mensuales</span>
            <strong>{formatearPrecio(p.mensual)}</strong>
          </li>
        </ul>
        <p className="text-xs text-[#5A4530] mt-2">✅ Financiación solo con DNI · sin tarjeta ni banco</p>

        <a
          href={urlWA}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5b] text-white font-semibold py-3.5 rounded-2xl transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
            <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.94.95-3.48-.22-.36a9.43 9.43 0 1 1 7.99 4.41m8.02-17.45A11.27 11.27 0 0 0 12.05.75C5.8.75.72 5.83.72 12.08c0 2 .52 3.95 1.52 5.67L.62 23.25l5.64-1.48a11.3 11.3 0 0 0 5.78 1.47h.01c6.25 0 11.33-5.08 11.33-11.33 0-3.03-1.18-5.87-3.31-8.01" />
          </svg>
          Consultar stock por WhatsApp
        </a>
        <p className="text-[11px] text-center text-gray-400 mt-1.5">Reserva sujeta a confirmación de stock</p>
      </div>
    </article>
  );
}

export default async function IphoneUsadosPage({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { numero1, numero2 } = await numeroPrincipal();
  const { v: vQuery } = await searchParams;
  const cookieStore = await cookies();
  const v = vendedorActivo(vQuery, cookieStore.get("vendedor")?.value);
  const { activo, puntoVenta } = await resolverWhatsapp(v, numero1, numero2);
  // formato que pide WhatsApp para celulares de Argentina (549 + número)
  const whatsapp = limpiarNumero(activo);

  const disponibles = IPHONES_USADOS.filter((p) => p.disponible);
  const grupos = ORDEN_MODELOS.map((m) => ({
    modelo: m,
    equipos: disponibles.filter((p) => p.modelo === m).sort((a, b) => a.entrega - b.entrega || a.mensual - b.mensual),
  })).filter((g) => g.equipos.length > 0);

  return (
    <div style={{ background: "#F7F1E8", minHeight: "100vh" }}>
      <TopBar whatsappNumero={whatsapp} puntoVenta={puntoVenta} />
      <Navbar whatsappNumero={whatsapp} puntoVenta={puntoVenta} />
      <Subnav />

      <header className="bg-[#F3EADC] border-b-4 border-[#C9994F]">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
          <nav className="text-xs text-[#5A4530]" aria-label="Ubicación">
            <a href="/" className="hover:text-[#A67A3A]">Inicio</a>
            <span className="mx-1.5">›</span>
            <a href="/catalogo?categoria=Inform%C3%A1tica+y+Celulares" className="hover:text-[#A67A3A]">Tecnología</a>
            <span className="mx-1.5">›</span>
            <span className="text-[#3B2A1E] font-semibold">iPhone Usados</span>
          </nav>
          <h1 className="text-4xl sm:text-5xl font-semibold text-[#3B2A1E] mt-3">iPhone Usados</h1>
          <p className="text-[#5A4530] mt-2 max-w-2xl">
            Equipos seleccionados con <strong className="text-[#3B2A1E]">{GARANTIA_DIAS} días de garantía</strong>. Pagás una
            entrega inicial y el resto en <strong className="text-[#3B2A1E]">4 meses</strong>: semanal, quincenal o mensual,{" "}
            <strong className="text-[#3B2A1E]">solo con DNI</strong>.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 text-xs bg-white border border-[#EADBC4] rounded-full px-3 py-1.5 text-[#5A4530]">
            <span className="w-2 h-2 rounded-full bg-[#25D366]" />
            {disponibles.length} equipos disponibles según la última lista del proveedor · actualizada el {fechaLinda(ACTUALIZADO)}
          </p>

          {/* Atajos por modelo */}
          <div className="flex gap-2 overflow-x-auto mt-5 pb-1">
            {grupos.map((g) => (
              <a
                key={g.modelo}
                href={`#${anclaModelo(g.modelo)}`}
                className="flex-shrink-0 bg-white border border-[#C9994F]/50 text-[#3B2A1E] text-sm font-medium px-4 py-1.5 rounded-full hover:bg-[#C9994F] hover:text-white transition-colors"
              >
                {g.modelo} <span className="text-[#A67A3A]">({g.equipos.length})</span>
              </a>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        {grupos.map((g) => (
          <section key={g.modelo} id={anclaModelo(g.modelo)} className="scroll-mt-24">
            <div className="flex items-baseline gap-3 mb-4">
              <h2 className="text-3xl font-semibold text-[#3B2A1E]">{g.modelo}</h2>
              <span className="text-sm text-[#A67A3A]">
                {g.equipos.length} {g.equipos.length === 1 ? "equipo" : "equipos"}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {g.equipos.map((p) => (
                <Tarjeta key={p.id} p={p} whatsapp={whatsapp} />
              ))}
            </div>
          </section>
        ))}

        <section className="bg-white border border-[#EADBC4] rounded-3xl p-6 text-sm text-[#5A4530] grid sm:grid-cols-3 gap-4">
          <div>
            <p className="font-semibold text-[#3B2A1E]">🛡️ Garantía de {GARANTIA_DIAS} días</p>
            <p className="mt-1">Todos los equipos tienen garantía desde la entrega.</p>
          </div>
          <div>
            <p className="font-semibold text-[#3B2A1E]">🪪 Solo con DNI</p>
            <p className="mt-1">Sin tarjeta de crédito ni banco. Financiación propia de Outlet Hogar.</p>
          </div>
          <div>
            <p className="font-semibold text-[#3B2A1E]">📲 Stock sujeto a confirmación</p>
            <p className="mt-1">Las unidades pueden venderse rápido: consultá por WhatsApp antes de reservar.</p>
          </div>
        </section>
        <p className="text-[11px] text-gray-400 text-center">
          Las fotos son ilustrativas del modelo y color; no muestran el estado físico de cada unidad usada.
        </p>
      </main>

      <Footer whatsappNumero={whatsapp} puntoVenta={puntoVenta} />
    </div>
  );
}
