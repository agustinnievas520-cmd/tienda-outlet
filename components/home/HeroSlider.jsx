"use client";
import { useState, useEffect, useCallback } from "react";
import styles from "./HeroSlider.module.css";

const WA = "5403401642045";

const slides = [
  {
    badge: "OFERTAS ESPECIALES",
    line1: "LO MEJOR PARA",
    line2: "TU HOGAR",
    trust: ["Hasta 12 cuotas sin interés", "Envíos rápidos a domicilio", "Garantía en todos los productos"],
    cta: "Ver ofertas",
    ctaHref: "/catalogo",
  },
  {
    badge: "NUEVO INGRESO",
    line1: "TECNOLOGÍA",
    line2: "AL MEJOR PRECIO",
    trust: ["Smart TVs, celulares y más", "Stock permanente", "Financiación directa sin banco"],
    cta: "Ver tecnología",
    ctaHref: "/catalogo?categoria=Smart+TV",
  },
  {
    badge: "FINANCIACIÓN PROPIA",
    line1: "LLEVATE HOY,",
    line2: "PAGÁ DESPUÉS",
    trust: ["Solo con tu DNI", "Sin tarjeta ni banco", "Cuotas semanales, quincenales o mensuales"],
    cta: "Consultar ahora",
    ctaHref: `https://wa.me/${WA}`,
  },
];

export default function HeroSlider({ heroImages = [] }) {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), []);

  useEffect(() => {
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [next]);

  const slide = slides[current];

  return (
    <div className={styles.wrap}>
      <div className={styles.slide}>
        {/* Fondo negro izquierda + diagonal amarilla derecha */}
        <div className={styles.bg} />

        <div className={styles.content}>
          <span className={styles.badge}>{slide.badge}</span>
          <h1 className={styles.line1}>{slide.line1}</h1>
          <h1 className={styles.line2}>{slide.line2}</h1>

          <div className={styles.trust}>
            {slide.trust.map((t, i) => (
              <div key={i} className={styles.trustItem}>
                <div className={styles.trustIcon}>
                  {i === 0 && <svg width="18" height="18" fill="none" stroke="#FFD100" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>}
                  {i === 1 && <svg width="18" height="18" fill="none" stroke="#FFD100" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8"/></svg>}
                  {i === 2 && <svg width="18" height="18" fill="none" stroke="#FFD100" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>}
                </div>
                <span>{t}</span>
              </div>
            ))}
          </div>

          <a href={slide.ctaHref} className={styles.cta}>{slide.cta}</a>
        </div>

        {/* Decoración diagonal derecha - sin imágenes */}
        <div className={styles.decoRight}>
          <span className={styles.decoText}>OUTLET</span>
          <span className={styles.decoText}>HOGAR</span>
        </div>

        <div className={styles.dots}>
          {slides.map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === current ? styles.dotActive : ""}`}
              onClick={() => setCurrent(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
