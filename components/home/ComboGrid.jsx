import styles from "./ComboGrid.module.css";
import ComboCard from "./ComboCard";
import { combos } from "@/lib/data/combos";

export default function ComboGrid() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.heading}>Combos especiales</h2>
            <p className={styles.sub}>Armamos paquetes con todo lo que necesitás al mejor precio</p>
          </div>
          <a href="/catalogo?cat=combos" className={styles.verTodos}>Ver todos →</a>
        </div>
        <div className={styles.grid}>
          {combos.map((c) => (
            <ComboCard key={c.id} combo={c} />
          ))}
        </div>
      </div>
    </section>
  );
}
