import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import path from "path";
import fs from "fs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL requerida" }, { status: 400 });
  }

  let raw: Buffer;
  let isLocal = false;

  if (url.startsWith("/imagenes/")) {
    // Imagen local: leer desde filesystem
    isLocal = true;
    const cleanPath = url.split("?")[0];
    const filePath = path.join(process.cwd(), "public", cleanPath);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
    }
    raw = fs.readFileSync(filePath);
  } else {
    // Imagen externa: validar origen
    const ALLOWED = [
      "https://vienamuebles.com/",
      "https://http2.mlstatic.com/",
      "https://mlstatic.com/",
    ];
    if (!ALLOWED.some(prefix => url.startsWith(prefix))) {
      return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
    }

    const isML = url.includes("mlstatic.com");
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: isML ? "https://www.mercadolibre.com.ar/" : "https://vienamuebles.com/",
        },
        next: { revalidate: 86400 },
      });
      if (!res.ok) {
        return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
      }
      raw = Buffer.from(await res.arrayBuffer());

      // Imágenes de MercadoLibre: ya son limpias, sin cover
      if (isML) {
        const processed = await sharp(raw).jpeg({ quality: 90 }).toBuffer();
        return new NextResponse(processed as unknown as BodyInit, {
          headers: {
            "Content-Type": "image/jpeg",
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          },
        });
      }
    } catch {
      return NextResponse.json({ error: "Error al obtener imagen" }, { status: 500 });
    }
  }

  // Aplicar cover blanco sobre el logo del proveedor (bottom-left)
  try {
    const image = sharp(raw!);
    const { width = 400, height = 400 } = await image.metadata();
    const coverW = Math.round(width  * 0.30);
    const coverH = Math.round(height * 0.18);
    const white = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${coverW}" height="${coverH}">
        <rect width="${coverW}" height="${coverH}" fill="white"/>
      </svg>`
    );
    const processed = await image
      .composite([{ input: white, top: height - coverH, left: 0 }])
      .jpeg({ quality: 90 })
      .toBuffer();

    return new NextResponse(processed as unknown as BodyInit, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "Error procesando imagen" }, { status: 500 });
  }
}
