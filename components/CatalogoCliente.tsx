"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import TarjetaProducto from "./TarjetaProducto";
import ModalProducto from "./ModalProducto";

interface Producto {
  id: number;
  nombre: string;
  categoria: string;
  precio_costo: number;
  precio_contado: number;
  precio_financiado: number;
  precio_cuota: number;
  cuotas: number;
  imagen_url: string;
  disponible: boolean;
  url_origen: string;
  descripcion?: string | null;
  entrega_inicial?: number;
}

interface RespuestaAPI {
  productos: Producto[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

interface Props {
  whatsappNumero: string;
  whatsappNumero2?: string;
}

export default function CatalogoCliente({ whatsappNumero, whatsappNumero2 = "" }: Props) {
  const searchParams = useSearchParams();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoriaActiva, setCategoriaActiva] = useState(searchParams.get("categoria") ?? "");
  const [busqueda, setBusqueda] = useState(searchParams.get("q") ?? "");

  // Si el link tiene ?v=1 o ?v=2, fijar el número del vendedor (no alternar)
  const vendedorParam = searchParams.get("v");
  const numeroModal1 = vendedorParam === "2" ? (whatsappNumero2 || whatsappNumero) : whatsappNumero;
  const numeroModal2 = vendedorParam ? "" : whatsappNumero2; // sin param → alternar; con param → fijo
  const [orden, setOrden] = useState("precio_asc");
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);
  const [productoModal, setProductoModal] = useState<Producto | null>(null);
  const busquedaRef = useRef(busqueda);
  busquedaRef.current = busqueda;

  // Sincronizar estado con cambios de URL (ej: búsqueda desde el Navbar)
  useEffect(() => {
    setCategoriaActiva(searchParams.get("categoria") ?? "");
    setBusqueda(searchParams.get("q") ?? "");
  }, [searchParams]);

  const cargarCategorias = useCallback(async () => {
    try {
      const res = await fetch("/api/categorias");
      const data = await res.json();
      setCategorias(data);
    } catch {
      console.error("Error cargando categorías");
    }
  }, []);

  const cargarProductos = useCallback(
    async (paginaNum: number, acumular: boolean) => {
      if (paginaNum === 1) setCargando(true);
      else setCargandoMas(true);

      try {
        const params = new URLSearchParams({ pagina: String(paginaNum) });
        if (categoriaActiva) params.set("categoria", categoriaActiva);
        if (busquedaRef.current) params.set("q", busquedaRef.current);
        if (orden) params.set("orden", orden);

        const res = await fetch(`/api/productos?${params}`);
        const data: RespuestaAPI = await res.json();

        if (acumular) {
          setProductos((prev) => [...prev, ...data.productos]);
        } else {
          setProductos(data.productos);
        }
        setTotal(data.total);
        setTotalPaginas(data.totalPaginas);
        setPagina(paginaNum);
      } catch {
        console.error("Error cargando productos");
        if (!acumular) setProductos([]);
      } finally {
        setCargando(false);
        setCargandoMas(false);
      }
    },
    [categoriaActiva, orden]
  );

  useEffect(() => {
    cargarCategorias();
  }, [cargarCategorias]);

  // Resetear y recargar cuando cambian filtros/búsqueda
  useEffect(() => {
    const timer = setTimeout(
      () => {
        setProductos([]);
        setPagina(1);
        cargarProductos(1, false);
      },
      busqueda ? 400 : 0
    );
    return () => clearTimeout(timer);
  }, [categoriaActiva, busqueda, orden, cargarProductos]);

  const cargarMas = () => {
    if (!cargandoMas && pagina < totalPaginas) {
      cargarProductos(pagina + 1, true);
    }
  };

  const hayMas = pagina < totalPaginas;

  return (
    <div>
      {productoModal && (
        <ModalProducto
          producto={productoModal}
          whatsappNumero={numeroModal1}
          whatsappNumero2={numeroModal2}
          onCerrar={() => setProductoModal(null)}
        />
      )}
      {/* Barra de búsqueda y filtros */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Input de búsqueda */}
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar productos..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a1a2e] focus:ring-2 focus:ring-[#1a1a2e]/20 outline-none text-sm transition-all"
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Ordenar */}
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a1a2e] focus:ring-2 focus:ring-[#1a1a2e]/20 outline-none text-sm bg-white transition-all"
            >
              <option value="precio_asc">Menor precio</option>
              <option value="precio_desc">Mayor precio</option>
              <option value="nuevo">Más nuevo</option>
            </select>
          </div>

          {/* Chips de categorías */}
          {categorias.length > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setCategoriaActiva("")}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  categoriaActiva === ""
                    ? "bg-[#1a1a2e] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Todos
              </button>
              {categorias.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoriaActiva(cat === categoriaActiva ? "" : cat)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    categoriaActiva === cat
                      ? "bg-[#1a1a2e] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grid de productos */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {cargando ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-8 bg-gray-200 rounded-xl mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : productos.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🛋️</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No se encontraron productos
            </h3>
            <p className="text-gray-500 text-sm">Intentá con otra búsqueda o categoría</p>
            {(busqueda || categoriaActiva) && (
              <button
                onClick={() => { setBusqueda(""); setCategoriaActiva(""); }}
                className="mt-4 px-6 py-2 bg-[#1a1a2e] text-white rounded-full text-sm hover:bg-[#16213e] transition-colors"
              >
                Ver todos los productos
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {total} producto{total !== 1 ? "s" : ""} en total
              {productos.length < total && ` · mostrando ${productos.length}`}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {productos.map((producto) => (
                <TarjetaProducto
                  key={producto.id}
                  producto={producto}
                  whatsappNumero={whatsappNumero}
                  onVerDetalle={() => setProductoModal(producto)}
                />
              ))}
            </div>

            {/* Botón "Cargar más" */}
            {hayMas && (
              <div className="mt-10 text-center">
                <button
                  onClick={cargarMas}
                  disabled={cargandoMas}
                  className="px-8 py-3 bg-[#1a1a2e] text-white rounded-xl font-semibold hover:bg-[#16213e] disabled:opacity-50 transition-all"
                >
                  {cargandoMas ? "Cargando..." : `Ver más productos (${total - productos.length} restantes)`}
                </button>
              </div>
            )}

            {/* Skeletons al cargar más */}
            {cargandoMas && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                    <div className="aspect-[4/3] bg-gray-200" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-8 bg-gray-200 rounded-xl mt-4" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
