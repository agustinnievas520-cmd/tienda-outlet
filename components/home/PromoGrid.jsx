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
    color: "#111214",
    overlayFrom: "rgba(17,18,20,1)",
    overlayMid: "rgba(17,18,20,0.82)",
    overlayTo: "rgba(17,18,20,0.15)",
    accent: "#FFD100",
    href: "/catalogo?categoria=Smart+TV",
    cta: "Ver ofertas",
    img: "/categorias/smart-tv.jpg",
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
    color: "#091525",
    overlayFrom: "rgba(9,21,37,1)",
    overlayMid: "rgba(9,21,37,0.82)",
    overlayTo: "rgba(9,21,37,0.15)",
    accent: "#4db8ff",
    href: "/catalogo?categoria=Climatizaci%C3%B3n",
    cta: "Ver calefacción",
    img: "/categorias/climatizacion.jpg",
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
    color: "#0c1c0c",
    overlayFrom: "rgba(12,28,12,1)",
    overlayMid: "rgba(12,28,12,0.82)",
    overlayTo: "rgba(12,28,12,0.15)",
    accent: "#6ed940",
    href: "/catalogo?q=bicicleta",
    cta: "Ver bicicletas",
    img: "/categorias/bicicletas.jpg",
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
              style={{ background: p.color }}
            >
              {/* Imagen de fondo */}
              <img
                src={p.img}
                alt=""
                className={styles.bgImg}
                aria-hidden="true"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />

              {/* Overlay degradado */}
              <div
                className={styles.overlay}
                style={{
                  background: `linear-gradient(100deg, ${p.overlayFrom} 32%, ${p.overlayMid} 54%, ${p.overlayTo} 80%)`,
                }}
              />

              {/* Contenido */}
              <div className={styles.content}>
                {/* Badge */}
                <span
                  className={styles.tag}
                  style={{ color: p.accent, borderColor: `${p.accent}55` }}
                >
                  <span className={styles.tagIcon}>{p.tagIcon}</span>
                  {p.tag}
                </span>

                {/* Título */}
                <div className={styles.titleBlock}>
                  {p.titleLines.map((line) => (
                    <span key={line} className={styles.titleLine}>
                      {line}
                    </span>
                  ))}
                  <span
                    className={styles.titleAccent}
                    style={{ color: p.accent }}
                  >
                    {p.titleAccent}
                  </span>
                </div>

                {/* Subtítulo */}
                <p className={styles.sub}>{p.sub}</p>

                {/* Features */}
                <ul className={styles.features}>
                  {p.features.map((f) => (
                    <li key={f.text} className={styles.feature}>
                      <span className={styles.featureIcon}>{f.icon}</span>
                      <span>{f.text}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <span
                  className={styles.cta}
                  style={{ background: p.accent, color: p.color }}
                >
                  {p.cta}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
