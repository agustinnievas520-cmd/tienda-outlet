import styles from "./OfertaSemanal.module.css";
import ProductCard from "./ProductCard";

export default function OfertaSemanal({ products = [] }) {
  if (products.length === 0) return null;

  return (
    <section className={styles.section}>
      {/* Banner header */}
      <div className={styles.banner}>
        <div className={styles.bannerInner}>
          <div className={styles.bannerLeft}>
            <span className={styles.fire}>🔥</span>
            <div>
              <div className={styles.bannerTitle}>OFERTA SEMANAL</div>
              <div className={styles.bannerSub}>Solo por esta semana · Stock limitado</div>
            </div>
          </div>
          <a href="/catalogo?categoria=Comercial+y+Gastron%C3%B3mico" className={styles.verTodos}>
            Ver todos →
          </a>
        </div>
      </div>

      {/* Productos */}
      <div className={styles.inner}>
        <div className={styles.grid}>
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
