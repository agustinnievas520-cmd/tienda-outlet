import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { aplicarSello } from "@/lib/selloViena";
import path from "path";
import fs from "fs";

const SELLO_PATH = path.join(process.cwd(), "public", "sello-outlet.png");

// en la franja blanca de abajo (x 335-465, y 655-785).
async function tieneLogoViejo(buf: Buffer): Promise<boolean> {
  try {
    const m = await sharp(buf).metadata();
    if (m.width !== 800 || m.height !== 800) return false;
    const { data } = await sharp(buf)
      .extract({ left: 335, top: 655, width: 130, height: 130 })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let oro = 0;
    for (let i = 0; i < data.length; i += 3) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (r > 150 && g > 100 && g < 200 && b < 120 && r - b > 60) oro++;
    }
    return oro > 200;
  } catch {
    return false;
  }
}

const VIENA_PLACEHOLDER ="https://vienamuebles.com/wp-content/uploads/clientResources/marca-y-producto_no-image.jpg";

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

  // Fotos subidas desde el admin: ya vienen listas (con sello) desde la base.
  const subida = url.match(/^\/subidas\/(\d+)(?:-\d+)?$/);
  if (subida) {
    try {
      const foto = await prisma.fotoSubida.findUnique({ where: { productoId: Number(subida[1]) } });
      if (!foto) return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
      return new NextResponse(Buffer.from(foto.datos) as unknown as BodyInit, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
    } catch {
      return NextResponse.json({ error: "Error al obtener imagen" }, { status: 500 });
    }
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

  // Imágenes locales: la mayoría (800x800) trae el logo VIEJO redondo abajo
  // al centro, dentro de una franja blanca. Se tapa con el sello nuevo.
  if (isLocal) {
    try {
      let img = sharp(raw!).flatten({ background: "#ffffff" });
      if (await tieneLogoViejo(raw!)) {
        const sello = await sharp(fs.readFileSync(SELLO_PATH)).resize(250, 150, { fit: "fill" }).png().toBuffer();
        img = img.composite([{ input: sello, left: 275, top: 645 }]);
      }
      const processed = await img.jpeg({ quality: 90 }).toBuffer();
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

  // Imágenes de Viena: se tapa su logo con el sello de Outlet Hogar, del
  // tamaño y en el lugar justo para cada foto (ver lib/selloViena.ts), así el
  // logo de Viena no se ve y el producto no queda cortado.
  try {
    const processed = await aplicarSello(raw!, fs.readFileSync(SELLO_PATH));

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
