"use client";
import styles from "./ProductCard.module.css";

const WA = "5403401642045";

function fmt(n) {
  return Math.round(n).toLocaleString("es-AR");
}

export default function ProductCard({ product }) {
  const { nombre, precio_contado, precio_financiado, precio_cuota, cuotas, imagen_url, entrega_inicial } = product;
  const waMsg = encodeURIComponent(`Hola, me interesa: ${nombre}`);
  const descuento = precio_financiado > precio_contado
    ? Math.round(((precio_financiado - precio_contado) / precio_financiado) * 100)
    : 0;

  return (
    <a
      href={`https://wa.me/${WA}?text=${waMsg}`}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.card}
    >
      <div className={styles.imgWrap}>
        {descuento > 0 && <span className={styles.disc}>{descuento}% OFF</span>}
        <img
          src={imagen_url}
          alt={nombre}
          className={styles.img}
          loading="lazy"
          onError={(e) => { e.currentTarget.style.opacity = "0"; }}
        />
        <div className={styles.imgMask} />
      </div>
      <div className={styles.body}>
        <p className={styles.name}>{nombre}</p>
        {precio_financiado > precio_contado && (
          <span className={styles.oldPrice}>${fmt(precio_financiado)}</span>
        )}
        <span className={styles.price}>${fmt(precio_contado)}</span>
        <span className={styles.cuota}>Hasta {cuotas} cuotas sin interés</span>
        {entrega_inicial > 0 && (
          <span className={styles.entrega}>Entrega: ${fmt(entrega_inicial)}</span>
        )}
      </div>
    </a>
  );
}
