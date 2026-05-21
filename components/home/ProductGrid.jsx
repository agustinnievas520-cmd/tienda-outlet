import styles from "./ProductGrid.module.css";
import ProductCard from "./ProductCard";
import { productosPrincipales } from "@/lib/data/products";

export default function ProductGrid() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 className={styles.heading}>Productos destacados</h2>
          <a href="/catalogo" className={styles.verTodos}>Ver todos →</a>
        </div>
        <div className={styles.grid}>
          {productosPrincipales.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
