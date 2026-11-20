// Tapa el logo de Viena de las fotos del proveedor con el sello de Outlet Hogar.
//
// El logo de Viena siempre es el mismo dibujo (letras rojas "Viena", techito
// azul arriba a la derecha y "MUEBLES Y HOGAR" en azul abajo), pero cambia un
// poco de tamaño y de lugar según la foto. Se ubica por sus partes azules
// (techito + frase), que en el logo original ocupan una caja de 154 x 145 y
// están corridas a la derecha: las letras rojas empiezan 119 unidades antes.
// Con eso se calcula la caja del logo entero y el sello se agranda lo justo
// para taparla, sin tapar de más el producto.
import sharp from "sharp";

const N = 400; // la foto se analiza achicada a 400 x 400
const AZUL = [48, 62, 129];

interface Medida {
  lado: "izquierda" | "derecha";
  // fracciones de la foto que hay que tapar desde el rincón de abajo
  ancho: number;
  alto: number;
  seguro: boolean; // true si se encontró el logo; false = tamaño por defecto
}

function esAzulViena(r: number, g: number, b: number) {
  return Math.abs(r - AZUL[0]) < 40 && Math.abs(g - AZUL[1]) < 40 && Math.abs(b - AZUL[2]) < 45 && b > r + 40;
}
function esRojoViena(r: number, g: number, b: number) {
  return r > 140 && g < 80 && b < 100 && r - g > 80;
}

export async function medirLogo(buf: Buffer): Promise<Medida> {
  const { data } = await sharp(buf).flatten({ background: "#ffffff" }).removeAlpha()
    .resize(N, N, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });

  const medir = (lado: "izquierda" | "derecha") => {
    const xs: number[] = [], ys: number[] = [];
    let rojos = 0;
    for (let y = Math.floor(N * 0.6); y < N; y++) {
      for (let d = 0; d < N * 0.5; d++) {
        const x = lado === "izquierda" ? d : N - 1 - d;
        const k = (y * N + x) * 3;
        const r = data[k], g = data[k + 1], b = data[k + 2];
        if (esRojoViena(r, g, b)) rojos++;
        if (esAzulViena(r, g, b)) {
          xs.push(d); // distancia desde el borde de ese lado
          ys.push(y);
        }
      }
    }
    // El techito es el azul de más arriba: se toma la franja azul superior
    // (ignorando puntitos sueltos con percentiles) y se mide su ancho.
    const pct = (arr: number[], q: number) => {
      const o = [...arr].sort((p1, p2) => p1 - p2);
      return o[Math.min(o.length - 1, Math.max(0, Math.floor(q * (o.length - 1))))];
    };
    if (xs.length < 20) return { d0: 0, d1: -1, y0: 0, alto: 0, azules: xs.length, rojos };
    const y0 = pct(ys, 0.02);
    const techo = xs.filter((_, i) => ys[i] <= y0 + 30);
    const techoY = ys.filter((y) => y <= y0 + 30);
    const d0 = pct(techo, 0.03);
    const d1 = pct(techo, 0.97);
    const alto = pct(techoY, 0.97) - y0 + 1;
    return { d0, d1, y0, alto, azules: xs.length, rojos };
  };

  const izq = medir("izquierda");
  const der = medir("derecha");
  // El logo está del lado con más rojo + azul de Viena (casi siempre a la izquierda)
  const lado: "izquierda" | "derecha" =
    der.azules + der.rojos > (izq.azules + izq.rojos) * 1.5 && der.rojos >= 15 ? "derecha" : "izquierda";
  const m = lado === "izquierda" ? izq : der;

  // Proporciones del logo original (techito de 129 de ancho y 40 de alto):
  // las letras empiezan 1.023 anchos de techito antes, terminan 0.147 después,
  // y el logo termina 1.124 anchos de techito por debajo del borde del techo.
  const w = m.d1 - m.d0 + 1;
  const proporcion = m.alto / Math.max(1, w);
  if (process.env.DEBUG_SELLO) console.log("medir", lado, m, { w, proporcion });
  // Confirmar que debajo/izquierda del techito están las letras rojas "Viena"
  // (si no, el "techito" era parte azul del producto).
  let rojasEnLetras = 0;
  if (w >= 8) {
    const dIni = lado === "izquierda" ? m.d0 - 1.023 * w : m.d0 - 0.147 * w;
    const dFin = lado === "izquierda" ? m.d1 + 0.147 * w : m.d1 + 1.023 * w;
    const desdeD = Math.max(0, Math.floor(Math.min(dIni, dFin)));
    const hastaD = Math.min(N - 1, Math.ceil(Math.max(dIni, dFin)));
    const yIni = Math.floor(m.y0 + 0.3 * w);
    const yFin = Math.min(N - 1, Math.ceil(m.y0 + 1.0 * w));
    for (let y = yIni; y <= yFin; y++) {
      for (let d = desdeD; d <= hastaD; d++) {
        const x = lado === "izquierda" ? d : N - 1 - d;
        const k = (y * N + x) * 3;
        if (esRojoViena(data[k], data[k + 1], data[k + 2])) rojasEnLetras++;
      }
    }
  }
  if (process.env.DEBUG_SELLO) console.log("rojas en letras", rojasEnLetras);
  if (m.azules >= 20 && w >= 8 && proporcion > 0.18 && proporcion < 0.55 && rojasEnLetras >= 3 * w) {
    // borde del logo más lejos del rincón (en distancia desde el borde de la foto)
    const adentro = lado === "izquierda" ? m.d1 + 0.147 * w : m.d1 + 1.023 * w;
    const margen = N * 0.025;
    return {
      lado,
      ancho: Math.min(0.42, (adentro + margen) / N),
      alto: Math.min(0.4, (N - m.y0 + margen) / N),
      seguro: true,
    };
  }
  // No se encontró con seguridad: sello un poco más grande que el normal
  return { lado, ancho: 0.34, alto: 0.21, seguro: false };
}

// Devuelve la foto (JPEG) con el sello tapando el logo de Viena
export async function aplicarSello(buf: Buffer, selloPng: Buffer): Promise<Buffer> {
  const { width = 400, height = 400 } = await sharp(buf).metadata();
  const med = await medirLogo(buf);
  const PROP = 360 / 600; // alto / ancho del sello
  // ancho del sello: el normal (30%) o lo que haga falta para tapar el logo
  let w = Math.max(width * 0.3, width * med.ancho, (height * med.alto) / PROP);
  w = Math.min(w, width * 0.48);
  const h = w * PROP;
  const selloW = Math.round(w);
  const selloH = Math.round(h);
  const margen = Math.round(Math.min(width, height) * 0.005);
  const sello = await sharp(selloPng).resize(selloW, selloH, { fit: "fill" }).png().toBuffer();
  return sharp(buf)
    .flatten({ background: "#ffffff" })
    .composite([{
      input: sello,
      top: height - selloH - margen,
      left: med.lado === "derecha" ? width - selloW - margen : margen,
    }])
    .jpeg({ quality: 90 })
    .toBuffer();
}
