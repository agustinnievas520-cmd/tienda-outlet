"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { calcularOpcionesFinanciamiento, formatearPrecio } from "@/lib/calculos";

interface Producto {
  id: number;
  nombre: string;
  categoria: string;
  precio_costo: number;
  precio_financiado: number;
  imagen_url: string;
}

interface Props {
  vendedor: { nombre: string; codigo: string };
  categorias: string[];
}

interface Historia {
  producto: Producto;
  url: string; // object URL para la vista previa
  archivo: File;
}

export default function PanelVendedor({ vendedor, categorias }: Props) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("");
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState<number | null>(null);
  const [historia, setHistoria] = useState<Historia | null>(null);
  const [aviso, setAviso] = useState("");
  const [linkCopiado, setLinkCopiado] = useState(false);
  const pedidoActual = useRef(0);

  // El dominio se arma en el navegador (después de cargar) para no
  // desfasar lo que dibuja el servidor con lo que dibuja el celular.
  const [miLink, setMiLink] = useState(`/?v=${vendedor.codigo}`);
  useEffect(() => {
    setMiLink(`${window.location.origin}/?v=${vendedor.codigo}`);
  }, [vendedor.codigo]);

  const cargar = useCallback(
    async (paginaPedida: number, reemplazar: boolean) => {
      const nro = ++pedidoActual.current;
      setCargando(true);
      try {
        const params = new URLSearchParams({ pagina: String(paginaPedida) });
        if (busqueda.trim()) params.set("q", busqueda.trim());
        if (categoria) params.set("categoria", categoria);
        const res = await fetch(`/api/productos?${params}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (nro !== pedidoActual.current) return; // llegó una búsqueda más nueva
        setProductos((prev) => (reemplazar ? data.productos : [...prev, ...data.productos]));
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
    const t = setTimeout(() => setAviso(""), 3500);
    return () => clearTimeout(t);
  }, [aviso]);

  const prepararHistoria = async (p: Producto) => {
    setGenerando(p.id);
    try {
      const res = await fetch(`/api/historia/${p.id}?v=${encodeURIComponent(vendedor.codigo)}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const archivo = new File([blob], `outlet-hogar-${p.id}.png`, { type: "image/png" });
      setHistoria({ producto: p, url: URL.createObjectURL(blob), archivo });
    } catch {
      setAviso("No se pudo armar la historia. Probá de nuevo.");
    } finally {
      setGenerando(null);
    }
  };

  const cerrarHistoria = () => {
    if (historia) URL.revokeObjectURL(historia.url);
    setHistoria(null);
  };

  const descargar = (h: Historia) => {
    const a = document.createElement("a");
    a.href = h.url;
    a.download = h.archivo.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const compartir = async (h: Historia) => {
    const datos = { files: [h.archivo] };
    if (navigator.canShare?.(datos)) {
      try {
        await navigator.share(datos);
      } catch (e) {
        if ((e as Error)?.name !== "AbortError") descargar(h);
      }
    } else {
      // Compu o celular sin "compartir": se descarga para subirla a mano
      descargar(h);
      setAviso("Imagen descargada. Subila a tu historia desde la galería.");
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
            {["", ...categorias].map((c) => (
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
      <main className="max-w-5xl mx-auto px-4 py-4">
        {productos.length === 0 && !cargando && (
          <p className="text-center text-gray-400 py-16">No encontramos productos con esa búsqueda.</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {productos.map((p) => {
            const semanal =
              p.precio_costo > 0
                ? calcularOpcionesFinanciamiento(p.precio_costo, p.precio_financiado)[0]
                : null;
            return (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="aspect-square bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/imagen?v=16&url=${encodeURIComponent(p.imagen_url.split("?")[0])}`}
                    alt={p.nombre}
                    loading="lazy"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug">{p.nombre}</p>
                  {semanal ? (
                    <p className="text-xs text-gray-500 mt-1">
                      12 x <strong className="text-[#3B2A1E]">{formatearPrecio(semanal.cuota)}</strong> semanal
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">Consultar precio</p>
                  )}
                  <button
                    onClick={() => prepararHistoria(p)}
                    disabled={generando !== null}
                    className="mt-auto pt-3 disabled:opacity-50"
                  >
                    <span className="block w-full bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50">
                      {generando === p.id ? "Armando..." : "📲 Subir a historia"}
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

      {/* Vista previa de la historia */}
      {historia && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4" onClick={cerrarHistoria}>
          <div className="w-full max-w-sm flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={historia.url} alt="Historia" className="max-h-[65vh] w-auto rounded-2xl shadow-2xl" />
            <button
              onClick={() => compartir(historia)}
              className="w-full bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white font-semibold py-3.5 rounded-xl text-base"
            >
              📲 Compartir en Instagram / WhatsApp
            </button>
            <div className="flex gap-2 w-full">
              <button onClick={() => descargar(historia)} className="flex-1 bg-white text-gray-800 font-medium py-3 rounded-xl text-sm">
                Guardar en el celu
              </button>
              <button onClick={cerrarHistoria} className="flex-1 bg-white/20 text-white font-medium py-3 rounded-xl text-sm">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {aviso && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] bg-[#C9994F] text-white text-sm px-4 py-3 rounded-xl shadow-lg max-w-[90vw]">
          {aviso}
        </div>
      )}
    </div>
  );
}
