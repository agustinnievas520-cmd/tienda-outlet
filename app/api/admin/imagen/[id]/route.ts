import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = path.resolve("public/imagenes/productos");
const LOGO_PATH = path.resolve("public/logo-marca.svg");
const FINAL = 800;

async function procesarImagen(srcBuffer: Buffer, outPath: string, tmpSuffix: string): Promise<void> {
  const patchH = 160;
  const patchTop = FINAL - patchH;

  const whitePatch = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${FINAL}" height="${patchH}">
      <rect width="${FINAL}" height="${patchH}" fill="white"/>
    </svg>`
  );
  const logoSize = 130;
  const logoLeft = Math.round((FINAL - logoSize) / 2);
  const logoTop = patchTop + Math.round((patchH - logoSize) / 2);
  const logoBuffer = await sharp(LOGO_PATH)
    .resize(logoSize, logoSize, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();

  const tmpPath = outPath.replace(".webp", `_upload${tmpSuffix}_tmp.webp`);

  await sharp(srcBuffer)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .resize(FINAL, FINAL, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
    .composite([
      { input: whitePatch, left: 0, top: patchTop, blend: "over" },
      { input: logoBuffer, left: logoLeft, top: logoTop, blend: "over" },
    ])
    .webp({ quality: 88 })
    .toFile(tmpPath);

  const buf = fs.readFileSync(tmpPath);
  fs.writeFileSync(outPath, buf);
  fs.unlinkSync(tmpPath);
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

    const arrayBuffer = await file.arrayBuffer();
    const srcBuffer = Buffer.from(arrayBuffer);

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const outPath = path.join(OUTPUT_DIR, `${idNum}.webp`);

    await procesarImagen(srcBuffer, outPath, String(idNum));

    // Actualizar imagen_url en DB si no es local todavía
    const nuevaUrl = `/imagenes/productos/${idNum}.webp`;
    if (producto.imagen_url !== nuevaUrl) {
      await prisma.producto.update({
        where: { id: idNum },
        data: { imagen_url: nuevaUrl },
      });
    }

    return NextResponse.json({ ok: true, imagen_url: nuevaUrl });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
