import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL requerida" }, { status: 400 });
  }

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

    const raw = Buffer.from(await res.arrayBuffer());
    const image = sharp(raw);

    let processed: Buffer;

    if (!isML) {
      // Imágenes de Viena: tapar logo del proveedor con blanco sólido (sin gradiente = sin artefactos JPEG)
      const { width = 400, height = 400 } = await image.metadata();
      const coverW = Math.round(width  * 0.26);
      const coverH = Math.round(height * 0.16);
      const white = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${coverW}" height="${coverH}">
          <rect width="${coverW}" height="${coverH}" fill="white"/>
        </svg>`
      );
      processed = await image
        .composite([{ input: white, top: height - coverH, left: 0 }])
        .jpeg({ quality: 90 })
        .toBuffer();
    } else {
      // Imágenes de MercadoLibre: ya son limpias, sin cover
      processed = await image.jpeg({ quality: 90 }).toBuffer();
    }

    return new NextResponse(processed as unknown as BodyInit, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "Error al obtener imagen" }, { status: 500 });
  }
}
