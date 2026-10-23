import styles from "./Institucional.module.css";

const Icon = {
  shield: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  ),
  check: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M8.5 12.5l2.5 2.5 4.5-5"/>
    </svg>
  ),
  bulb: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 22h4M12 2a6 6 0 0 0-3.5 10.9c.5.4.9 1 1.1 1.7l.2.9h4.4l.2-.9c.2-.7.6-1.3 1.1-1.7A6 6 0 0 0 12 2z"/>
    </svg>
  ),
  trend: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l6-6 4 4 8-8"/>
      <path d="M15 7h6v6"/>
    </svg>
  ),
  dot: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
};

const valores = [
  { icon: Icon.shield, label: "Confianza", desc: "Relaciones transparentes y duraderas." },
  { icon: Icon.check, label: "Compromiso", desc: "Responsabilidad en cada operación." },
  { icon: Icon.bulb, label: "Innovación", desc: "Mejora continua de nuestros servicios." },
  { icon: Icon.trend, label: "Crecimiento", desc: "Evolucionamos junto a nuestros clientes." },
];

const diferenciales = [
  "Financiación propia",
  "Atención personalizada",
  "Productos de calidad",
  "Entregas coordinadas",
  "Acompañamiento en todo el proceso",
];

export default function Institucional() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <span className={styles.eyebrow}>Nuestra empresa</span>

        <div className={styles.mv}>
          <div className={styles.mvBlock}>
            <span className={styles.mvLabel}>Misión</span>
            <p className={styles.mvLead}>Construimos confianza. Generamos oportunidades.</p>
            <p className={styles.mvText}>
              Facilitamos el acceso a productos de calidad mediante financiación propia,
              atención personalizada y soluciones accesibles, construyendo relaciones
              duraderas basadas en la confianza, el compromiso y la responsabilidad.
            </p>
          </div>
          <div className={styles.mvDivider} aria-hidden="true" />
          <div className={styles.mvBlock}>
            <span className={styles.mvLabel}>Visión</span>
            <p className={styles.mvLead}>Una empresa referente en la región.</p>
            <p className={styles.mvText}>
              Reconocida por su solidez, innovación y cercanía con las personas,
              generando nuevas oportunidades y acompañando el crecimiento de cada familia.
            </p>
          </div>
        </div>

        <div className={styles.valores}>
          {valores.map((v) => (
            <div key={v.label} className={styles.valorItem}>
              <span className={styles.valorIcon}>{v.icon}</span>
              <span className={styles.valorLabel}>{v.label}</span>
              <span className={styles.valorDesc}>{v.desc}</span>
            </div>
          ))}
        </div>

        <div className={styles.porque}>
          <span className={styles.porqueLabel}>Por qué elegir Outlet Hogar</span>
          <div className={styles.porqueList}>
            {diferenciales.map((d) => (
              <span key={d} className={styles.porqueItem}>
                <span className={styles.porqueIcon}>{Icon.dot}</span>
                {d}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.cierre}>
          <p className={styles.cierreText}>
            Más que productos, <span>relaciones de confianza.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
