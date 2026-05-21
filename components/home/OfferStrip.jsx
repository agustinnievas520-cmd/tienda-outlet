"use client";
import { useState, useEffect } from "react";
import styles from "./OfferStrip.module.css";

const WA = "5403401642045";

function getEndOfDay() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function useCountdown(targetMs) {
  const [remaining, setRemaining] = useState(targetMs - Date.now());

  useEffect(() => {
    const t = setInterval(() => {
      const left = targetMs - Date.now();
      setRemaining(left > 0 ? left : 0);
    }, 1000);
    return () => clearInterval(t);
  }, [targetMs]);

  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return { h, m, s };
}

function Digit({ value, label }) {
  const str = String(value).padStart(2, "0");
  return (
    <div className={styles.digit}>
      <span className={styles.num}>{str}</span>
      <span className={styles.digitLabel}>{label}</span>
    </div>
  );
}

export default function OfferStrip() {
  const [end] = useState(getEndOfDay);
  const { h, m, s } = useCountdown(end);

  return (
    <section className={styles.strip}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <span className={styles.fire}>🔥</span>
          <div className={styles.textBlock}>
            <span className={styles.title}>OFERTA DEL DÍA</span>
            <span className={styles.sub}>Aire Acond. 3000 F/C — solo hoy</span>
          </div>
        </div>

        <div className={styles.center}>
          <span className={styles.timerLabel}>Termina en:</span>
          <div className={styles.timer}>
            <Digit value={h} label="hs" />
            <span className={styles.sep}>:</span>
            <Digit value={m} label="min" />
            <span className={styles.sep}>:</span>
            <Digit value={s} label="seg" />
          </div>
        </div>

        <div className={styles.right}>
          <span className={styles.oldPrice}>$679.999</span>
          <span className={styles.price}>$579.999</span>
          <a
            href={`https://wa.me/${WA}?text=Hola, me interesa el Aire Acondicionado 3000 F/C en oferta`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btn}
          >
            ¡Lo quiero!
          </a>
        </div>
      </div>
    </section>
  );
}
