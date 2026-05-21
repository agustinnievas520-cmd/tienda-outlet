import styles from "./Footer.module.css";

const WA = "5403401642045";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🏠</span>
            <div>
              <div className={styles.logoName}>Outlet Hogar</div>
              <div className={styles.logoSub}>Todo para tu hogar</div>
            </div>
          </div>
          <p className={styles.tagline}>
            Equipá tu hogar con las mejores marcas y el mejor precio. Financiación propia sin banco ni tarjeta.
          </p>
          <div className={styles.social}>
            <a
              href={`https://wa.me/${WA}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialBtn}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
              </svg>
              WhatsApp
            </a>
          </div>
        </div>

        <div className={styles.col}>
          <h4 className={styles.colTitle}>Categorías</h4>
          <ul className={styles.list}>
            <li><a href="/catalogo?cat=electrodomesticos">Electrodomésticos</a></li>
            <li><a href="/catalogo?cat=tecnologia">Tecnología</a></li>
            <li><a href="/catalogo?cat=muebles">Muebles</a></li>
            <li><a href="/catalogo?cat=motos">Motos</a></li>
            <li><a href="/catalogo?cat=combos">Combos</a></li>
          </ul>
        </div>

        <div className={styles.col}>
          <h4 className={styles.colTitle}>Información</h4>
          <ul className={styles.list}>
            <li><a href="#">Cómo compramos</a></li>
            <li><a href="#">Financiación</a></li>
            <li><a href="#">Envíos y entrega</a></li>
            <li><a href="#">Preguntas frecuentes</a></li>
          </ul>
        </div>

        <div className={styles.col}>
          <h4 className={styles.colTitle}>Contacto</h4>
          <ul className={styles.list}>
            <li>
              <a href={`https://wa.me/${WA}`} target="_blank" rel="noopener noreferrer">
                WhatsApp: +54 3401 642-045
              </a>
            </li>
            <li>El Trébol, Santa Fe</li>
            <li>Lunes a Sábados</li>
            <li>9:00 — 20:00 hs</li>
          </ul>
        </div>
      </div>

      <div className={styles.bottom}>
        <div className={styles.bottomInner}>
          <span>© 2025 Outlet Hogar — El Trébol, Santa Fe</span>
          <span>Todos los precios son en pesos argentinos</span>
        </div>
      </div>
    </footer>
  );
}
