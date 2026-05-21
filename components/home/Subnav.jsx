"use client";
import styles from "./Subnav.module.css";

const categorias = [
  { label: "Electrodomésticos", href: "/catalogo?cat=electrodomesticos" },
  { label: "Tecnología", href: "/catalogo?cat=tecnologia" },
  { label: "Muebles y Hogar", href: "/catalogo?cat=muebles" },
  { label: "Motos", href: "/catalogo?cat=motos" },
  { label: "Bicicletas", href: "/catalogo?cat=bicicletas" },
  { label: "Baño", href: "/catalogo?cat=bano" },
  { label: "Combos", href: "/catalogo?cat=combos" },
  { label: "🔥 Ofertas", href: "/catalogo?orden=precio_asc" },
];

export default function Subnav() {
  return (
    <div className={styles.bar}>
      <div className={styles.inner}>
        {categorias.map((c) => (
          <a key={c.label} href={c.href} className={styles.link}>
            {c.label}
          </a>
        ))}
      </div>
    </div>
  );
}
