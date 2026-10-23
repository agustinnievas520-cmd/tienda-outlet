import styles from "./ZonaCobertura.module.css";

const WA = "5403401642045";

const SEDE = "El Trébol";

const LOCALIDADES = [
  "Bella Italia", "Cañada de Gómez", "Cañada Rosquín", "Esperanza",
  "Franck", "Gálvez", "Humboldt", "Landeta", "Las Parejas", "Las Petacas",
  "Las Rosas", "Los Cardos", "López", "María Juana", "María Susana",
  "Nuevo Torino", "Pellegrini", "Piamonte", "Pilar", "Rafaela",
  "San Carlos", "San Jorge", "San Vicente", "Santa Clara de Buena Vista",
  "Santa Fe", "Santo Tomé", "Sastre", "Susana",
  "Elisa (Clucellas)", "San Martín de las Escobas",
];

export default function ZonaCobertura() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.text}>
          <span className={styles.eyebrow}>📍 Zona de cobertura</span>
          <h2 className={styles.heading}>
            Llegamos a
            <span className={styles.accent}>toda la región</span>
          </h2>
          <p className={styles.sub}>
            Llevamos los productos hasta tu localidad con nuestra propia logística de entregas.
          </p>
          <a
            href={`https://wa.me/${WA}?text=${encodeURIComponent("Hola! Quiero saber si hacen envíos a mi localidad")}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.cta}
          >
            Consultá tu localidad
          </a>
        </div>

        <div className={styles.pills}>
          <span className={`${styles.pill} ${styles.pillSede}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>
            {SEDE} <span className={styles.pillTag}>sede</span>
          </span>
          {LOCALIDADES.map((loc) => (
            <span key={loc} className={styles.pill}>{loc}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
