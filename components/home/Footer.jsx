import styles from "./Footer.module.css";

const WA = "5403401642045";

const stats = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C9962A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    value: "+500",
    label: "Clientes satisfechos",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C9962A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="1"/>
        <path d="M16 8h4l3 3v5h-7V8z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/>
        <circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ),
    value: "Entregas",
    label: "todos los días",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C9962A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ),
    value: "Financiación",
    label: "directa",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C9962A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    ),
    value: "El Trébol",
    label: "y zona",
  },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.logo}>
            <div className={styles.logoCircle}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
              </svg>
            </div>
            <div>
              <div className={styles.logoName}>Outlet Hogar</div>
              <div className={styles.logoSub}>Todo para tu hogar</div>
            </div>
          </div>
          <p className={styles.tagline}>
            Equipá tu hogar con las mejores marcas y el mejor precio. Financiación propia sin banco ni tarjeta.
          </p>
          <a
            href={`https://wa.me/${WA}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.socialBtn}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884"/>
            </svg>
            WhatsApp
          </a>
        </div>

        {/* Categorías */}
        <div className={styles.col}>
          <h4 className={styles.colTitle}>Categorías</h4>
          <ul className={styles.list}>
            {["Electrodomésticos", "Tecnología", "Muebles", "Motos", "Combos"].map((c) => (
              <li key={c}>
                <a href={`/catalogo?categoria=${encodeURIComponent(c)}`} className={styles.linkRow}>
                  {c} <span className={styles.chevron}>›</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Información */}
        <div className={styles.col}>
          <h4 className={styles.colTitle}>Información</h4>
          <ul className={styles.list}>
            {["Cómo compramos", "Financiación", "Envíos y entrega", "Preguntas frecuentes"].map((item) => (
              <li key={item}>
                <a href="#" className={styles.linkRow}>
                  {item} <span className={styles.chevron}>›</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Contacto */}
        <div className={styles.col}>
          <h4 className={styles.colTitle}>Contacto</h4>
          <ul className={styles.list}>
            <li className={styles.contactItem}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#C9962A">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884"/>
              </svg>
              <a href={`https://wa.me/${WA}`} target="_blank" rel="noopener noreferrer">
                WhatsApp: +54 3401 642-045
              </a>
            </li>
            <li className={styles.contactItem}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#C9962A">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="#111"/>
              </svg>
              <span>El Trébol, Santa Fe</span>
            </li>
            <li className={styles.contactItem}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9962A" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>Lunes a Sábados<br />9:00 — 20:00 hs</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Stats bar */}
      <div className={styles.stats}>
        <div className={styles.statsInner}>
          {stats.map((s) => (
            <div key={s.value} className={styles.statItem}>
              {s.icon}
              <div>
                <div className={styles.statValue}>{s.value}</div>
                <div className={styles.statLabel}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom */}
      <div className={styles.bottom}>
        <div className={styles.bottomInner}>
          <span>© 2025 Outlet Hogar — El Trébol, Santa Fe</span>
          <span>Todos los precios son en pesos argentinos</span>
        </div>
      </div>
    </footer>
  );
}
