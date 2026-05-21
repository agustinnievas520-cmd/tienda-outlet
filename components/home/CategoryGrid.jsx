import styles from "./CategoryGrid.module.css";

const categorias = [
  { label: "Smart TV",          href: "/catalogo?categoria=Smart+TV",                     img: "/categorias/smart-tv.jpg" },
  { label: "Climatización",     href: "/catalogo?categoria=Climatizaci%C3%B3n",           img: "/categorias/climatizacion.jpg" },
  { label: "Cocina y Lavado",   href: "/catalogo?categoria=Cocina+y+Lavado",              img: "/categorias/cocina-lavado.jpg" },
  { label: "Celulares",         href: "/catalogo?categoria=Inform%C3%A1tica+y+Celulares", img: "/categorias/celulares.jpg" },
  { label: "Audio y Video",     href: "/catalogo?categoria=Audio%2C+Video+y+Accesorios",  img: "/categorias/audio-video.jpg" },
  { label: "Hogar y Jardín",    href: "/catalogo?categoria=Hogar+y+Jard%C3%ADn",          img: "/categorias/hogar-jardin.jpg" },
  { label: "Muebles",           href: "/catalogo?categoria=Muebles",                      img: "/categorias/muebles.jpg" },
  { label: "Electrodomésticos", href: "/catalogo?categoria=Electrodom%C3%A9sticos",       img: "/categorias/electrodomesticos.jpg" },
  { label: "Colchones",         href: "/catalogo?categoria=Colchones+y+Sommiers",         img: "/categorias/colchones.jpg" },
  { label: "Bicicletas",        href: "/catalogo?q=bicicleta",                            img: "/categorias/bicicletas.jpg" },
];

export default function CategoryGrid() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 className={styles.heading}>Explorá por categoría</h2>
          <a href="/catalogo" className={styles.verTodas}>Ver todas</a>
        </div>
        <div className={styles.grid}>
          {categorias.map((c) => (
            <a key={c.label} href={c.href} className={styles.card}>
              <div className={styles.imgWrap}>
                <img src={c.img} alt={c.label} className={styles.catImg} />
              </div>
              <span className={styles.label}>{c.label}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
