import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import {
  calcularPrecioContado,
  calcularPrecioFinanciado,
  calcularOpcionesFinanciamiento,
} from "@/lib/calculos";
import { resolverWhatsapp, esCodigoVendedor } from "@/lib/whatsapp";
import { GET as obtenerImagen } from "@/app/api/imagen/route";
import {
  W,
  H,
  cargarFuentes,
  logo,
  formatearWhatsapp,
  Lienzo,
  Etiquetas,
  Camion,
  Pastilla,
  RecuadroPrecio,
  Cuotas,
  BotonWhatsapp,
} from "@/lib/historiaEstilo";

// Genera una imagen vertical (1080x1920) lista para historias de Instagram /
// estados de WhatsApp: foto del producto, código, contado, entrega, cuotas
// semanal/quincenal/mensual y el WhatsApp del vendedor (?v=codigo) o el
// principal. Estética negra y dorada (ver lib/historiaEstilo.tsx).

export const dynamic = "force-dynamic";

const PLURAL: Record<string, string> = { semana: "semanales", quincena: "quincenales", mes: "mensuales" };

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
      <Lienzo logoSrc={logoSrc}>
        <Etiquetas icono={<Camion size={64} />} texto="ENTREGA INMEDIATA" />

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
        {producto.codigo && <Pastilla texto={`Cód. ${producto.codigo}`} />}

        {tienePrecio ? (
          <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: 18, marginTop: 26 }}>
            <div style={{ display: "flex", gap: 18 }}>
              <RecuadroPrecio titulo="PRECIO CONTADO" valor={contado} />
              <RecuadroPrecio titulo="ENTREGA INICIAL" valor={entrega} dorado />
            </div>
            <Cuotas
              opciones={opciones.map((op) => ({
                titulo: op.modalidad.toUpperCase(),
                cuota: op.cuota,
                detalle: `${op.cuotas} cuotas ${PLURAL[op.frecuencia]}`,
              }))}
            />
          </div>
        ) : (
          <div style={{ display: "flex", marginTop: 30, fontSize: 52, fontWeight: 600 }}>
            Consultá precio y planes
          </div>
        )}

        <BotonWhatsapp texto={esVendedor ? "Consultá con tu vendedor" : `Pedilo al ${formatearWhatsapp(whatsapp)}`} />
      </Lienzo>
    ),
    {
      width: W,
      height: H,
      fonts: fuentes,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
