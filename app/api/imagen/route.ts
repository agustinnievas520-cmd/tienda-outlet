import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import path from "path";
import fs from "fs";

const VIENA_PLACEHOLDER = "https://vienamuebles.com/wp-content/uploads/clientResources/marca-y-producto_no-image.jpg";

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="#f3f4f6"/>
  <g transform="translate(200,130)" fill="#d1d5db">
    <rect x="-40" y="-40" width="80" height="60" rx="4"/>
    <polygon points="-50,20 0,-10 50,20"/>
    <circle cx="20" cy="-20" r="10"/>
  </g>
  <text x="200" y="210" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9ca3af">Sin imagen disponible</text>
</svg>`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL requerida" }, { status: 400 });
  }

  // Placeholder/logo de Viena (incl. el usado por el sitio nuevo como imagen de carga
  // cuando el producto no tiene foto real): devolver SVG neutro sin branding del proveedor
  if (url === VIENA_PLACEHOLDER || url.includes("logo-vienamuebles")) {
    return new NextResponse(PLACEHOLDER_SVG, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      },
    });
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
      "https://www.vienamuebles.com/",
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

  // Imágenes locales: ya son limpias, no necesitan cover
  if (isLocal) {
    try {
      const processed = await sharp(raw!).jpeg({ quality: 90 }).toBuffer();
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

  // Imágenes de Viena: tapar logo con franja blanca en todo el ancho, 22% desde abajo
  try {
    const image = sharp(raw!);
    const { width = 400, height = 400 } = await image.metadata();
    const coverH = Math.round(height * 0.22);
    const white = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${coverH}">
        <rect width="${width}" height="${coverH}" fill="white"/>
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
