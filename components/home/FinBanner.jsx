import styles from "./FinBanner.module.css";

const WA = "5403401642045";

const modalidades = [
  {
    icon: "📅",
    label: "Semanal",
    cuotas: "12 cuotas",
    desc: "Pagás cada semana, en 3 meses tenés tu producto",
    highlight: true,
  },
  {
    icon: "📆",
    label: "Quincenal",
    cuotas: "6 cuotas",
    desc: "Pagás cada 15 días, ideal para cobros quincenales",
    highlight: false,
  },
  {
    icon: "🗓️",
    label: "Mensual",
    cuotas: "3 cuotas",
    desc: "Pagás una vez por mes, más cómodo y espaciado",
    highlight: false,
  },
];

export default function FinBanner() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <span className={styles.tag}>💳 FINANCIACIÓN PROPIA</span>
          <h2 className={styles.title}>Llevá hoy, pagá como puedas</h2>
          <p className={styles.desc}>
            Sin banco, sin tarjeta. Financiamos directamente con tres modalidades pensadas para vos.
          </p>
          <a
            href={`https://wa.me/${WA}?text=Hola, quiero saber más sobre la financiación`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btn}
          >
            Consultar financiación
          </a>
        </div>
        <div className={styles.cards}>
          {modalidades.map((m) => (
            <div key={m.label} className={`${styles.card} ${m.highlight ? styles.cardHighlight : ""}`}>
              <span className={styles.cardIcon}>{m.icon}</span>
              <span className={styles.cardLabel}>{m.label}</span>
              <span className={styles.cardCuotas}>{m.cuotas}</span>
              <p className={styles.cardDesc}>{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
