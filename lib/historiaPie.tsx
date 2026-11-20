// Pie de las historias que suben los vendedores desde su celular:
// "Consultá con tu vendedor" con destellos a los costados y una flecha
// que apunta hacia abajo (a la barra para responder la historia).

const BLANCO = "white";

function Destellos({ lado }: { lado: "izq" | "der" }) {
  // Tres rayitas que apuntan hacia el texto (coordenadas espejadas a mano)
  const x = (n: number) => (lado === "izq" ? n : 90 - n);
  const d = `M ${x(28)} 14 L ${x(60)} 42 M ${x(12)} 66 L ${x(58)} 66 M ${x(28)} 118 L ${x(60)} 90`;
  return (
    <svg width={90} height={130} viewBox="0 0 90 130">
      <path d={d} stroke={BLANCO} strokeWidth={9} strokeLinecap="round" fill="none" />
    </svg>
  );
}

function Flecha() {
  // Flecha curva dibujada a mano, apuntando hacia abajo
  return (
    <svg width={88} height={96} viewBox="0 0 110 120">
      <g stroke={BLANCO} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M 88 10 C 60 22, 40 50, 42 104" />
        <path d="M 18 80 L 42 106 L 66 84" />
      </g>
    </svg>
  );
}

export function PieConsultaVendedor() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "#B5853F",
        color: BLANCO,
        paddingTop: 30,
        paddingBottom: 50,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <Destellos lado="izq" />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontSize: 80,
            fontWeight: 600,
            lineHeight: 1.02,
            letterSpacing: -1,
          }}
        >
          <span>Consultá con</span>
          <span>tu vendedor</span>
        </div>
        <Destellos lado="der" />
      </div>
      <div style={{ display: "flex", marginTop: 10 }}>
        <Flecha />
      </div>
    </div>
  );
}
