"use client";
import styles from "./CombosSection.module.css";

const WA = "5403401642045";

function formatPrecio(n) {
  return "$" + Math.round(n).toLocaleString("es-AR");
}

// Normaliza combos: soporta {productos:[...]} o {slots:[{producto, cantidad, label}]}
function resolverSlots(combo) {
  if (combo.slots) return combo.slots.filter((s) => s.producto);
  return (combo.productos || []).filter(Boolean).map((p) => ({ producto: p, cantidad: 1, label: null }));
}

function ComboCard({ combo }) {
  const slots = resolverSlots(combo);
  if (slots.length < 2) return null;

  const total = slots.reduce((s, { producto, cantidad }) => s + producto.precio_contado * cantidad, 0);
  const cuota = slots.reduce((s, { producto, cantidad }) => s + producto.precio_cuota * cantidad, 0);
  const cuotas = slots[0]?.producto?.cuotas ?? 12;

  const msg = encodeURIComponent(
    `Hola! Me interesa el ${combo.nombre}:\n` +
    slots.map(({ producto, cantidad, label }) =>
      `• ${cantidad > 1 ? `${cantidad}x ` : ""}${label ?? producto.nombre} — ${formatPrecio(producto.precio_contado * cantidad)}`
    ).join("\n") +
    `\nTotal: ${formatPrecio(total)}`
  );

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.emoji}>{combo.emoji}</span>
        <div>
          <div className={styles.tag}>COMBO ECONÓMICO</div>
          <h3 className={styles.nombre}>{combo.nombre}</h3>
        </div>
      </div>

      <div className={styles.productos}>
        {slots.map(({ producto: p, cantidad, label }, i) => (
          <div key={`${p.id}-${i}`} className={styles.productoWrap}>
            <div className={styles.productoItem}>
              <div className={styles.imgWrap}>
                {cantidad > 1 && <span className={styles.cantBadge}>x{cantidad}</span>}
                <img
                  src={`/api/imagen?v=13&url=${encodeURIComponent((p.imagen_url || "").split("?")[0])}`}
                  alt={p.nombre}
                  className={styles.img}
                  onError={(e) => { e.currentTarget.style.opacity = "0"; }}
                />
                <div className={styles.imgMask} />
              </div>
              <div className={styles.productoNombre}>{label ?? p.nombre}</div>
              <div className={styles.productoPrecio}>{formatPrecio(p.precio_contado * cantidad)}</div>
            </div>
            {i < slots.length - 1 && <span className={styles.plus}>+</span>}
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <div className={styles.totalWrap}>
          <span className={styles.totalLabel}>Total combo</span>
          <span className={styles.totalPrecio}>{formatPrecio(total)}</span>
          <span className={styles.cuota}>
            {cuotas} cuotas de {formatPrecio(cuota)} sin interés
          </span>
        </div>
        <a
          href={`https://wa.me/${WA}?text=${msg}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.waBtn}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Consultar combo
        </a>
      </div>
    </div>
  );
}

export default function CombosSection({ combos = [] }) {
  const visibles = combos.filter((c) => resolverSlots(c).length >= 2);
  if (visibles.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.heading}>💰 Combos Económicos Recomendados</h2>
            <p className={styles.sub}>Llevate todo junto y ahorrá — financiación en cuotas sin interés</p>
          </div>
        </div>
        <div className={styles.grid}>
          {visibles.map((combo) => (
            <ComboCard key={combo.id} combo={combo} />
          ))}
        </div>
      </div>
    </section>
  );
}
