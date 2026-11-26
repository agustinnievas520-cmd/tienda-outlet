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

// Genera una imagen vertical (1080x1920) lista para historias de Instagram /
// estados de WhatsApp: foto del producto, código, contado, entrega, cuotas
// semanal/quincenal/mensual y el WhatsApp del vendedor (?v=codigo) o el
// principal. Estética negra y dorada.

export const dynamic = "force-dynamic";

const W = 1080;
const H = 1920;
const NEGRO = "#0E0D0B";
const TINTA = "#141210";
const DORADO = "#C9994F";
// Brillo metálico de los detalles dorados
const ORO = "linear-gradient(135deg, #A87B32 0%, #E8C87A 38%, #F6E1A6 52%, #CDA052 72%, #9C7230 100%)";
const ORO_SUAVE = "linear-gradient(135deg, #C99B4E 0%, #EED39A 50%, #C99B4E 100%)";

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

// Logo de la marca: la casita dorada y el nombre en blanco (sobre fondo negro).
async function logo(): Promise<{ icono: string; texto: string }> {
  const dir = path.join(process.cwd(), "public");
  const [icono, textoOriginal] = await Promise.all([
    fs.readFile(path.join(dir, "logo-casa-icono.png")),
    fs.readFile(path.join(dir, "logo-casa-texto.png")),
  ]);
  // El nombre viene en marrón: se pinta de blanco conservando la transparencia
  const { width, height } = await sharp(textoOriginal).metadata();
  const alfa = await sharp(textoOriginal).ensureAlpha().extractChannel("alpha").toBuffer();
  const texto = await sharp({ create: { width: width!, height: height!, channels: 3, background: "#ffffff" } })
    .joinChannel(alfa)
    .png()
    .toBuffer();
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

// "$ 406.600" → "$406.600" (más compacto, como en los carteles)
function precio(valor: number): string {
  return formatearPrecio(valor).replace(/\s/g, "");
}

const PLURAL: Record<string, string> = { semana: "semanales", quincena: "quincenales", mes: "mensuales" };

// ─── Íconos (dibujados a mano para no depender de archivos) ──────────────

function Camion({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 100 70">
      <g stroke={TINTA} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M 30 10 H 66 V 50 H 30" />
        <path d="M 66 22 H 82 L 94 36 V 50 H 88" />
        <path d="M 4 22 H 22 M 10 34 H 24 M 2 46 H 18" />
        <circle cx="42" cy="54" r="8" />
        <circle cx="80" cy="54" r="8" />
      </g>
    </svg>
  );
}

function Dni({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 100 72">
      <g stroke={TINTA} strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <rect x="4" y="4" width="92" height="64" rx="8" />
        <path d="M 4 18 H 96" />
        <circle cx="30" cy="38" r="8" />
        <path d="M 16 58 C 18 48, 42 48, 44 58" />
        <path d="M 56 34 H 84 M 56 46 H 84 M 56 58 H 74" />
      </g>
    </svg>
  );
}

function Calendario({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <g stroke={DORADO} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <rect x="8" y="16" width="84" height="76" rx="12" />
        <path d="M 8 38 H 92 M 30 6 V 24 M 70 6 V 24" />
      </g>
      <g fill={DORADO}>
        <rect x="24" y="50" width="12" height="10" rx="2" />
        <rect x="44" y="50" width="12" height="10" rx="2" />
        <rect x="64" y="50" width="12" height="10" rx="2" />
        <rect x="24" y="68" width="12" height="10" rx="2" />
        <rect x="44" y="68" width="12" height="10" rx="2" />
      </g>
    </svg>
  );
}

function Whatsapp({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <path
        d="M 50 8 C 26 8, 8 26, 8 49 C 8 57, 10 64, 14 70 L 8 92 L 31 86 C 37 89, 43 91, 50 91 C 73 91, 92 73, 92 49 C 92 26, 73 8, 50 8 Z"
        stroke={TINTA}
        strokeWidth={7}
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M 36 28 C 33 28, 29 32, 29 38 C 29 50, 46 68, 60 70 C 66 71, 71 67, 71 63 L 71 59 L 61 54 L 56 60 C 50 58, 42 50, 40 44 L 46 39 L 41 28 Z"
        fill={TINTA}
      />
    </svg>
  );
}

function Destellos({ lado }: { lado: "izq" | "der" }) {
  const x = (n: number) => (lado === "izq" ? n : 60 - n);
  const d = `M ${x(16)} 10 L ${x(40)} 28 M ${x(4)} 50 L ${x(40)} 50 M ${x(16)} 90 L ${x(40)} 72`;
  return (
    <svg width={50} height={84} viewBox="0 0 60 100">
      <path d={d} stroke={DORADO} strokeWidth={7} strokeLinecap="round" fill="none" />
    </svg>
  );
}

// Franjas doradas en diagonal (esquinas del fondo negro)
function Franja({ top, left, ancho, opacidad }: { top: number; left: number; ancho: number; opacidad: number }) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        width: ancho,
        height: 1400,
        background: ORO,
        opacity: opacidad,
        transform: "rotate(35deg)",
      }}
    />
  );
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
  const esVendedor = !!vendedor?.activo;

  // El nombre largo ocupa más renglones: la foto se achica para que entre todo
  const largo = producto.nombre.length;
  const tamNombre = largo > 70 ? 46 : largo > 40 ? 52 : 60;
  const renglones = largo > 70 ? 3 : largo > 32 ? 2 : 1;
  const altoFoto =
    560 - (renglones - 1) * 58 + (producto.codigo ? 0 : 60) + (tienePrecio ? 0 : 300);

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: NEGRO,
          fontFamily: "Inter",
          color: TINTA,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Fondo: franjas doradas en las esquinas */}
        <Franja top={-640} left={60} ancho={70} opacidad={0.9} />
        <Franja top={-660} left={150} ancho={22} opacidad={0.5} />
        <Franja top={-600} left={1080} ancho={120} opacidad={0.85} />
        <Franja top={1300} left={-120} ancho={90} opacidad={0.85} />
        <Franja top={1260} left={-200} ancho={24} opacidad={0.5} />
        <Franja top={1250} left={1110} ancho={80} opacidad={0.85} />

        {/* Logo (deja lugar arriba para la barra de Instagram) */}
        <div style={{ display: "flex", alignItems: "center", gap: 36, marginTop: 120 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc.icono} width={175} height={140} alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc.texto} width={400} height={105} alt="" />
        </div>

        {/* Tarjeta con borde dorado */}
        <div
          style={{
            display: "flex",
            marginTop: 30,
            padding: 7,
            borderRadius: 50,
            background: ORO,
            width: 1010,
            boxShadow: "0 0 60px rgba(201,153,79,0.35)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
              background: "linear-gradient(180deg, #FFFFFF 0%, #F3F1EC 100%)",
              borderRadius: 44,
              padding: "30px 28px 30px",
            }}
          >
            {/* Etiquetas */}
            <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  background: ORO,
                  borderRadius: 999,
                  padding: "14px 34px 14px 26px",
                  fontSize: 40,
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  boxShadow: "0 6px 14px rgba(120,85,30,0.25)",
                }}
              >
                <Camion size={64} />
                ENTREGA INMEDIATA
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  background: "white",
                  border: `4px solid ${DORADO}`,
                  borderRadius: 26,
                  padding: "10px 24px",
                }}
              >
                <Dni size={70} />
                <div style={{ display: "flex", flexDirection: "column", fontSize: 32, fontWeight: 600, lineHeight: 1.05 }}>
                  <span>SOLO</span>
                  <span>CON DNI</span>
                </div>
              </div>
            </div>

            {/* Foto */}
            <div
              style={{
                display: "flex",
                width: 940,
                height: altoFoto,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 18,
              }}
            >
              {foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={foto}
                  alt=""
                  style={{ maxWidth: 900, maxHeight: altoFoto - 10, objectFit: "contain", borderRadius: 20 }}
                />
              ) : (
                <div style={{ display: "flex", fontSize: 40, color: "#9ca3af" }}>Sin imagen</div>
              )}
            </div>

            {/* Nombre y código */}
            <div
              style={{
                display: "flex",
                marginTop: 14,
                fontSize: tamNombre,
                fontWeight: 600,
                textAlign: "center",
                lineHeight: 1.15,
                letterSpacing: -0.5,
                justifyContent: "center",
                maxWidth: 930,
              }}
            >
              {producto.nombre}
            </div>
            {producto.codigo && (
              <div
                style={{
                  display: "flex",
                  marginTop: 14,
                  background: ORO_SUAVE,
                  borderRadius: 18,
                  padding: "8px 30px",
                  fontSize: 34,
                  fontWeight: 600,
                  letterSpacing: 1.5,
                }}
              >
                {`Cód. ${producto.codigo}`}
              </div>
            )}

            {tienePrecio ? (
              <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: 18, marginTop: 26 }}>
                {/* Contado y entrega */}
                <div style={{ display: "flex", gap: 18 }}>
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      background: "white",
                      border: `4px solid ${DORADO}`,
                      borderRadius: 30,
                      padding: "16px 10px 18px",
                    }}
                  >
                    <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: 0.5 }}>PRECIO CONTADO</div>
                    <div style={{ fontSize: 80, fontWeight: 600, letterSpacing: -2, lineHeight: 1.1 }}>
                      {precio(contado)}
                    </div>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      background: ORO,
                      borderRadius: 30,
                      padding: "20px 10px 22px",
                      boxShadow: "0 8px 18px rgba(120,85,30,0.3)",
                    }}
                  >
                    <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: 0.5 }}>ENTREGA INICIAL</div>
                    <div style={{ fontSize: 80, fontWeight: 600, letterSpacing: -2, lineHeight: 1.1 }}>
                      {precio(entrega)}
                    </div>
                  </div>
                </div>

                {/* Cuotas */}
                <div style={{ display: "flex", gap: 14 }}>
                  {opciones.map((op) => (
                    <div
                      key={op.modalidad}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        background: "linear-gradient(180deg, #2A2621 0%, #0E0D0B 100%)",
                        color: "white",
                        borderRadius: 26,
                        padding: "18px 6px 20px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 31, fontWeight: 600 }}>
                        <Calendario size={38} />
                        {op.modalidad.toUpperCase()}
                      </div>
                      <div style={{ fontSize: 58, fontWeight: 600, color: "#E7C47A", letterSpacing: -1, marginTop: 4 }}>
                        {precio(op.cuota)}
                      </div>
                      <div style={{ fontSize: 26, marginTop: 2 }}>
                        {`${op.cuotas} cuotas ${PLURAL[op.frecuencia]}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", marginTop: 30, fontSize: 52, fontWeight: 600 }}>
                Consultá precio y planes
              </div>
            )}

            {/* Botón: vendedor o WhatsApp de la tienda */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 24 }}>
              <Destellos lado="izq" />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  background: ORO,
                  borderRadius: 999,
                  padding: "18px 44px",
                  fontSize: 48,
                  fontWeight: 600,
                  letterSpacing: -0.5,
                  boxShadow: "0 8px 18px rgba(120,85,30,0.3)",
                }}
              >
                <Whatsapp size={64} />
                {esVendedor ? "Consultá con tu vendedor" : `Pedilo al ${formatearWhatsapp(whatsapp)}`}
              </div>
              <Destellos lado="der" />
            </div>
          </div>
        </div>
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
