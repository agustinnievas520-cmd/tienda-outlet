import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";

// Subida de foto de un producto desde el admin.
// La foto se guarda en la base de datos (tabla FotoSubida), porque en Vercel
// no se pueden guardar archivos. Se deja cuadrada, con fondo blanco, y se le
// pone el sello de Outlet Hogar chico en el rincón de abajo a la izquierda,
// sin tapar el resto del producto.

const SELLO_PATH = path.join(process.cwd(), "public", "sello-outlet.png");
const FINAL = 900;

async function procesarImagen(srcBuffer: Buffer): Promise<Buffer> {
  const selloW = Math.round(FINAL * 0.24);
  const selloH = Math.round(selloW * 0.6);
  const margen = Math.round(FINAL * 0.01);
  const sello = await sharp(fs.readFileSync(SELLO_PATH))
    .resize(selloW, selloH, { fit: "fill" })
    .png()
    .toBuffer();

  return sharp(srcBuffer)
    .rotate() // respeta la orientación de las fotos sacadas con el celular
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .resize(FINAL, FINAL, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
    .composite([{ input: sello, left: margen, top: FINAL - selloH - margen }])
    .jpeg({ quality: 88 })
    .toBuffer();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const idNum = parseInt(id, 10);
  if (isNaN(idNum)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const producto = await prisma.producto.findUnique({ where: { id: idNum } });
  if (!producto) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("imagen") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No se recibió ninguna imagen" }, { status: 400 });
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Formato no soportado. Usá JPG, PNG o WebP." }, { status: 400 });
    }

    const srcBuffer = Buffer.from(await file.arrayBuffer());
    const datos = await procesarImagen(srcBuffer);

    await prisma.fotoSubida.upsert({
      where: { productoId: idNum },
      create: { productoId: idNum, datos },
      update: { datos },
    });

    // La marca de tiempo en la dirección hace que todos vean la foto nueva
    // al instante (las fotos se guardan en caché por un día).
    const nuevaUrl = `/subidas/${idNum}-${Date.now()}`;
    await prisma.producto.update({ where: { id: idNum }, data: { imagen_url: nuevaUrl } });

    return NextResponse.json({ ok: true, imagen_url: nuevaUrl });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
