import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { formatearPrecio } from "@/lib/calculos";
import { resolverWhatsapp, esCodigoVendedor, limpiarNumero } from "@/lib/whatsapp";
import { GARANTIA_DIAS, IPHONES_USADOS } from "@/lib/data/iphonesUsados";

// Historia 1080x1920 para los iPhone usados (mismo diseño que la de los
// productos, pero con los valores fijos de la lista: entrega y 16/8/4 cuotas).

export const dynamic = "force-dynamic";

const W = 1080;
const H = 1920;
const MARRON = "#3B2A1E";
const DORADO = "#C9994F";
const FONDO = "#F7F1E8";

async function cargarFuentes() {
  const dir = path.join(process.cwd(), "lib", "fonts");
  const [regular, bold] = await Promise.all([
    fs.readFile(path.join(dir, "inter-400.woff")),
    fs.readFile(path.join(dir, "inter-600.woff")),
  ]);
  return [
    { name: "Inter", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: bold, weight: 600 as const, style: "normal" as const },
  ];
}

async function aDataUrl(archivo: string, tipo: "png" | "jpeg") {
  const buf = await fs.readFile(path.join(process.cwd(), "public", archivo));
  return `data:image/${tipo};base64,${buf.toString("base64")}`;
}

async function foto(rel: string): Promise<string | null> {
  try {
    const buf = await fs.readFile(path.join(process.cwd(), "public", rel.replace(/^\//, "")));
    const jpg = await sharp(buf)
      .flatten({ background: "#ffffff" })
      .trim({ background: "#ffffff", threshold: 10 })
      .resize(700, 640, { fit: "inside" })
      .jpeg({ quality: 90 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpg.toString("base64")}`;
  } catch {
    return null;
  }
}

function formatearWhatsapp(numero: string): string {
  const local = numero.replace(/^54/, "").replace(/^9/, "").replace(/^0/, "");
  if (local.length === 10) return `${local.slice(0, 4)} ${local.slice(4)}`;
  return local;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = IPHONES_USADOS.find((x) => x.id === id && x.disponible);
  if (!p) return new Response("Equipo no encontrado", { status: 404 });
  const v = request.nextUrl.searchParams.get("v") ?? undefined;

  const config = await prisma.configuracion.findFirst();
  const [{ activo }, vendedor, fotoSrc, icono, texto, fuentes] = await Promise.all([
    resolverWhatsapp(esCodigoVendedor(v) ? v : undefined, config?.whatsapp_numero ?? "", config?.whatsapp_numero_2 ?? ""),
    esCodigoVendedor(v) && v !== "1" && v !== "2" ? prisma.vendedor.findUnique({ where: { codigo: v } }) : null,
    foto(p.foto),
    aDataUrl("logo-casa-icono.png", "png"),
    aDataUrl("logo-casa-texto.png", "png"),
    cargarFuentes(),
  ]);
  const nombreVendedor = vendedor?.activo ? vendedor.nombre : "";
  const opciones = [
    { titulo: "SEMANAL", cuota: p.semanal, detalle: "16 cuotas semanales" },
    { titulo: "QUINCENAL", cuota: p.quincenal, detalle: "8 cuotas quincenales" },
    { titulo: "MENSUAL", cuota: p.mensual, detalle: "4 cuotas mensuales" },
  ];

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: FONDO, fontFamily: "Inter", color: MARRON }}>
        {/* Encabezado */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 40,
            background: "white",
            paddingTop: 140,
            paddingBottom: 34,
            borderBottom: `8px solid ${DORADO}`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={icono} width={187} height={150} alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={texto} width={420} height={111} alt="" />
        </div>

        {/* Foto y datos del equipo */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            margin: "36px 50px 0",
            background: "white",
            borderRadius: 40,
            padding: "28px 30px 30px",
            boxShadow: "0 10px 40px rgba(59,42,30,0.10)",
          }}
        >
          <div
            style={{
              display: "flex",
              background: MARRON,
              color: "white",
              fontSize: 30,
              fontWeight: 600,
              padding: "10px 28px",
              borderRadius: 999,
              alignSelf: "flex-start",
            }}
          >
            {`USADO · ${GARANTIA_DIAS} DÍAS DE GARANTÍA`}
          </div>
          <div style={{ display: "flex", width: 900, height: 600, alignItems: "center", justifyContent: "center" }}>
            {fotoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoSrc} alt="" style={{ maxWidth: 700, maxHeight: 580, objectFit: "contain" }} />
            ) : (
              <div style={{ display: "flex", fontSize: 40, color: "#9ca3af" }}>Sin imagen</div>
            )}
          </div>
          <div style={{ display: "flex", fontSize: 58, fontWeight: 600, lineHeight: 1.1 }}>{p.modelo}</div>
          <div style={{ display: "flex", fontSize: 36, marginTop: 8, color: "#5A4530" }}>
            {`${p.capacidad} · ${p.color} · Batería ${p.bateria}% · ${p.conCaja ? "Con caja" : "Sin caja"}`}
          </div>
        </div>

        {/* Precios */}
        <div style={{ display: "flex", flexDirection: "column", margin: "34px 50px 0", gap: 18 }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 18, fontSize: 40 }}>
            <span>Llevátelo con</span>
            <span style={{ fontSize: 60, fontWeight: 600 }}>{formatearPrecio(p.entrega)}</span>
            <span>de entrega</span>
          </div>
          <div style={{ display: "flex", gap: 18 }}>
            {opciones.map((op) => (
              <div
                key={op.titulo}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  background: DORADO,
                  color: "white",
                  borderRadius: 28,
                  padding: "22px 10px",
                }}
              >
                <div style={{ fontSize: 30, color: MARRON, fontWeight: 600, letterSpacing: 2 }}>{op.titulo}</div>
                <div style={{ fontSize: 48, fontWeight: 600, marginTop: 6 }}>{formatearPrecio(op.cuota)}</div>
                <div style={{ fontSize: 25, opacity: 0.85, marginTop: 4 }}>{op.detalle}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "center", fontSize: 30, color: "#5A4530" }}>
            Solo con DNI · Sujeto a confirmación de stock
          </div>
        </div>

        {/* Pie con WhatsApp */}
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: "#B5853F",
            color: "white",
            paddingTop: 34,
            paddingBottom: 190,
          }}
        >
          <div style={{ fontSize: 34, letterSpacing: 1 }}>
            {nombreVendedor ? `Pedíselo a ${nombreVendedor} por WhatsApp` : "Consultá stock por WhatsApp"}
          </div>
          <div style={{ fontSize: 66, fontWeight: 600, marginTop: 4 }}>{formatearWhatsapp(limpiarNumero(activo))}</div>
        </div>
      </div>
    ),
    { width: W, height: H, fonts: fuentes, headers: { "Cache-Control": "no-store" } }
  );
}
