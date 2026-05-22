"use client";
import styles from "./PromoGrid.module.css";

/* ── Iconos SVG inline ── */
const Icon = {
  tv: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
  palette: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>,
  shield: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  flame: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>,
  card: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  bike: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 0 0 0-2h-3l-3 9H2v2h2.6a5 5 0 0 1 3.7-2.5L12 6z"/><path d="m15 6 3.4 3.5M18.5 14l-1-3.5"/></svg>,
  check: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  arrow: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
};

const promos = [
  {
    tagIcon: "⚽",
    tag: "MUNDIAL 2026",
    titleLines: ["Viví el Mundial", "en pantalla"],
    titleAccent: "grande",
    sub: "Smart TVs 4K con la mejor imagen",
    features: [
      { icon: Icon.tv,      text: "4K Ultra HD" },
      { icon: Icon.palette, text: "Colores más reales" },
      { icon: Icon.shield,  text: "Garantía oficial" },
    ],
    bg: "#08080c",
    accent: "#FFD100",
    /* Degradado fuerte a la izquierda, imagen visible a la derecha */
    overlay: "linear-gradient(105deg, rgba(8,8,12,0.98) 28%, rgba(8,8,12,0.80) 48%, rgba(8,8,12,0.18) 72%, transparent 88%)",
    /* Rayo de luz dorado desde arriba-derecha */
    lightRay: "radial-gradient(ellipse at 82% 10%, rgba(255,220,0,0.14) 0%, transparent 52%)",
    /* Brillo detrás del producto */
    productGlow: "radial-gradient(ellipse at 72% 58%, rgba(255,200,0,0.10) 0%, transparent 55%)",
    imgFilter: "brightness(0.62) contrast(1.25) saturate(1.3)",
    imgPos: "68% center",
    href: "/catalogo?categoria=Smart+TV",
    cta: "Ver ofertas",
    img: "/categorias/smart-tv.jpg",
    blend: false,
  },
  {
    tagIcon: "❄️",
    tag: "TEMPORADA INVIERNO",
    titleLines: ["Calefaccioná", "tu casa"],
    titleAccent: "este invierno",
    sub: "Estufas y caloventores al mejor precio en cuotas",
    features: [
      { icon: Icon.flame, text: "Máxima eficiencia" },
      { icon: Icon.shield, text: "Seguridad garantizada" },
      { icon: Icon.card,  text: "12 cuotas sin interés" },
    ],
    bg: "#060c18",
    accent: "#4db8ff",
    overlay: "linear-gradient(105deg, rgba(6,12,24,0.98) 28%, rgba(6,12,24,0.80) 48%, rgba(6,12,24,0.18) 72%, transparent 88%)",
    lightRay: "radial-gradient(ellipse at 75% 15%, rgba(70,160,255,0.10) 0%, transparent 50%)",
    productGlow: "radial-gradient(ellipse at 68% 55%, rgba(255,130,30,0.22) 0%, transparent 50%)",
    imgFilter: "brightness(0.48) contrast(1.40) saturate(1.55)",
    imgPos: "center 22%",
    href: "/catalogo?categoria=Climatizaci%C3%B3n",
    cta: "Ver calefacción",
    img: "/imagenes/productos/1099.webp",
    blend: true,   /* mix-blend-mode: multiply para eliminar fondo blanco */
  },
  {
    tagIcon: "⭐",
    tag: "MÁS ELEGIDO",
    titleLines: ["Bicis listas", "para salir"],
    titleAccent: "a rodar",
    sub: "Para el trabajo, el deporte y el tiempo libre",
    features: [
      { icon: Icon.bike,  text: "Variedad de modelos" },
      { icon: Icon.check, text: "Calidad garantizada" },
      { icon: Icon.card,  text: "12 cuotas sin interés" },
    ],
    bg: "#06100a",
    accent: "#6ed940",
    overlay: "linear-gradient(105deg, rgba(6,16,10,0.98) 28%, rgba(6,16,10,0.80) 48%, rgba(6,16,10,0.18) 72%, transparent 88%)",
    lightRay: "radial-gradient(ellipse at 80% 12%, rgba(100,220,40,0.12) 0%, transparent 50%)",
    productGlow: "radial-gradient(ellipse at 72% 60%, rgba(80,200,30,0.16) 0%, transparent 55%)",
    imgFilter: "brightness(0.50) contrast(1.40) saturate(1.20)",
    imgPos: "center center",
    href: "/catalogo?q=bicicleta",
    cta: "Ver bicicletas",
    img: "/imagenes/productos/116.webp",
    blend: true,   /* mix-blend-mode: multiply para eliminar fondo blanco */
  },
];

export default function PromoGrid() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 className={styles.heading}>Lo más buscado ahora</h2>
        </div>
        <div className={styles.grid}>
          {promos.map((p) => (
            <a
              key={p.tag}
              href={p.href}
              className={styles.card}
              style={{ background: p.bg }}
            >
              {/* Brillo detrás del producto */}
              <div className={styles.productGlow} style={{ background: p.productGlow }} />

              {/* Imagen de fondo con filtros cinemáticos */}
              <img
                src={p.img}
                alt=""
                aria-hidden="true"
                className={`${styles.bgImg} ${p.blend ? styles.blendMultiply : ""}`}
                style={{
                  objectPosition: p.imgPos,
                  filter: p.imgFilter,
                }}
                onError={(e) => { e.currentTarget.style.opacity = "0"; }}
              />

              {/* Degradado principal (texto legible a la izquierda) */}
              <div className={styles.overlay} style={{ background: p.overlay }} />

              {/* Rayo de luz */}
              <div className={styles.lightRay} style={{ background: p.lightRay }} />

              {/* Contenido */}
              <div className={styles.content}>

                {/* Badge glassmorphism */}
                <span
                  className={styles.tag}
                  style={{ color: p.accent, borderColor: `${p.accent}38` }}
                >
                  <span className={styles.tagEmoji}>{p.tagIcon}</span>
                  {p.tag}
                </span>

                {/* Título */}
                <div className={styles.titleBlock}>
                  {p.titleLines.map((line) => (
                    <span key={line} className={styles.titleLine}>{line}</span>
                  ))}
                  <span className={styles.titleAccent} style={{ color: p.accent }}>
                    {p.titleAccent}
                  </span>
                </div>

                {/* Subtítulo */}
                <p className={styles.sub}>{p.sub}</p>

                {/* Separador */}
                <div className={styles.divider} style={{ background: `${p.accent}30` }} />

                {/* Features con iconos SVG */}
                <ul className={styles.features}>
                  {p.features.map((f) => (
                    <li key={f.text} className={styles.feature}>
                      <span className={styles.featureIcon} style={{ color: p.accent }}>
                        {f.icon}
                      </span>
                      <span className={styles.featureText}>{f.text}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <span
                  className={styles.cta}
                  style={{ background: p.accent, color: p.bg }}
                >
                  {p.cta}
                  {Icon.arrow}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
