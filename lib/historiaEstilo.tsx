// Piezas compartidas de las historias (productos e iPhone usados):
// estética negra y dorada, logo, íconos, fondo y botón de WhatsApp.
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import type { ReactNode } from "react";
import { formatearPrecio } from "@/lib/calculos";

export const W = 1080;
export const H = 1920;
export const NEGRO = "#0E0D0B";
export const TINTA = "#141210";
export const DORADO = "#C9994F";
export const DORADO_CLARO = "#E7C47A";
// Brillo metálico de los detalles dorados
export const ORO = "linear-gradient(135deg, #A87B32 0%, #E8C87A 38%, #F6E1A6 52%, #CDA052 72%, #9C7230 100%)";
export const ORO_SUAVE = "linear-gradient(135deg, #C99B4E 0%, #EED39A 50%, #C99B4E 100%)";
export const SOMBRA_ORO = "0 8px 18px rgba(120,85,30,0.3)";

export async function cargarFuentes() {
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

// Logo de la marca: la casita dorada y el nombre en blanco (sobre fondo negro).
export async function logo(): Promise<{ icono: string; texto: string }> {
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

export function formatearWhatsapp(numero: string): string {
  // 5493401642045 → 3401 642045 (formato local para leer fácil)
  const local = numero.replace(/^54/, "").replace(/^9/, "").replace(/^0/, "");
  if (local.length === 10) return `${local.slice(0, 4)} ${local.slice(4)}`;
  return local;
}

// "$ 406.600" → "$406.600" (más compacto, como en los carteles)
export function precio(valor: number): string {
  return formatearPrecio(valor).replace(/\s/g, "");
}

// ─── Íconos (dibujados a mano para no depender de archivos) ──────────────

export function Camion({ size }: { size: number }) {
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

export function Escudo({ size }: { size: number }) {
  return (
    <svg width={size * 0.85} height={size} viewBox="0 0 86 100">
      <g stroke={TINTA} strokeWidth={6.5} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M 43 6 L 78 18 V 46 C 78 70, 62 86, 43 94 C 24 86, 8 70, 8 46 V 18 Z" />
        <path d="M 27 50 L 39 62 L 61 38" />
      </g>
    </svg>
  );
}

export function Dni({ size }: { size: number }) {
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

export function Calendario({ size }: { size: number }) {
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

// ─── Estructura ───────────────────────────────────────────────────────

// Fondo negro con franjas, logo arriba (dejando lugar para la barra de
// Instagram) y la tarjeta clara con borde dorado donde va el contenido.
export function Lienzo({ logoSrc, children }: { logoSrc: { icono: string; texto: string }; children: ReactNode }) {
  return (
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
      <Franja top={-640} left={60} ancho={70} opacidad={0.9} />
      <Franja top={-660} left={150} ancho={22} opacidad={0.5} />
      <Franja top={-600} left={1080} ancho={120} opacidad={0.85} />
      <Franja top={1300} left={-120} ancho={90} opacidad={0.85} />
      <Franja top={1260} left={-200} ancho={24} opacidad={0.5} />
      <Franja top={1250} left={1110} ancho={80} opacidad={0.85} />

      <div style={{ display: "flex", alignItems: "center", gap: 36, marginTop: 120 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc.icono} width={175} height={140} alt="" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc.texto} width={400} height={105} alt="" />
      </div>

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
          {children}
        </div>
      </div>
    </div>
  );
}

// Etiqueta dorada (izquierda) + "SOLO CON DNI" (derecha)
export function Etiquetas({ icono, texto }: { icono: ReactNode; texto: string }) {
  return (
    <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: ORO,
          borderRadius: 999,
          padding: "14px 34px 14px 26px",
          fontSize: texto.length > 18 ? 34 : 40,
          fontWeight: 600,
          letterSpacing: 0.5,
          boxShadow: "0 6px 14px rgba(120,85,30,0.25)",
        }}
      >
        {icono}
        {texto}
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
  );
}

// Pastilla dorada chica (código del artículo, datos del equipo…)
export function Pastilla({ texto }: { texto: string }) {
  return (
    <div
      style={{
        display: "flex",
        marginTop: 14,
        background: ORO_SUAVE,
        borderRadius: 18,
        padding: "8px 30px",
        fontSize: 34,
        fontWeight: 600,
        letterSpacing: 1,
      }}
    >
      {texto}
    </div>
  );
}

// Recuadro de precio grande: blanco con borde dorado, o todo dorado
export function RecuadroPrecio({ titulo, valor, dorado }: { titulo: string; valor: number; dorado?: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: dorado ? ORO : "white",
        border: dorado ? "none" : `4px solid ${DORADO}`,
        borderRadius: 30,
        padding: dorado ? "20px 10px 22px" : "16px 10px 18px",
        boxShadow: dorado ? SOMBRA_ORO : "none",
      }}
    >
      <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: 0.5 }}>{titulo}</div>
      <div style={{ fontSize: 80, fontWeight: 600, letterSpacing: -2, lineHeight: 1.1 }}>{precio(valor)}</div>
    </div>
  );
}

// Las tres cuotas en recuadros negros
export function Cuotas({ opciones }: { opciones: { titulo: string; cuota: number; detalle: string }[] }) {
  return (
    <div style={{ display: "flex", gap: 14 }}>
      {opciones.map((op) => (
        <div
          key={op.titulo}
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
            {op.titulo}
          </div>
          <div style={{ fontSize: 58, fontWeight: 600, color: DORADO_CLARO, letterSpacing: -1, marginTop: 4 }}>
            {precio(op.cuota)}
          </div>
          <div style={{ fontSize: 26, marginTop: 2 }}>{op.detalle}</div>
        </div>
      ))}
    </div>
  );
}

// Botón dorado de WhatsApp con destellos a los costados
export function BotonWhatsapp({ texto }: { texto: string }) {
  return (
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
          boxShadow: SOMBRA_ORO,
        }}
      >
        <Whatsapp size={64} />
        {texto}
      </div>
      <Destellos lado="der" />
    </div>
  );
}
