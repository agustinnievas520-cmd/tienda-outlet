"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { calcularOpcionesFinanciamiento, formatearPrecio } from "@/lib/calculos";
import { IPHONES_USADOS, ORDEN_MODELOS } from "@/lib/data/iphonesUsados";

interface Producto {
  id: number;
  nombre: string;
  categoria?: string;
  precio_costo: number;
  precio_financiado?: number;
  imagen_url: string;
  // Solo para los iPhone usados (no están en la base de productos)
  foto?: string;
  historia?: string;
  linea?: string;
}

// Los iPhone usados se muestran en el panel con ids negativos (-1, -2, …)
// para no chocar con los productos de la base.
const CAT_IPHONE = "📱 iPhone Usados";
const IPHONES_PANEL: Producto[] = IPHONES_USADOS.filter((p) => p.disponible)
  .sort((a, b) => ORDEN_MODELOS.indexOf(a.modelo) - ORDEN_MODELOS.indexOf(b.modelo) || a.entrega - b.entrega)
  .map((p, i) => ({
    id: -(i + 1),
    nombre: `${p.modelo} ${p.capacidad} ${p.color} · Batería ${p.bateria}%${p.conCaja ? " · Con caja" : ""}`,
    categoria: CAT_IPHONE,
    precio_costo: 0,
    imagen_url: "",
    foto: p.foto,
    historia: `/api/historia-iphone/${p.id}`,
    linea: `Entrega ${formatearPrecio(p.entrega)} · 16 x ${formatearPrecio(p.semanal)} semanal`,
  }));

const urlHistoria = (p: Producto, codigo: string) =>
  `${p.historia ?? `/api/historia/${p.id}`}?v=${encodeURIComponent(codigo)}`;

const iphonesQueCoinciden = (q: string) => {
  const t = q.trim().toLowerCase();
  return t ? IPHONES_PANEL.filter((p) => p.nombre.toLowerCase().includes(t)) : IPHONES_PANEL;
};

interface Props {
  vendedor: { nombre: string; codigo: string };
  categorias: string[];
}

type Destino = "instagram" | "whatsapp" | "los-dos";

interface Seleccion {
  producto: Producto;
  estado: "preparando" | "listo" | "error";
  url?: string; // object URL de la imagen
  archivo?: File;
  blob?: Blob;
  // elegir → (los dos) falta-whatsapp → listo
  paso: "elegir" | "falta-whatsapp" | "listo";
}

// Varias historias juntas (lo máximo que Instagram y WhatsApp aceptan de una vez)
const MAX_JUNTAS = 10;

interface Lote {
  productos: Producto[];
  archivos: (File | null)[];
  urls: (string | null)[];
  preparados: number;
  fallidos: number;
  paso: "elegir" | "falta-whatsapp" | "listo";
}

const AYUDA: Record<"instagram" | "whatsapp", string> = {
  instagram: "En el menú que se abre tocá Instagram y elegí Historia",
  whatsapp: "En el menú que se abre tocá WhatsApp y elegí Mi estado",
};

const BOTONES_DESTINO: [Destino, string, string][] = [
  ["instagram", "📸  Instagram", "bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045]"],
  ["whatsapp", "💬  WhatsApp", "bg-[#25D366]"],
  ["los-dos", "⭐  Los dos (Instagram y después WhatsApp)", "bg-[#C9994F]"],
];

export default function PanelVendedor({ vendedor, categorias }: Props) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("");
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [sel, setSel] = useState<Seleccion | null>(null);
  const [aviso, setAviso] = useState("");
  const [linkCopiado, setLinkCopiado] = useState(false);
  const pedidoActual = useRef(0);
  const [marcados, setMarcados] = useState<Producto[]>([]);
  const [lote, setLote] = useState<Lote | null>(null);
  const [qrLote, setQrLote] = useState("");
  const loteActual = useRef(0);

  // El dominio se arma en el navegador (después de cargar) para no
  // desfasar lo que dibuja el servidor con lo que dibuja el celular.
  const [miLink, setMiLink] = useState(`/?v=${vendedor.codigo}`);
  useEffect(() => {
    setMiLink(`${window.location.origin}/?v=${vendedor.codigo}`);
  }, [vendedor.codigo]);

  // ¿Celular o compu? ¿Navegador interno de Instagram/Facebook (no deja compartir)?
  const [esCelu, setEsCelu] = useState(true);
  const [navegadorInterno, setNavegadorInterno] = useState(false);
  const [qr, setQr] = useState("");
  useEffect(() => {
    const ua = navigator.userAgent;
    setEsCelu(/Android|iPhone|iPad|iPod/i.test(ua) || window.matchMedia("(pointer: coarse)").matches);
    setNavegadorInterno(/Instagram|FBAN|FBAV/i.test(ua));
  }, []);

  const cargar = useCallback(
    async (paginaPedida: number, reemplazar: boolean) => {
      const nro = ++pedidoActual.current;
      // iPhone usados: no están en la base, se filtran acá mismo
      if (categoria === CAT_IPHONE) {
        setProductos(iphonesQueCoinciden(busqueda));
        setTotalPaginas(1);
        setPagina(1);
        setCargando(false);
        return;
      }
      setCargando(true);
      try {
        const params = new URLSearchParams({ pagina: String(paginaPedida) });
        if (busqueda.trim()) params.set("q", busqueda.trim());
        if (categoria) params.set("categoria", categoria);
        const res = await fetch(`/api/productos?${params}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (nro !== pedidoActual.current) return; // llegó una búsqueda más nueva
        // Si buscan "iphone" en Todas, los iPhone usados aparecen primero
        const extra = paginaPedida === 1 && !categoria && /iphone/i.test(busqueda) ? iphonesQueCoinciden(busqueda) : [];
        setProductos((prev) => (reemplazar ? [...extra, ...data.productos] : [...prev, ...data.productos]));
        setTotalPaginas(data.totalPaginas ?? 1);
        setPagina(paginaPedida);
      } catch {
        if (nro === pedidoActual.current) setAviso("No se pudieron cargar los productos. Probá de nuevo.");
      } finally {
        if (nro === pedidoActual.current) setCargando(false);
      }
    },
    [busqueda, categoria]
  );

  // Busca de nuevo cuando cambia el texto (con una pausa corta) o la categoría
  useEffect(() => {
    const t = setTimeout(() => cargar(1, true), 350);
    return () => clearTimeout(t);
  }, [cargar]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(""), 4000);
    return () => clearTimeout(t);
  }, [aviso]);

  // Arranca a preparar la imagen apenas tocan el producto; mientras tanto
  // ya ven el menú para elegir a dónde subirla.
  const abrirProducto = useCallback(
    async (p: Producto) => {
      setSel({ producto: p, estado: "preparando", paso: "elegir" });
      setQr("");
      try {
        const res = await fetch(urlHistoria(p, vendedor.codigo));
        if (!res.ok) throw new Error();
        const blob = await res.blob();
        const archivo = new File([blob], `outlet-hogar-${Math.abs(p.id)}${p.id < 0 ? "-iphone" : ""}.png`, { type: "image/png" });
        setSel((s) =>
          s && s.producto.id === p.id
            ? { ...s, estado: "listo", url: URL.createObjectURL(blob), archivo, blob }
            : s
        );
      } catch {
        setSel((s) => (s && s.producto.id === p.id ? { ...s, estado: "error" } : s));
      }
    },
    [vendedor.codigo]
  );

  // En la compu: código QR que abre este mismo producto en el celular
  const idSeleccionado = sel?.producto.id;
  useEffect(() => {
    if (!idSeleccionado || esCelu) return;
    const url = `${window.location.origin}/vendedor/${vendedor.codigo}?p=${idSeleccionado}`;
    QRCode.toDataURL(url, { width: 220, margin: 1, color: { dark: "#3B2A1E", light: "#FFFFFF" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [idSeleccionado, esCelu, vendedor.codigo]);

  // ── Varias historias juntas ──
  const estaMarcado = (id: number) => marcados.some((m) => m.id === id);
  const alternarMarcado = (p: Producto) => {
    if (estaMarcado(p.id)) {
      setMarcados((ms) => ms.filter((m) => m.id !== p.id));
    } else if (marcados.length >= MAX_JUNTAS) {
      setAviso(`Podés elegir hasta ${MAX_JUNTAS} por vez`);
    } else {
      setMarcados((ms) => [...ms, p]);
    }
  };

  // Prepara todas las imágenes (de a 3 a la vez para no trabar el celu)
  const abrirLote = useCallback(
    async (lista: Producto[]) => {
      const nro = ++loteActual.current;
      setLote({
        productos: lista,
        archivos: lista.map(() => null),
        urls: lista.map(() => null),
        preparados: 0,
        fallidos: 0,
        paso: "elegir",
      });
      setQrLote("");
      let siguiente = 0;
      const trabajador = async () => {
        while (siguiente < lista.length) {
          const k = siguiente++;
          const p = lista[k];
          let archivo: File | null = null;
          try {
            const res = await fetch(urlHistoria(p, vendedor.codigo));
            if (!res.ok) throw new Error();
            const blob = await res.blob();
            archivo = new File([blob], `outlet-hogar-${Math.abs(p.id)}${p.id < 0 ? "-iphone" : ""}.png`, { type: "image/png" });
          } catch {
            archivo = null;
          }
          if (nro !== loteActual.current) return;
          const url = archivo ? URL.createObjectURL(archivo) : null;
          setLote((l) =>
            l
              ? {
                  ...l,
                  archivos: l.archivos.map((a, j) => (j === k ? archivo : a)),
                  urls: l.urls.map((u, j) => (j === k ? url : u)),
                  preparados: l.preparados + (archivo ? 1 : 0),
                  fallidos: l.fallidos + (archivo ? 0 : 1),
                }
              : l
          );
        }
      };
      await Promise.all([trabajador(), trabajador(), trabajador()]);
    },
    [vendedor.codigo]
  );

  const cerrarLote = () => {
    loteActual.current++;
    lote?.urls.forEach((u) => u && URL.revokeObjectURL(u));
    setLote(null);
  };

  const loteListo = !!lote && lote.preparados + lote.fallidos === lote.productos.length;
  const archivosLote = (lote?.archivos.filter(Boolean) as File[]) ?? [];

  const descargarLote = async () => {
    for (const f of archivosLote) {
      const url = URL.createObjectURL(f);
      const a = document.createElement("a");
      a.href = url;
      a.download = f.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      await new Promise((r) => setTimeout(r, 400)); // el navegador baja de a una
    }
  };

  const compartirLote = async (destino: Destino) => {
    if (!loteListo || archivosLote.length === 0) return;
    const datos = { files: archivosLote };
    if (!navigator.canShare?.(datos)) {
      await descargarLote();
      setAviso("Imágenes guardadas. Subilas a tu historia desde la galería.");
      return;
    }
    setAviso(AYUDA[destino === "whatsapp" ? "whatsapp" : "instagram"]);
    try {
      await navigator.share(datos);
      setLote((l) =>
        l ? { ...l, paso: destino === "los-dos" && l.paso === "elegir" ? "falta-whatsapp" : "listo" } : l
      );
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        await descargarLote();
        setAviso("No se pudo compartir: las guardamos en tu celu.");
      }
    }
  };

  // En la compu: QR que abre estos mismos productos en el celular
  const idsLote = lote?.productos.map((p) => p.id).join(",");
  useEffect(() => {
    if (!idsLote || esCelu) return;
    const url = `${window.location.origin}/vendedor/${vendedor.codigo}?ps=${idsLote}`;
    QRCode.toDataURL(url, { width: 220, margin: 1, color: { dark: "#3B2A1E", light: "#FFFFFF" } })
      .then(setQrLote)
      .catch(() => setQrLote(""));
  }, [idsLote, esCelu, vendedor.codigo]);

  // Si entraron escaneando el QR (?p=ID o ?ps=ID,ID,...), se abre directo
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // ids negativos = iPhone usados (están acá mismo, no en la base)
    const buscar = (n: number): Promise<Producto | null> =>
      n < 0
        ? Promise.resolve(IPHONES_PANEL.find((p) => p.id === n) ?? null)
        : fetch(`/api/productos/${n}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const id = Number(params.get("p"));
    if (id) {
      buscar(id).then((p) => {
        if (p?.id) abrirProducto(p);
      });
    }
    const ids = (params.get("ps") || "")
      .split(",")
      .map(Number)
      .filter((n) => Number.isInteger(n) && n !== 0)
      .slice(0, MAX_JUNTAS);
    if (ids.length) {
      Promise.all(ids.map(buscar))
        .then((lista) => {
          const ok = lista.filter((p): p is Producto => !!p?.id);
          if (ok.length) {
            setMarcados(ok);
            abrirLote(ok);
          }
        });
    }
  }, [abrirProducto, abrirLote]);

  const cerrar = () => {
    if (sel?.url) URL.revokeObjectURL(sel.url);
    setSel(null);
  };

  const descargar = (s: Seleccion) => {
    if (!s.url || !s.archivo) return;
    const a = document.createElement("a");
    a.href = s.url;
    a.download = s.archivo.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const copiarImagen = async (s: Seleccion) => {
    if (!s.blob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": s.blob })]);
      setAviso("Imagen copiada ✅ Pegala con Ctrl+V donde quieras");
    } catch {
      descargar(s);
      setAviso("Tu navegador no deja copiar imágenes: la descargamos.");
    }
  };

  // Abre el menú de compartir del celular con la imagen lista
  const compartir = async (destino: Destino) => {
    if (!sel || sel.estado !== "listo" || !sel.archivo) return;
    const datos = { files: [sel.archivo] };
    if (!navigator.canShare?.(datos)) {
      descargar(sel);
      setAviso("Imagen guardada. Subila a tu historia desde la galería.");
      return;
    }
    setAviso(AYUDA[destino === "whatsapp" ? "whatsapp" : "instagram"]);
    try {
      await navigator.share(datos);
      setSel((s) =>
        s ? { ...s, paso: destino === "los-dos" && s.paso === "elegir" ? "falta-whatsapp" : "listo" } : s
      );
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        descargar(sel);
        setAviso("No se pudo compartir: la guardamos en tu celu.");
      }
    }
  };

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(miLink);
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2000);
    } catch {
      setAviso(miLink);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F1E8]">
      {/* Encabezado */}
      <header className="bg-[#F3EADC] text-[#3B2A1E] px-4 pt-6 pb-5 border-b-4 border-[#C9994F]">
        <div className="max-w-5xl mx-auto">
          <p className="text-[#A67A3A] text-xs font-bold tracking-widest">OUTLET HOGAR · PANEL DE VENDEDOR</p>
          <h1 className="text-3xl font-semibold mt-1">Hola, {vendedor.nombre} 👋</h1>
          <p className="text-[#5A4530] text-sm mt-1">
            Tocá <strong className="text-[#3B2A1E]">&quot;Subir a historia&quot;</strong> en cualquier producto. La imagen sale con
            los precios del día y tu WhatsApp.
          </p>
          <p className="text-[#5A4530] text-sm mt-1">
            ¿Varios juntos? Tocá la <strong className="text-[#3B2A1E]">foto</strong> de cada producto para marcarlo (hasta{" "}
            {MAX_JUNTAS}) y subilos todos de una.
          </p>
          <div className="mt-4 flex items-center gap-2 bg-white rounded-xl p-2 border border-[#EADBC4]">
            <span className="flex-1 min-w-0 truncate text-xs text-[#5A4530] px-2">Tu link: {miLink}</span>
            <button
              onClick={copiarLink}
              className="flex-shrink-0 bg-[#C9994F] text-white text-xs font-semibold px-3 py-2 rounded-lg"
            >
              {linkCopiado ? "¡Copiado!" : "Copiar link"}
            </button>
          </div>
        </div>
      </header>

      {/* Buscador y categorías */}
      <div className="sticky top-0 z-10 bg-[#F7F1E8]/95 backdrop-blur px-4 pt-3 pb-2 shadow-sm">
        <div className="max-w-5xl mx-auto">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto (ej: heladera, bici, pileta)"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-base outline-none focus:border-[#C9994F]"
          />
          <div className="flex gap-2 overflow-x-auto mt-2 pb-1">
            {["", CAT_IPHONE, ...categorias].map((c) => (
              <button
                key={c || "todas"}
                onClick={() => setCategoria(c)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border ${
                  categoria === c
                    ? "bg-[#C9994F] text-white border-[#C9994F]"
                    : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                {c || "Todas"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Productos */}
      <main className={`max-w-5xl mx-auto px-4 py-4 ${marcados.length ? "pb-28" : ""}`}>
        {productos.length === 0 && !cargando && (
          <p className="text-center text-gray-400 py-16">No encontramos productos con esa búsqueda.</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {productos.map((p) => {
            const semanal =
              p.precio_costo > 0
                ? calcularOpcionesFinanciamiento(p.precio_costo, p.precio_financiado ?? 0)[0]
                : null;
            const marcado = estaMarcado(p.id);
            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col ring-2 ${
                  marcado ? "ring-[#C9994F]" : "ring-transparent"
                }`}
              >
                <button
                  type="button"
                  onClick={() => alternarMarcado(p)}
                  aria-pressed={marcado}
                  aria-label={marcado ? `Quitar ${p.nombre}` : `Marcar ${p.nombre}`}
                  className="relative aspect-square bg-white p-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.foto ?? `/api/imagen?v=17&url=${encodeURIComponent(p.imagen_url.split("?")[0])}`}
                    alt={p.nombre}
                    loading="lazy"
                    className={`w-full h-full object-contain ${marcado ? "opacity-80" : ""}`}
                  />
                  <span
                    className={`absolute top-2 right-2 w-8 h-8 rounded-full border-2 flex items-center justify-center text-base font-bold shadow ${
                      marcado ? "bg-[#C9994F] border-[#C9994F] text-white" : "bg-white/90 border-[#C9994F] text-transparent"
                    }`}
                  >
                    {marcado ? marcados.findIndex((m) => m.id === p.id) + 1 : "✓"}
                  </span>
                </button>
                <div className="p-3 flex flex-col flex-1">
                  <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug">{p.nombre}</p>
                  {p.linea ? (
                    <p className="text-xs text-gray-500 mt-1">{p.linea}</p>
                  ) : semanal ? (
                    <p className="text-xs text-gray-500 mt-1">
                      12 x <strong className="text-[#3B2A1E]">{formatearPrecio(semanal.cuota)}</strong> semanal
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">Consultar precio</p>
                  )}
                  <button onClick={() => abrirProducto(p)} className="mt-auto pt-3">
                    <span className="block w-full bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white text-sm font-semibold py-2.5 rounded-xl">
                      📲 Subir a historia
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {pagina < totalPaginas && (
          <div className="text-center mt-6">
            <button
              onClick={() => cargar(pagina + 1, false)}
              disabled={cargando}
              className="px-6 py-3 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-700"
            >
              {cargando ? "Cargando..." : "Ver más productos"}
            </button>
          </div>
        )}
        {cargando && productos.length === 0 && (
          <p className="text-center text-gray-400 py-16">Cargando productos...</p>
        )}
      </main>

      {/* Barra de los productos marcados */}
      {marcados.length > 0 && !lote && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-[#F3EADC] border-t-2 border-[#C9994F] px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.12)]">
          <div className="max-w-5xl mx-auto flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#3B2A1E]">
                {marcados.length} {marcados.length === 1 ? "elegido" : "elegidos"}
                <span className="font-normal text-[#5A4530]"> · máx. {MAX_JUNTAS}</span>
              </p>
              <button onClick={() => setMarcados([])} className="text-xs text-[#5A4530] underline underline-offset-2">
                Quitar todos
              </button>
            </div>
            <button
              onClick={() => abrirLote(marcados)}
              className="flex-shrink-0 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white text-sm font-semibold px-4 py-3 rounded-xl"
            >
              📲 Subir {marcados.length === 1 ? "1 historia" : `las ${marcados.length} historias`}
            </button>
          </div>
        </div>
      )}

      {/* Menú para subir varias historias juntas */}
      {lote && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center" onClick={cerrarLote}>
          <div
            className="w-full sm:max-w-lg bg-[#F7F1E8] rounded-t-3xl sm:rounded-3xl p-5 pb-7 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold tracking-widest text-[#A67A3A]">SUBIR {lote.productos.length} HISTORIAS</p>
                <p className="text-sm text-[#5A4530] mt-1">
                  {!loteListo &&
                    `Preparando ${lote.preparados + lote.fallidos} de ${lote.productos.length} con tus precios y tu WhatsApp…`}
                  {loteListo && lote.fallidos === 0 && "¡Todas listas! ✅"}
                  {loteListo && lote.fallidos > 0 &&
                    `${lote.preparados} listas ✅ · ${lote.fallidos} no se pudieron armar`}
                </p>
              </div>
              <button onClick={cerrarLote} className="text-[#5A4530] text-2xl leading-none px-1" aria-label="Cerrar">
                ×
              </button>
            </div>

            {/* Vista previa de las historias */}
            <div className="flex gap-2 overflow-x-auto mt-3 pb-1">
              {lote.productos.map((p, k) => (
                <div
                  key={p.id}
                  className="w-14 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-white border border-[#EADBC4] flex items-center justify-center"
                >
                  {lote.urls[k] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={lote.urls[k]!} alt={p.nombre} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-[9px] text-[#A67A3A] text-center px-1">
                      {loteListo ? "Error" : "…"}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* ── CELULAR ── */}
            {esCelu && (
              <div className="mt-5">
                {navegadorInterno && (
                  <p className="mb-3 text-xs bg-white border border-[#EADBC4] rounded-xl p-3 text-[#5A4530]">
                    ⚠️ Estás dentro de Instagram. Si no se abre el menú para compartir, tocá los 3 puntitos ⋯ y elegí{" "}
                    <strong>Abrir en el navegador</strong>.
                  </p>
                )}

                {lote.paso === "elegir" && (
                  <>
                    <p className="text-sm font-semibold text-[#3B2A1E] mb-2">¿Dónde las querés subir?</p>
                    <div className="grid gap-2">
                      {BOTONES_DESTINO.map(([dest, texto, color]) => (
                        <button
                          key={dest}
                          onClick={() => compartirLote(dest)}
                          disabled={!loteListo || archivosLote.length === 0}
                          className={`${color} text-white font-semibold py-4 rounded-2xl text-base disabled:opacity-50`}
                        >
                          {loteListo ? texto : "Preparando…"}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {lote.paso === "falta-whatsapp" && (
                  <div className="text-center">
                    <p className="text-sm text-[#3B2A1E] font-semibold">✅ ¡Listas en Instagram!</p>
                    <button
                      onClick={() => compartirLote("whatsapp")}
                      className="mt-3 w-full bg-[#25D366] text-white font-semibold py-4 rounded-2xl text-base"
                    >
                      💬 Ahora subilas a WhatsApp
                    </button>
                  </div>
                )}

                {lote.paso === "listo" && (
                  <div className="text-center">
                    <p className="text-lg text-[#3B2A1E] font-semibold">✅ ¡Listo! A vender 🙌</p>
                    <button
                      onClick={() => {
                        cerrarLote();
                        setMarcados([]);
                      }}
                      className="mt-3 w-full bg-[#C9994F] text-white font-semibold py-3.5 rounded-2xl"
                    >
                      Elegir otros productos
                    </button>
                  </div>
                )}

                {loteListo && lote.paso !== "listo" && archivosLote.length > 0 && (
                  <button
                    onClick={descargarLote}
                    className="mt-3 w-full text-sm text-[#5A4530] underline underline-offset-2"
                  >
                    ¿No te aparece? Guardalas en el celu
                  </button>
                )}
              </div>
            )}

            {/* ── COMPU ── */}
            {!esCelu && (
              <div className="mt-5 grid sm:grid-cols-[auto,1fr] gap-4 items-center">
                <div className="bg-white rounded-2xl p-3 border border-[#EADBC4] mx-auto">
                  {qrLote ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrLote} alt="Código QR" width={180} height={180} />
                  ) : (
                    <div className="w-[180px] h-[180px]" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#3B2A1E]">📱 Subilas desde tu celu</p>
                  <p className="text-xs text-[#5A4530] mt-1">
                    Escaneá este código con la cámara del celu y se abren estos mismos productos, listos para compartir
                    todos juntos.
                  </p>
                  <button
                    onClick={descargarLote}
                    disabled={!loteListo || archivosLote.length === 0}
                    className="mt-3 w-full bg-white border border-[#EADBC4] text-[#3B2A1E] font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50"
                  >
                    {loteListo ? `⬇️ Descargar las ${archivosLote.length}` : "Preparando…"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Menú para subir la historia */}
      {sel && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center" onClick={cerrar}>
          <div
            className="w-full sm:max-w-lg bg-[#F7F1E8] rounded-t-3xl sm:rounded-3xl p-5 pb-7 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-16 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-white border border-[#EADBC4] flex items-center justify-center">
                {sel.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sel.url} alt="Historia" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-[10px] text-[#A67A3A] text-center px-1">
                    {sel.estado === "error" ? "Error" : "Preparando…"}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold tracking-widest text-[#A67A3A]">SUBIR A HISTORIA</p>
                <p className="text-sm font-semibold text-[#3B2A1E] line-clamp-2">{sel.producto.nombre}</p>
                <p className="text-xs text-[#5A4530] mt-1">
                  {sel.estado === "preparando" && "Preparando la imagen con tus precios y tu WhatsApp…"}
                  {sel.estado === "listo" && "¡Imagen lista! ✅"}
                  {sel.estado === "error" && "No se pudo armar la imagen."}
                </p>
              </div>
              <button onClick={cerrar} className="text-[#5A4530] text-2xl leading-none px-1" aria-label="Cerrar">
                ×
              </button>
            </div>

            {sel.estado === "error" && (
              <button
                onClick={() => abrirProducto(sel.producto)}
                className="mt-4 w-full bg-[#C9994F] text-white font-semibold py-3 rounded-xl"
              >
                Probar de nuevo
              </button>
            )}

            {/* ── CELULAR ── */}
            {esCelu && sel.estado !== "error" && (
              <div className="mt-5">
                {navegadorInterno && (
                  <p className="mb-3 text-xs bg-white border border-[#EADBC4] rounded-xl p-3 text-[#5A4530]">
                    ⚠️ Estás dentro de Instagram. Si no se abre el menú para compartir, tocá los 3 puntitos ⋯ y elegí{" "}
                    <strong>Abrir en el navegador</strong>.
                  </p>
                )}

                {sel.paso === "elegir" && (
                  <>
                    <p className="text-sm font-semibold text-[#3B2A1E] mb-2">¿Dónde la querés subir?</p>
                    <div className="grid gap-2">
                      {BOTONES_DESTINO.map(([dest, texto, color]) => (
                        <button
                          key={dest}
                          onClick={() => compartir(dest)}
                          disabled={sel.estado !== "listo"}
                          className={`${color} text-white font-semibold py-4 rounded-2xl text-base disabled:opacity-50`}
                        >
                          {sel.estado === "listo" ? texto : "Preparando…"}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {sel.paso === "falta-whatsapp" && (
                  <div className="text-center">
                    <p className="text-sm text-[#3B2A1E] font-semibold">✅ ¡Listo en Instagram!</p>
                    <button
                      onClick={() => compartir("whatsapp")}
                      className="mt-3 w-full bg-[#25D366] text-white font-semibold py-4 rounded-2xl text-base"
                    >
                      💬 Ahora subila a WhatsApp
                    </button>
                  </div>
                )}

                {sel.paso === "listo" && (
                  <div className="text-center">
                    <p className="text-lg text-[#3B2A1E] font-semibold">✅ ¡Listo! A vender 🙌</p>
                    <button onClick={cerrar} className="mt-3 w-full bg-[#C9994F] text-white font-semibold py-3.5 rounded-2xl">
                      Elegir otro producto
                    </button>
                  </div>
                )}

                {sel.estado === "listo" && sel.paso !== "listo" && (
                  <button
                    onClick={() => descargar(sel)}
                    className="mt-3 w-full text-sm text-[#5A4530] underline underline-offset-2"
                  >
                    ¿No te aparece? Guardala en el celu
                  </button>
                )}
              </div>
            )}

            {/* ── COMPU ── */}
            {!esCelu && sel.estado !== "error" && (
              <div className="mt-5 grid sm:grid-cols-[auto,1fr] gap-4 items-center">
                <div className="bg-white rounded-2xl p-3 border border-[#EADBC4] mx-auto">
                  {qr ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qr} alt="Código QR" width={180} height={180} />
                  ) : (
                    <div className="w-[180px] h-[180px]" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#3B2A1E]">📱 Subila desde tu celu</p>
                  <p className="text-xs text-[#5A4530] mt-1">
                    Las historias se suben desde el celular. Escaneá este código con la cámara y se abre este mismo
                    producto, listo para compartir.
                  </p>
                  <div className="grid gap-2 mt-3">
                    <button
                      onClick={() => copiarImagen(sel)}
                      disabled={sel.estado !== "listo"}
                      className="bg-[#C9994F] text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50"
                    >
                      {sel.estado === "listo" ? "📋 Copiar imagen" : "Preparando…"}
                    </button>
                    <button
                      onClick={() => descargar(sel)}
                      disabled={sel.estado !== "listo"}
                      className="bg-white border border-[#EADBC4] text-[#3B2A1E] font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50"
                    >
                      ⬇️ Descargar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {aviso && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-[#3B2A1E] text-white text-sm px-4 py-3 rounded-xl shadow-lg max-w-[90vw] text-center">
          {aviso}
        </div>
      )}
    </div>
  );
}
