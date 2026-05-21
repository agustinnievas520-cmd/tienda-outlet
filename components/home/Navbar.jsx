"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Navbar.module.css";

const WA = "5403401642045";

export default function Navbar() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) router.push(`/catalogo?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <a href="/" className={styles.logo}>
          <div className={styles.logoIconWrap}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" fill="#FFD100" stroke="#FFD100" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M9 21V12h6v9" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className={styles.logoText}>
            <span className={styles.logoName}>
              <span className={styles.outlet}>OUTLET</span>
              <span className={styles.hogar}> HOGAR</span>
            </span>
            <span className={styles.logoSub}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              El Trébol, Santa Fe
            </span>
          </div>
        </a>

        <form className={styles.search} onSubmit={handleSearch}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar productos, marcas y más..."
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchBtn}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z"/>
            </svg>
          </button>
        </form>

        <div className={styles.actions}>
          <a href="/catalogo" className={styles.catalogoBtn}>Ver catálogo</a>
          <a
            href={`https://wa.me/${WA}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.waBtn}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
            </svg>
            Consultar por WhatsApp
          </a>
        </div>
      </div>
    </nav>
  );
}
