import styles from "./FinBanner.module.css";

const WA = "5403401642045";

const CalendarIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFD100" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const WalletIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFD100" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    <circle cx="12" cy="14" r="2"/>
  </svg>
);

const modalidades = [
  { icon: <CalendarIcon />, label: "Semanal",    cuotas: "12 cuotas", desc: "Pagás cada semana, en 3 meses tenés tu producto" },
  { icon: <CalendarIcon />, label: "Quincenal",  cuotas: "6 cuotas",  desc: "Pagás cada 15 días, ideal para cobros quincenales" },
  { icon: <WalletIcon />,   label: "Mensual",    cuotas: "3 cuotas",  desc: "Pagás una vez por mes, más cómodo y espaciado" },
];

export default function FinBanner() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <span className={styles.tag}>
            <span className={styles.tagLine} />
            FINANCIACIÓN PROPIA
          </span>
          <h2 className={styles.title}>
            Llevá hoy, <span className={styles.titleGold}>pagá como puedas</span>
          </h2>
          <p className={styles.desc}>
            Sin banco, sin tarjeta. Financiamos directamente con tres modalidades pensadas para vos.
          </p>
          <a
            href={`https://wa.me/${WA}?text=Hola, quiero saber más sobre la financiación`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btn}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884"/>
            </svg>
            Consultar financiación
          </a>
        </div>
        <div className={styles.cards}>
          {modalidades.map((m) => (
            <div key={m.label} className={styles.card}>
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
