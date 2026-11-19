import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import path from "path";
import fs from "fs";

const SELLO_PATH = path.join(process.cwd(), "public", "sello-outlet.png");

// Casi todas las fotos de Viena traen el logo abajo a la izquierda, pero
// algunas lo traen abajo a la derecha. Cuenta píxeles del rojo del logo en
// cada rincón inferior: si solo aparece a la derecha, el sello va a la derecha.
async function ladoDelLogo(buf: Buffer): Promise<"izquierda" | "derecha"> {
  try {
    const { data } = await sharp(buf)
      .removeAlpha()
      .resize(200, 200, { fit: "fill" })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const contarRojo = (x0: number, x1: number) => {
      let n = 0;
      for (let y = 160; y < 200; y++)
        for (let x = x0; x < x1; x++) {
          const k = (y * 200 + x) * 3;
          const r = data[k], g = data[k + 1], b = data[k + 2];
          if (r > 150 && g < 70 && b < 90 && r - g > 100) n++;
        }
      return n;
    };
    return contarRojo(136, 200) >= 15 && contarRojo(0, 64) < 15 ? "derecha" : "izquierda";
  } catch {
    return "izquierda";
  }
}

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

  // Imágenes de Viena: su logo está en la esquina inferior izquierda.
  // Se tapa solo ese rincón con el sello de Outlet Hogar (30% x 18% de la foto),
  // así el logo de Viena no se ve y el producto no queda cortado abajo.
  try {
    const image = sharp(raw!).flatten({ background: "#ffffff" });
    const { width = 400, height = 400 } = await sharp(raw!).metadata();
    const selloW = Math.round(width * 0.30);
    const selloH = Math.round(height * 0.18);
    const margen = Math.round(Math.min(width, height) * 0.005);
    const sello = await sharp(fs.readFileSync(SELLO_PATH))
      .resize(selloW, selloH, { fit: "fill" })
      .png()
      .toBuffer();
    const lado = await ladoDelLogo(raw!);
    const processed = await image
      .composite([{
        input: sello,
        top: height - selloH - margen,
        left: lado === "derecha" ? width - selloW - margen : margen,
      }])
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
