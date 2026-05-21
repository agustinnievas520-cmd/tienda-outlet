import styles from "./ComboCard.module.css";

const WA = "5403401642045";

function fmt(n) {
  return n.toLocaleString("es-AR");
}

export default function ComboCard({ combo }) {
  const { tag, name, description, icons, price, cuota, entrega } = combo;
  const waMsg = encodeURIComponent(`Hola, me interesa el combo: ${name}`);

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <span className={styles.tag}>{tag}</span>
        <div className={styles.icons}>
          {icons.map((ic, i) => (
            <span key={i} className={styles.icon}>{ic}</span>
          ))}
        </div>
        <h3 className={styles.name}>{name}</h3>
        <p className={styles.desc}>{description}</p>
      </div>
      <div className={styles.bottom}>
        <div className={styles.pricing}>
          <span className={styles.price}>${fmt(price)}</span>
          <div className={styles.sub}>
            <span className={styles.cuota}>12 × ${fmt(cuota)}/sem</span>
            <span className={styles.entrega}>Entrega ${fmt(entrega)}</span>
          </div>
        </div>
        <a
          href={`https://wa.me/${WA}?text=${waMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.btn}
        >
          Armar combo
        </a>
      </div>
    </div>
  );
}
