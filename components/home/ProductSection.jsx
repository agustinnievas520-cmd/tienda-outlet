import styles from "./ProductSection.module.css";
import ProductCard from "./ProductCard";

export default function ProductSection({ title, products, verTodosHref }) {
  if (!products || products.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          {verTodosHref && (
            <a href={verTodosHref} className={styles.verTodos}>
              Ver todos
            </a>
          )}
        </div>
        <div className={styles.grid}>
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
