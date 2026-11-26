import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { resolverWhatsapp, esCodigoVendedor, limpiarNumero } from "@/lib/whatsapp";
import { GARANTIA_DIAS, IPHONES_USADOS } from "@/lib/data/iphonesUsados";
import {
  W,
  H,
  cargarFuentes,
  logo,
  formatearWhatsapp,
  Lienzo,
  Etiquetas,
  Escudo,
  Pastilla,
  RecuadroPrecio,
  Cuotas,
  BotonWhatsapp,
} from "@/lib/historiaEstilo";

// Historia 1080x1920 para los iPhone usados: mismo diseño negro y dorado que
// la de los productos, con los valores fijos de la lista (entrega y 16/8/4
// cuotas).

export const dynamic = "force-dynamic";

async function foto(rel: string): Promise<string | null> {
  try {
    const buf = await fs.readFile(path.join(process.cwd(), "public", rel.replace(/^\//, "")));
    const jpg = await sharp(buf)
      .flatten({ background: "#ffffff" })
      .trim({ background: "#ffffff", threshold: 10 })
      .resize(760, 660, { fit: "inside" })
      .jpeg({ quality: 90 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpg.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = IPHONES_USADOS.find((x) => x.id === id && x.disponible);
  if (!p) return new Response("Equipo no encontrado", { status: 404 });
  const v = request.nextUrl.searchParams.get("v") ?? undefined;

  const config = await prisma.configuracion.findFirst();
  const [{ activo }, vendedor, fotoSrc, logoSrc, fuentes] = await Promise.all([
    resolverWhatsapp(esCodigoVendedor(v) ? v : undefined, config?.whatsapp_numero ?? "", config?.whatsapp_numero_2 ?? ""),
    esCodigoVendedor(v) && v !== "1" && v !== "2" ? prisma.vendedor.findUnique({ where: { codigo: v } }) : null,
    foto(p.foto),
    logo(),
    cargarFuentes(),
  ]);
  const esVendedor = !!vendedor?.activo;
  const opciones = [
    { titulo: "SEMANAL", cuota: p.semanal, detalle: "16 cuotas semanales" },
    { titulo: "QUINCENAL", cuota: p.quincenal, detalle: "8 cuotas quincenales" },
    { titulo: "MENSUAL", cuota: p.mensual, detalle: "4 cuotas mensuales" },
  ];

  return new ImageResponse(
    (
      <Lienzo logoSrc={logoSrc}>
        <Etiquetas icono={<Escudo size={56} />} texto={`${GARANTIA_DIAS} DÍAS DE GARANTÍA`} />

        {/* Foto */}
        <div style={{ display: "flex", width: 940, height: 520, alignItems: "center", justifyContent: "center", marginTop: 18 }}>
          {fotoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotoSrc} alt="" style={{ maxWidth: 760, maxHeight: 500, objectFit: "contain" }} />
          ) : (
            <div style={{ display: "flex", fontSize: 40, color: "#9ca3af" }}>Sin imagen</div>
          )}
        </div>

        {/* Modelo y datos del equipo */}
        <div style={{ display: "flex", marginTop: 10, fontSize: 68, fontWeight: 600, letterSpacing: -1, lineHeight: 1.1 }}>
          {`${p.modelo} usado`}
        </div>
        <Pastilla texto={`${p.capacidad} · ${p.color} · Batería ${p.bateria}% · ${p.conCaja ? "Con caja" : "Sin caja"}`} />

        <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: 18, marginTop: 26 }}>
          <div style={{ display: "flex" }}>
            <RecuadroPrecio titulo="ENTREGA INICIAL" valor={p.entrega} dorado />
          </div>
          <Cuotas opciones={opciones} />
          <div style={{ display: "flex", justifyContent: "center", fontSize: 28, color: "#6B6358" }}>
            Sujeto a confirmación de stock
          </div>
        </div>

        <BotonWhatsapp
          texto={esVendedor ? "Consultá con tu vendedor" : `Pedilo al ${formatearWhatsapp(limpiarNumero(activo))}`}
        />
      </Lienzo>
    ),
    { width: W, height: H, fonts: fuentes, headers: { "Cache-Control": "no-store" } }
  );
}
