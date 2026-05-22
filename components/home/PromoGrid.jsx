"use client";
import styles from "./PromoGrid.module.css";

const promos = [
  {
    tagIcon: "⚽",
    tag: "MUNDIAL 2026",
    titleLines: ["Viví el Mundial", "en pantalla"],
    titleAccent: "grande",
    sub: "Smart TVs 4K con la mejor imagen",
    features: [
      { icon: "📺", text: "4K Ultra HD" },
      { icon: "🎨", text: "Colores más reales" },
      { icon: "🛡️", text: "Garantía oficial" },
    ],
    bg: "#0e0e12",
    accent: "#FFD100",
    rightBg: "linear-gradient(135deg, #1a1a2e 0%, #0d0d20 100%)",
    glowColor: "rgba(90,120,255,0.22)",
    href: "/catalogo?categoria=Smart+TV",
    cta: "Ver ofertas",
    img: "/categorias/smart-tv.jpg",
    imgStyle: { objectFit: "cover", objectPosition: "62% center" },
  },
  {
    tagIcon: "❄️",
    tag: "TEMPORADA INVIERNO",
    titleLines: ["Calefaccioná", "tu casa"],
    titleAccent: "este invierno",
    sub: "Estufas y caloventores al mejor precio en cuotas",
    features: [
      { icon: "🔥", text: "Máxima eficiencia" },
      { icon: "🛡️", text: "Seguridad garantizada" },
      { icon: "💳", text: "12 cuotas sin interés" },
    ],
    bg: "#080f1c",
    accent: "#4db8ff",
    rightBg: "linear-gradient(135deg, #f2e8d8 0%, #fdf5eb 100%)",
    glowColor: "rgba(255,140,30,0.35)",
    href: "/catalogo?categoria=Climatizaci%C3%B3n",
    cta: "Ver calefacción",
    img: "/imagenes/productos/1099.webp",
    imgStyle: { objectFit: "contain", objectPosition: "center 15%" },
  },
  {
    tagIcon: "⭐",
    tag: "MÁS ELEGIDO",
    titleLines: ["Bicis listas", "para salir"],
    titleAccent: "a rodar",
    sub: "Para el trabajo, el deporte y el tiempo libre",
    features: [
      { icon: "🚲", text: "Variedad de modelos" },
      { icon: "⚙️", text: "Calidad garantizada" },
      { icon: "💳", text: "12 cuotas sin interés" },
    ],
    bg: "#0b190b",
    accent: "#6ed940",
    rightBg: "linear-gradient(135deg, #121f10 0%, #0a1508 100%)",
    glowColor: "rgba(110,217,64,0.2)",
    href: "/catalogo?q=bicicleta",
    cta: "Ver bicicletas",
    img: "/categorias/bicicletas.jpg",
    imgStyle: { objectFit: "cover", objectPosition: "center" },
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
              {/* Panel izquierdo — texto */}
              <div className={styles.textPanel}>
                <span
                  className={styles.tag}
                  style={{ color: p.accent, borderColor: `${p.accent}44` }}
                >
                  <span>{p.tagIcon}</span>
                  {p.tag}
                </span>

                <div className={styles.titleBlock}>
                  {p.titleLines.map((line) => (
                    <span key={line} className={styles.titleLine}>
                      {line}
                    </span>
                  ))}
                  <span className={styles.titleAccent} style={{ color: p.accent }}>
                    {p.titleAccent}
                  </span>
                </div>

                <p className={styles.sub}>{p.sub}</p>

                <ul className={styles.features}>
                  {p.features.map((f) => (
                    <li key={f.text} className={styles.feature}>
                      <span className={styles.featureIcon}>{f.icon}</span>
                      <span className={styles.featureText}>{f.text}</span>
                    </li>
                  ))}
                </ul>

                <span
                  className={styles.cta}
                  style={{ background: p.accent, color: p.bg }}
                >
                  {p.cta}
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </div>

              {/* Panel derecho — producto */}
              <div className={styles.imgPanel} style={{ background: p.rightBg }}>
                {/* Glow detrás del producto */}
                <div
                  className={styles.glow}
                  style={{ background: `radial-gradient(ellipse at 50% 60%, ${p.glowColor} 0%, transparent 70%)` }}
                />
                {/* Transición izquierda */}
                <div
                  className={styles.imgFade}
                  style={{ background: `linear-gradient(to right, ${p.bg} 0%, transparent 50%)` }}
                />
                <img
                  src={p.img}
                  alt=""
                  className={styles.productImg}
                  style={p.imgStyle}
                  aria-hidden="true"
                  onError={(e) => { e.currentTarget.style.opacity = "0"; }}
                />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
