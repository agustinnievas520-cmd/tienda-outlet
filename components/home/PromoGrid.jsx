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
  wind: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2M12.59 11.59A2 2 0 1 1 14 15H2M17.73 7.73A2.5 2.5 0 1 1 19.5 12H2"/></svg>,
  sun: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>,
  gift: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7"/><path d="M12 8c-1.5-3.5-5-4-6-2.5S7 8 12 8ZM12 8c1.5-3.5 5-4 6-2.5S17 8 12 8Z"/></svg>,
};

const promos = [
  {
    tagIcon: "☀️",
    tag: "TEMPORADA VERANO",
    titleLines: ["Refrescá", "tu casa"],
    titleAccent: "este verano",
    sub: "Aires acondicionados y ventiladores al mejor precio en cuotas",
    features: [
      { icon: Icon.wind,   text: "Máxima frescura" },
      { icon: Icon.shield, text: "Garantía oficial" },
      { icon: Icon.card,   text: "12 cuotas sin interés" },
    ],
    bg: "#061018",
    accent: "#38bdf8",
    overlay: "linear-gradient(105deg, rgba(6,16,24,0.98) 28%, rgba(6,16,24,0.80) 48%, rgba(6,16,24,0.18) 72%, transparent 88%)",
    lightRay: "radial-gradient(ellipse at 82% 10%, rgba(56,189,248,0.14) 0%, transparent 52%)",
    productGlow: "radial-gradient(ellipse at 72% 58%, rgba(56,189,248,0.12) 0%, transparent 55%)",
    imgFilter: "brightness(0.60) contrast(1.25) saturate(1.3)",
    imgPos: "68% center",
    href: "/catalogo?categoria=Climatizaci%C3%B3n",
    cta: "Ver climatización",
    img: "/categorias/climatizacion.jpg",
    blend: false,
  },
  {
    tagIcon: "🌻",
    tag: "PREPARÁ EL VERANO",
    titleLines: ["Disfrutá tu", "jardín"],
    titleAccent: "al aire libre",
    sub: "Pileta, parrilla y deco de jardín para la temporada",
    features: [
      { icon: Icon.sun,    text: "Ideal para el verano" },
      { icon: Icon.shield, text: "Calidad garantizada" },
      { icon: Icon.card,   text: "12 cuotas sin interés" },
    ],
    bg: "#0a1208",
    accent: "#f5b942",
    overlay: "linear-gradient(105deg, rgba(10,18,8,0.98) 28%, rgba(10,18,8,0.80) 48%, rgba(10,18,8,0.18) 72%, transparent 88%)",
    lightRay: "radial-gradient(ellipse at 75% 15%, rgba(245,185,66,0.12) 0%, transparent 50%)",
    productGlow: "radial-gradient(ellipse at 68% 55%, rgba(245,185,66,0.16) 0%, transparent 50%)",
    imgFilter: "brightness(0.55) contrast(1.35) saturate(1.4)",
    imgPos: "center 30%",
    href: "/catalogo?categoria=Hogar+y+Jard%C3%ADn",
    cta: "Ver hogar y jardín",
    img: "/categorias/hogar-jardin.jpg",
    blend: false,
  },
  {
    tagIcon: "🎄",
    tag: "LLEGÓ LA NAVIDAD",
    titleLines: ["Sorprendé esta", "Navidad"],
    titleAccent: "con una bici",
    sub: "El regalo ideal para toda la familia, en cuotas",
    features: [
      { icon: Icon.gift,  text: "El regalo perfecto" },
      { icon: Icon.bike,  text: "Variedad de modelos" },
      { icon: Icon.card,  text: "12 cuotas sin interés" },
    ],
    bg: "#160608",
    accent: "#e5484d",
    overlay: "linear-gradient(105deg, rgba(22,6,8,0.98) 28%, rgba(22,6,8,0.80) 48%, rgba(22,6,8,0.18) 72%, transparent 88%)",
    lightRay: "radial-gradient(ellipse at 80% 12%, rgba(229,72,77,0.14) 0%, transparent 50%)",
    productGlow: "radial-gradient(ellipse at 72% 60%, rgba(229,72,77,0.16) 0%, transparent 55%)",
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
