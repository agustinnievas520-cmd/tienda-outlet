import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import {
  calcularPrecioContado,
  calcularPrecioFinanciado,
  calcularOpcionesFinanciamiento,
  formatearPrecio,
} from "@/lib/calculos";
import { resolverWhatsapp, esCodigoVendedor } from "@/lib/whatsapp";
import { GET as obtenerImagen } from "@/app/api/imagen/route";
import { PieConsultaVendedor } from "@/lib/historiaPie";

// Genera una imagen vertical (1080x1920) lista para historias de Instagram /
// estados de WhatsApp: foto del producto, entrega, cuotas semanal/quincenal/
// mensual y el WhatsApp del vendedor (?v=codigo) o el principal.

export const dynamic = "force-dynamic";

const W = 1080;
const H = 1920;
const AZUL = "#3B2A1E";
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

// Foto del producto ya limpia (mismo proceso que usa la página), recortando
// los bordes blancos para que el producto se vea lo más grande posible.
async function fotoProducto(request: NextRequest, imagenUrl: string): Promise<string | null> {
  try {
    const url = new URL("/api/imagen", request.url);
    url.searchParams.set("url", imagenUrl.split("?")[0]);
    const res = await obtenerImagen(new NextRequest(url));
    if (!res.ok || !res.headers.get("content-type")?.startsWith("image/jpeg")) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    let img = sharp(buffer).flatten({ background: "#ffffff" });
    try {
      const recortada = await img.clone().trim({ background: "#ffffff", threshold: 18 }).toBuffer();
      img = sharp(recortada);
    } catch {
      // si no hay nada que recortar, sigue con la original
    }
    const final = await img
      .resize(900, 900, { fit: "inside", withoutEnlargement: false })
      .jpeg({ quality: 88 })
      .toBuffer();
    return `data:image/jpeg;base64,${final.toString("base64")}`;
  } catch {
    return null;
  }
}

// Logo de la marca (el de Instagram), en dos partes: la casita y el nombre.
async function logo(): Promise<{ icono: string; texto: string }> {
  const [icono, texto] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "public", "logo-casa-icono.png")),
    fs.readFile(path.join(process.cwd(), "public", "logo-casa-texto.png")),
  ]);
  return {
    icono: `data:image/png;base64,${icono.toString("base64")}`,
    texto: `data:image/png;base64,${texto.toString("base64")}`,
  };
}

function formatearWhatsapp(numero: string): string {
  // 5493401642045 → 3401 642045 (formato local para leer fácil)
  const local = numero.replace(/^54/, "").replace(/^9/, "").replace(/^0/, "");
  if (local.length === 10) return `${local.slice(0, 4)} ${local.slice(4)}`;
  return local;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = Number((await params).id);
  const v = request.nextUrl.searchParams.get("v") ?? undefined;

  const [producto, config] = await Promise.all([
    Number.isFinite(id) ? prisma.producto.findUnique({ where: { id } }) : null,
    prisma.configuracion.findFirst(),
  ]);
  if (!producto || !config) {
    return new Response("Producto no encontrado", { status: 404 });
  }

  const [{ activo: whatsapp }, vendedor, foto, logoSrc, fuentes] = await Promise.all([
    resolverWhatsapp(esCodigoVendedor(v) ? v : undefined, config.whatsapp_numero, config.whatsapp_numero_2),
    esCodigoVendedor(v) && v !== "1" && v !== "2"
      ? prisma.vendedor.findUnique({ where: { codigo: v } })
      : null,
    fotoProducto(request, producto.imagen_url),
    logo(),
    cargarFuentes(),
  ]);

  const tienePrecio = producto.precio_costo > 0;
  const opciones = tienePrecio
    ? calcularOpcionesFinanciamiento(
        producto.precio_costo,
        calcularPrecioFinanciado(producto.precio_costo, config)
      )
    : [];
  const entrega = opciones[0]?.entrega ?? 0;
  const contado = tienePrecio ? calcularPrecioContado(producto.precio_costo, config) : 0;
  const nombreVendedor = vendedor?.activo ? vendedor.nombre : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          background: FONDO,
          fontFamily: "Inter",
          color: AZUL,
        }}
      >
        {/* Encabezado (deja lugar arriba para la barra de Instagram) */}
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
          <img src={logoSrc.icono} width={187} height={150} alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc.texto} width={420} height={111} alt="" />
        </div>

        {/* Foto */}
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
              background: DORADO,
              color: "white",
              fontSize: 30,
              fontWeight: 600,
              padding: "10px 28px",
              borderRadius: 999,
              alignSelf: "flex-start",
            }}
          >
            ENTREGA INMEDIATA
          </div>
          <div
            style={{
              display: "flex",
              width: 900,
              height: 530,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto} alt="" style={{ maxWidth: 860, maxHeight: 510, objectFit: "contain", borderRadius: 24 }} />
            ) : (
              <div style={{ display: "flex", fontSize: 40, color: "#9ca3af" }}>Sin imagen</div>
            )}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: producto.nombre.length > 60 ? 40 : 48,
              fontWeight: 600,
              textAlign: "center",
              lineHeight: 1.2,
              justifyContent: "center",
              maxWidth: 900,
            }}
          >
            {producto.nombre}
          </div>
          {producto.codigo && (
            <div
              style={{
                display: "flex",
                marginTop: 10,
                fontSize: 30,
                letterSpacing: 2,
                color: "#7A6650",
              }}
            >
              {`Cód. ${producto.codigo}`}
            </div>
          )}
        </div>

        {/* Precios */}
        {tienePrecio ? (
          <div style={{ display: "flex", flexDirection: "column", margin: "34px 50px 0", gap: 18 }}>
            {/* Contado y entrega, lado a lado */}
            <div style={{ display: "flex", gap: 18 }}>
              {[
                { titulo: "PRECIO CONTADO", valor: contado },
                { titulo: "ENTREGA INICIAL", valor: entrega },
              ].map((b) => (
                <div
                  key={b.titulo}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    background: "white",
                    border: `4px solid ${DORADO}`,
                    borderRadius: 28,
                    padding: "14px 10px 16px",
                  }}
                >
                  <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: 2, color: "#A67A3A" }}>
                    {b.titulo}
                  </div>
                  <div style={{ fontSize: 58, fontWeight: 600, marginTop: 2 }}>
                    {formatearPrecio(b.valor)}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 18 }}>
              {opciones.map((op) => (
                <div
                  key={op.modalidad}
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
                  <div style={{ fontSize: 30, color: "#3B2A1E", fontWeight: 600, letterSpacing: 2 }}>
                    {op.modalidad.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 50, fontWeight: 600, marginTop: 6 }}>
                    {formatearPrecio(op.cuota)}
                  </div>
                  <div style={{ fontSize: 26, opacity: 0.8, marginTop: 4 }}>
                    {`${op.cuotas} cuotas por ${op.frecuencia}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              margin: "40px 50px 0",
              fontSize: 52,
              fontWeight: 600,
            }}
          >
            Consultá precio y planes
          </div>
        )}

        {/* Pie: si la sube un vendedor, "Consultá con tu vendedor"; si no, el WhatsApp */}
        <div style={{ flex: 1, minHeight: 36 }} />
        {nombreVendedor ? (
          <PieConsultaVendedor />
        ) : (
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
            {nombreVendedor ? `Pedíselo a ${nombreVendedor} por WhatsApp` : "Pedilo por WhatsApp"}
          </div>
          <div style={{ fontSize: 66, fontWeight: 600, marginTop: 4 }}>
            {formatearWhatsapp(whatsapp)}
          </div>
        </div>
        )}
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: fuentes,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
