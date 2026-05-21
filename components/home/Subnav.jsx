"use client";
import styles from "./Subnav.module.css";

const categorias = [
  { label: "Electrodomésticos", href: "/catalogo?categoria=Electrodom%C3%A9sticos" },
  { label: "Tecnología", href: "/catalogo?categoria=Inform%C3%A1tica+y+Celulares" },
  { label: "Muebles y Hogar", href: "/catalogo?categoria=Muebles" },
  { label: "Motos", href: "/catalogo?q=moto" },
  { label: "Bicicletas", href: "/catalogo?q=bicicleta" },
  { label: "Baño", href: "/catalogo?q=ba%C3%B1o" },
  { label: "Combos", href: "/catalogo?q=combo" },
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
