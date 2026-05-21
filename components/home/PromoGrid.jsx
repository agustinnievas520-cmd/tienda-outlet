import styles from "./PromoGrid.module.css";

const promos = [
  {
    emoji: "⚽",
    tag: "SE VIENE EL MUNDIAL 2026",
    title: "Viví cada partido en pantalla grande",
    sub: "Smart TVs 4K con la mejor imagen",
    color: "#1a1a1a",
    accent: "#FFD100",
    href: "/catalogo?categoria=Smart+TV",
    cta: "Ver Smart TVs",
  },
  {
    emoji: "🧥",
    tag: "LLEGÓ EL FRÍO",
    title: "Estufas y caloventores para tu hogar",
    sub: "Calefacción al mejor precio en cuotas",
    color: "#1e3a5f",
    accent: "#60b4ff",
    href: "/catalogo?categoria=Climatizaci%C3%B3n",
    cta: "Ver calefacción",
  },
  {
    emoji: "🚲",
    tag: "TENDENCIA",
    title: "Moverse en bici nunca fue tan fácil",
    sub: "Para el trabajo, el deporte y el tiempo libre",
    color: "#1a3a1a",
    accent: "#6dcc6d",
    href: "/catalogo?q=bicicleta",
    cta: "Ver bicicletas",
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
              <span className={styles.tag} style={{ color: p.accent, borderColor: p.accent }}>
                {p.tag}
              </span>
              <div className={styles.emoji}>{p.emoji}</div>
              <h3 className={styles.title}>{p.title}</h3>
              <p className={styles.sub}>{p.sub}</p>
              <span className={styles.cta} style={{ background: p.accent, color: p.color }}>
                {p.cta} →
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
