"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { calcularOpcionesFinanciamiento, calcularEntregaInicial, calcularMargenFinanciado, formatearPrecio as fmt } from "@/lib/calculos";

// ─── Tipos ────────────────────────────────────────────────
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
}

interface Configuracion {
  id: number;
  margen_ganancia: number;
  margen_financiado: number;
  cuotas: number;
  interes_cuota: number;
  whatsapp_numero: string;
  whatsapp_numero_2: string;
}

interface LogSync {
  id: number;
  fecha: string;
  productos_nuevos: number;
  productos_actualizados: number;
  errores: string | null;
}

// ─── Helpers ──────────────────────────────────────────────
function formatearPrecio(valor: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Componente principal ─────────────────────────────────
export default function AdminPage() {
  const [autenticado, setAutenticado] = useState(false);
  const [password, setPassword] = useState("");
  const [errorAuth, setErrorAuth] = useState("");
  const [seccionActiva, setSeccionActiva] = useState<
    "config" | "productos" | "sync" | "stats" | "cotizador"
  >("config");

  // ─── Cotizador ─────────────────────────────────────────────
  const [cotBusqueda, setCotBusqueda] = useState("");
  const [cotProductoId, setCotProductoId] = useState<number | null>(null);
  const [cotNombreCustom, setCotNombreCustom] = useState("");
  const [cotCostoCustom, setCotCostoCustom] = useState("");
  const [cotMargenCustom, setCotMargenCustom] = useState("1.35");
  const [cotModo, setCotModo] = useState<"catalogo" | "custom">("catalogo");
  const [copiado, setCopiado] = useState(false);

  // Estados de datos
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [logs, setLogs] = useState<LogSync[]>([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [sincronizando, setSincronizando] = useState(false);
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");

  // Form config
  const [formConfig, setFormConfig] = useState({
    margen_ganancia: "1.35",
    margen_financiado: "1.75",
    cuotas: "12",
    interes_cuota: "0.038",
    whatsapp_numero: "5491100000000",
    whatsapp_numero_2: "",
  });

  // Precios editables por producto
  const [preciosEditados, setPreciosEditados] = useState<Record<number, string>>({});

  // Buscador de productos en admin
  const [busquedaAdmin, setBusquedaAdmin] = useState("");

  // Subida de imagen por producto
  const [subiendoImagen, setSubiendoImagen] = useState<number | null>(null);
  const [imagenesLocales, setImagenesLocales] = useState<Record<number, string>>({});

  const subirImagen = async (productoId: number, file: File) => {
    setSubiendoImagen(productoId);
    try {
      const formData = new FormData();
      formData.append("imagen", file);
      const res = await fetch(`/api/admin/imagen/${productoId}`, {
        method: "POST",
        headers: { "x-api-key": getApiKey() },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setImagenesLocales(prev => ({ ...prev, [productoId]: `${data.imagen_url}?v=${Date.now()}` }));
        mostrarExito("✅ Imagen actualizada");
      } else {
        const err = await res.json();
        mostrarExito(`❌ ${err.error || "Error al subir imagen"}`);
      }
    } catch {
      mostrarExito("❌ Error de conexión al subir imagen");
    } finally {
      setSubiendoImagen(null);
    }
  };

  // Verificar sesión al cargar
  useEffect(() => {
    const sesion = localStorage.getItem("admin_outlet_auth");
    if (sesion === "true") setAutenticado(true);
  }, []);

  const mostrarExito = (msg: string) => {
    setMensajeExito(msg);
    setTimeout(() => setMensajeExito(""), 3000);
  };

  // Login: valida la contraseña contra el endpoint de admin
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAuth("");
    try {
      const res = await fetch("/api/admin/productos?pagina=1", {
        headers: { "x-api-key": password },
      });
      if (res.status === 401) {
        setErrorAuth("Contraseña incorrecta");
      } else if (res.ok) {
        localStorage.setItem("admin_outlet_auth", "true");
        localStorage.setItem("admin_outlet_key", password);
        setAutenticado(true);
      } else {
        setErrorAuth("Error al verificar. Intentá de nuevo.");
      }
    } catch {
      setErrorAuth("Error de conexión.");
    }
  };

  const getApiKey = () => localStorage.getItem("admin_outlet_key") || "";

  const cargarConfig = useCallback(async () => {
    const res = await fetch("/api/configuracion");
    if (res.ok) {
      const data: Configuracion = await res.json();
      setConfig(data);
      setFormConfig({
        margen_ganancia:   String(data.margen_ganancia),
        margen_financiado: String(data.margen_financiado ?? 1.75),
        cuotas:            String(data.cuotas),
        interes_cuota:     String(data.interes_cuota),
        whatsapp_numero:   data.whatsapp_numero,
        whatsapp_numero_2: data.whatsapp_numero_2 ?? "",
      });
    }
  }, []);

  const cargarProductos = useCallback(async () => {
    // Cargar todas las páginas del admin (100 por página)
    const key = localStorage.getItem("admin_outlet_key") || "";
    let paginaActual = 1;
    let totalPaginas = 1;
    const todos: Producto[] = [];

    do {
      const params = new URLSearchParams({ pagina: String(paginaActual) });
      if (categoriaFiltro) params.set("categoria", categoriaFiltro);
      const res = await fetch(`/api/admin/productos?${params}`, {
        headers: { "x-api-key": key },
      });
      if (!res.ok) break;
      const data = await res.json();
      todos.push(...data.productos);
      totalPaginas = data.totalPaginas;
      paginaActual++;
    } while (paginaActual <= totalPaginas);

    setProductos(todos);
  }, [categoriaFiltro]);

  const cargarLogs = useCallback(async () => {
    const res = await fetch("/api/sync/logs");
    if (res.ok) setLogs(await res.json());
  }, []);

  useEffect(() => {
    if (autenticado) {
      cargarConfig();
      cargarProductos();
      cargarLogs();
    }
  }, [autenticado, cargarConfig, cargarProductos, cargarLogs]);

  useEffect(() => {
    if (autenticado) cargarProductos();
  }, [categoriaFiltro, autenticado, cargarProductos]);

  // Guardar configuración
  const guardarConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoConfig(true);
    try {
      const res = await fetch("/api/configuracion", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": getApiKey(),
        },
        body: JSON.stringify({
          margen_ganancia:   parseFloat(formConfig.margen_ganancia),
          margen_financiado: parseFloat(formConfig.margen_financiado),
          cuotas:            parseInt(formConfig.cuotas),
          interes_cuota:     parseFloat(formConfig.interes_cuota),
          whatsapp_numero:   formConfig.whatsapp_numero,
          whatsapp_numero_2: formConfig.whatsapp_numero_2,
        }),
      });
      if (res.ok) {
        await cargarConfig();
        mostrarExito("✅ Configuración guardada correctamente");
      }
    } finally {
      setGuardandoConfig(false);
    }
  };

  // Actualizar disponibilidad
  const toggleDisponibilidad = async (producto: Producto) => {
    const res = await fetch(`/api/productos/${producto.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": getApiKey(),
      },
      body: JSON.stringify({ disponible: !producto.disponible }),
    });
    if (res.ok) {
      setProductos((prev) =>
        prev.map((p) =>
          p.id === producto.id ? { ...p, disponible: !p.disponible } : p
        )
      );
    }
  };

  // Guardar precio de un producto
  const guardarPrecio = async (id: number) => {
    const nuevoPrecio = parseFloat(preciosEditados[id] || "0");
    if (isNaN(nuevoPrecio)) return;

    const res = await fetch(`/api/productos/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": getApiKey(),
      },
      body: JSON.stringify({ precio_costo: nuevoPrecio }),
    });

    if (res.ok) {
      await cargarProductos();
      setPreciosEditados((prev) => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
      mostrarExito("✅ Precio actualizado");
    }
  };

  // Sincronizar
  const sincronizar = async () => {
    setSincronizando(true);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "x-api-key": getApiKey() },
      });
      if (res.ok) {
        mostrarExito("🔄 Sincronización iniciada en background...");
        setTimeout(() => {
          cargarLogs();
          cargarProductos();
        }, 5000);
      }
    } finally {
      setSincronizando(false);
    }
  };

  const cerrarSesion = () => {
    localStorage.removeItem("admin_outlet_auth");
    localStorage.removeItem("admin_outlet_key");
    setAutenticado(false);
  };

  // ─── Cotizador: datos del producto seleccionado ─────────────
  const productoCot = useMemo(() => {
    if (cotModo === "catalogo" && cotProductoId !== null)
      return productos.find(p => p.id === cotProductoId) ?? null;
    if (cotModo === "custom") {
      const costo = parseFloat(cotCostoCustom);
      const margen = parseFloat(cotMargenCustom);
      if (!isNaN(costo) && costo > 0 && !isNaN(margen) && margen > 0) {
        return {
          id: -1,
          nombre: cotNombreCustom || "Producto personalizado",
          precio_costo: costo,
          precio_contado: Math.round(costo * margen),
          precio_financiado: Math.round(costo * calcularMargenFinanciado(costo)),
          categoria: "",
          disponible: true,
          imagen_url: "",
          precio_cuota: 0,
          cuotas: 0,
          url_origen: "",
        };
      }
    }
    return null;
  }, [cotModo, cotProductoId, cotCostoCustom, cotMargenCustom, cotNombreCustom, productos]);

  const opcionesCot = useMemo(() =>
    productoCot ? calcularOpcionesFinanciamiento(productoCot.precio_costo, productoCot.precio_financiado) : [],
    [productoCot]
  );

  const productosFiltradosCot = useMemo(() =>
    cotBusqueda.length < 2 ? [] : productos.filter(p =>
      p.nombre.toLowerCase().includes(cotBusqueda.toLowerCase()) && p.precio_costo > 0
    ).slice(0, 8),
    [cotBusqueda, productos]
  );

  const generarMensajeWA = () => {
    if (!productoCot || opcionesCot.length === 0) return "";
    const lineas = [
      `🏠 *OUTLET HOGAR — Propuesta de financiación*`,
      ``,
      `*${productoCot.nombre}*`,
      `💰 Precio contado: ${fmt(productoCot.precio_contado)}`,
      ``,
      `📦 Entrega inicial: *${fmt(calcularEntregaInicial(productoCot.precio_costo))}*`,
      ``,
      ...opcionesCot.map(op =>
        `📅 *${op.modalidad}* (${op.cuotas} cuotas)\n   ${fmt(op.cuota)} por ${op.frecuencia}`
      ),
      ``,
      `✅ Sin interés · Envíos a todo el país`,
      `¡Consultá sin compromiso! 💬`,
    ];
    return lineas.join("\n");
  };

  const copiarMensaje = async () => {
    const msg = generarMensajeWA();
    if (!msg) return;
    await navigator.clipboard.writeText(msg);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  // Estadísticas
  const stats = {
    total: productos.length,
    activos: productos.filter((p) => p.disponible).length,
    sinPrecio: productos.filter((p) => p.precio_costo === 0).length,
    porCategoria: productos.reduce(
      (acc, p) => {
        acc[p.categoria] = (acc[p.categoria] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
  };

  const categorias = [...new Set(productos.map((p) => p.categoria))].sort();

  // ─── Login ────────────────────────────────────────────────
  if (!autenticado) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="font-serif text-3xl font-bold text-[#1a1a2e]">
              Outlet Hogar
            </h1>
            <p className="text-gray-500 text-sm mt-1">Panel Administrador</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a1a2e] focus:ring-2 focus:ring-[#1a1a2e]/20 outline-none text-sm"
                required
              />
            </div>

            {errorAuth && (
              <p className="text-red-500 text-sm">{errorAuth}</p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-[#1a1a2e] text-white rounded-xl font-semibold hover:bg-[#16213e] transition-colors"
            >
              Ingresar
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Panel ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar admin */}
      <nav className="bg-[#1a1a2e] text-white px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-serif text-xl font-bold">Outlet Hogar</span>
            <span className="text-xs bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full">
              Admin
            </span>
          </div>
          <button
            onClick={cerrarSesion}
            className="text-sm text-white bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-lg transition-colors border border-white/20"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>

      {/* Toast de éxito */}
      {mensajeExito && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg text-sm font-medium animate-pulse">
          {mensajeExito}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm mb-6 overflow-x-auto">
          {(
            [
              { id: "config", label: "Configuración" },
              { id: "productos", label: `Productos (${productos.length})` },
              { id: "cotizador", label: "💰 Cotizador" },
              { id: "sync", label: "Sincronización" },
              { id: "stats", label: "Estadísticas" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSeccionActiva(tab.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                seccionActiva === tab.id
                  ? "bg-[#1a1a2e] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════════ SECCIÓN: CONFIGURACIÓN ═══════════ */}
        {seccionActiva === "config" && (
          <div className="bg-white rounded-2xl shadow-sm p-6 max-w-xl">
            <h2 className="text-lg font-semibold text-gray-800 mb-5">
              Configuración de Precios
            </h2>

            <form onSubmit={guardarConfig} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Margen de ganancia
                  <span className="text-gray-400 font-normal ml-1">
                    (ej: 1.35 = 35% de ganancia)
                  </span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={formConfig.margen_ganancia}
                  onChange={(e) =>
                    setFormConfig((f) => ({
                      ...f,
                      margen_ganancia: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a1a2e] focus:ring-2 focus:ring-[#1a1a2e]/20 outline-none text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Margen financiado
                  <span className="text-gray-400 font-normal ml-1">
                    (ej: 1.75 = 75% de ganancia — para cuotas)
                  </span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={formConfig.margen_financiado}
                  onChange={(e) =>
                    setFormConfig((f) => ({ ...f, margen_financiado: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a1a2e] focus:ring-2 focus:ring-[#1a1a2e]/20 outline-none text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Número de cuotas
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={formConfig.cuotas}
                  onChange={(e) =>
                    setFormConfig((f) => ({ ...f, cuotas: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a1a2e] focus:ring-2 focus:ring-[#1a1a2e]/20 outline-none text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Interés por cuota
                  <span className="text-gray-400 font-normal ml-1">
                    (ej: 0.038 = 3.8%)
                  </span>
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={formConfig.interes_cuota}
                  onChange={(e) =>
                    setFormConfig((f) => ({
                      ...f,
                      interes_cuota: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a1a2e] focus:ring-2 focus:ring-[#1a1a2e]/20 outline-none text-sm"
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 block">
                  Números de WhatsApp
                  <span className="text-gray-400 font-normal ml-1">(con código de país, sin +)</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white bg-[#1a1a2e] rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">1</span>
                  <input
                    type="text"
                    value={formConfig.whatsapp_numero}
                    onChange={(e) => setFormConfig((f) => ({ ...f, whatsapp_numero: e.target.value }))}
                    placeholder="5491100000000"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a1a2e] focus:ring-2 focus:ring-[#1a1a2e]/20 outline-none text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white bg-[#c9a84c] rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">2</span>
                  <input
                    type="text"
                    value={formConfig.whatsapp_numero_2}
                    onChange={(e) => setFormConfig((f) => ({ ...f, whatsapp_numero_2: e.target.value }))}
                    placeholder="5491100000000 (opcional)"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a1a2e] focus:ring-2 focus:ring-[#1a1a2e]/20 outline-none text-sm"
                  />
                </div>
                <p className="text-xs text-gray-400">Si cargás 2 números, los leads se reparten alternadamente entre los vendedores.</p>
              </div>

              {config && (
                <div className="bg-blue-50 rounded-xl p-4 text-sm">
                  <p className="font-medium text-blue-800 mb-2">
                    Vista previa de precios
                  </p>
                  <p className="text-blue-700">
                    Costo $100.000 → Contado:{" "}
                    <strong>
                      {formatearPrecio(
                        100000 * parseFloat(formConfig.margen_ganancia || "1")
                      )}
                    </strong>
                    {" · "}
                    {formConfig.cuotas} cuotas:{" "}
                    <strong>
                      {formatearPrecio(
                        (100000 *
                          parseFloat(formConfig.margen_ganancia || "1") *
                          (1 +
                            parseFloat(formConfig.interes_cuota || "0") *
                              parseInt(formConfig.cuotas || "1"))) /
                          parseInt(formConfig.cuotas || "1")
                      )}
                    </strong>
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={guardandoConfig}
                className="w-full py-2.5 bg-[#1a1a2e] text-white rounded-xl font-semibold hover:bg-[#16213e] disabled:opacity-50 transition-colors"
              >
                {guardandoConfig ? "Guardando..." : "Guardar configuración"}
              </button>
            </form>
          </div>
        )}

        {/* ═══════════ SECCIÓN: PRODUCTOS ═══════════ */}
        {seccionActiva === "productos" && (
          <div>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <h2 className="text-lg font-semibold text-gray-800 sm:mr-auto">
                Lista de Productos
              </h2>
              {/* Buscador */}
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z"/>
                </svg>
                <input
                  type="text"
                  value={busquedaAdmin}
                  onChange={(e) => setBusquedaAdmin(e.target.value)}
                  placeholder="Buscar producto..."
                  className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-[#1a1a2e] w-56"
                />
                {busquedaAdmin && (
                  <button onClick={() => setBusquedaAdmin("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
                )}
              </div>
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-[#1a1a2e]"
              >
                <option value="">Todas las categorías</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">
                        Producto
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">
                        Categoría
                      </th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">
                        Precio Costo
                      </th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">
                        Precio Contado
                      </th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">
                        Disponible
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {productos.filter(p =>
                      !busquedaAdmin || p.nombre.toLowerCase().includes(busquedaAdmin.toLowerCase())
                    ).map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        {/* Imagen + nombre */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative flex-shrink-0 group">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={
                                  imagenesLocales[p.id]
                                    ? imagenesLocales[p.id]
                                    : p.imagen_url
                                    ? `/api/imagen?v=12&url=${encodeURIComponent(p.imagen_url.split("?")[0])}`
                                    : "/logo-marca.svg"
                                }
                                alt={p.nombre}
                                className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                              />
                              {/* Botón subir imagen */}
                              <label
                                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                                title="Cambiar imagen"
                              >
                                {subiendoImagen === p.id ? (
                                  <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                                  </svg>
                                )}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  disabled={subiendoImagen !== null}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) subirImagen(p.id, file);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            </div>
                            <div>
                              <p className="font-medium text-gray-800 line-clamp-1 max-w-[200px]">
                                {p.nombre}
                              </p>
                              <a
                                href={p.url_origen}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-500 hover:underline"
                              >
                                Ver en Viena
                              </a>
                            </div>
                          </div>
                        </td>

                        {/* Categoría */}
                        <td className="px-4 py-3">
                          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                            {p.categoria}
                          </span>
                        </td>

                        {/* Precio costo editable */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <input
                              type="number"
                              value={
                                preciosEditados[p.id] !== undefined
                                  ? preciosEditados[p.id]
                                  : p.precio_costo
                              }
                              onChange={(e) =>
                                setPreciosEditados((prev) => ({
                                  ...prev,
                                  [p.id]: e.target.value,
                                }))
                              }
                              className="w-28 text-right px-2 py-1 rounded-lg border border-gray-200 focus:border-[#1a1a2e] outline-none text-sm"
                            />
                            {preciosEditados[p.id] !== undefined && (
                              <button
                                onClick={() => guardarPrecio(p.id)}
                                className="text-green-600 hover:text-green-700 font-bold text-lg"
                                title="Guardar precio"
                              >
                                ✓
                              </button>
                            )}
                          </div>
                          {p.precio_costo === 0 && (
                            <p className="text-xs text-amber-500 text-right mt-0.5">
                              Sin precio
                            </p>
                          )}
                        </td>

                        {/* Precio contado */}
                        <td className="px-4 py-3 text-right font-medium text-gray-700">
                          {p.precio_costo > 0
                            ? formatearPrecio(p.precio_contado)
                            : "—"}
                        </td>

                        {/* Toggle disponible */}
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleDisponibilidad(p)}
                            className={`w-11 h-6 rounded-full transition-colors relative ${
                              p.disponible ? "bg-green-500" : "bg-gray-300"
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                p.disponible
                                  ? "translate-x-5"
                                  : "translate-x-0.5"
                              }`}
                            />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {productos.filter(p => !busquedaAdmin || p.nombre.toLowerCase().includes(busquedaAdmin.toLowerCase())).length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    {busquedaAdmin ? `Sin resultados para "${busquedaAdmin}"` : "No hay productos. Sincronizá el catálogo primero."}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ SECCIÓN: COTIZADOR ═══════════ */}
        {seccionActiva === "cotizador" && (
          <div className="space-y-6 max-w-2xl">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Generador de Propuestas</h2>

              {/* Modo */}
              <div className="flex gap-2 mb-5">
                <button
                  onClick={() => setCotModo("catalogo")}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${cotModo === "catalogo" ? "bg-[#1a1a2e] text-white border-[#1a1a2e]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}
                >
                  Buscar en catálogo
                </button>
                <button
                  onClick={() => setCotModo("custom")}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${cotModo === "custom" ? "bg-[#1a1a2e] text-white border-[#1a1a2e]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}
                >
                  Ingresar manualmente
                </button>
              </div>

              {/* Búsqueda en catálogo */}
              {cotModo === "catalogo" && (
                <div className="relative">
                  <input
                    type="text"
                    value={cotBusqueda}
                    onChange={e => { setCotBusqueda(e.target.value); setCotProductoId(null); }}
                    placeholder="Buscá un producto del catálogo..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a1a2e] focus:ring-2 focus:ring-[#1a1a2e]/20 outline-none text-sm"
                  />
                  {productosFiltradosCot.length > 0 && !cotProductoId && (
                    <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                      {productosFiltradosCot.map(p => (
                        <button
                          key={p.id}
                          onClick={() => { setCotProductoId(p.id); setCotBusqueda(p.nombre); }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0"
                        >
                          <span className="font-medium text-gray-800 line-clamp-1">{p.nombre}</span>
                          <span className="text-xs text-gray-400 ml-2">{fmt(p.precio_contado)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Ingreso manual */}
              {cotModo === "custom" && (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={cotNombreCustom}
                    onChange={e => setCotNombreCustom(e.target.value)}
                    placeholder="Nombre del producto"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a1a2e] outline-none text-sm"
                  />
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 block mb-1">Costo ($)</label>
                      <input
                        type="number"
                        value={cotCostoCustom}
                        onChange={e => setCotCostoCustom(e.target.value)}
                        placeholder="100000"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a1a2e] outline-none text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 block mb-1">Margen (ej: 1.35)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={cotMargenCustom}
                        onChange={e => setCotMargenCustom(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a1a2e] outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Resultado del cotizador */}
            {productoCot && opcionesCot.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
                <div>
                  <h3 className="font-bold text-gray-900 text-base leading-snug">{productoCot.nombre}</h3>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-gray-50 rounded-xl p-3 text-sm">
                      <p className="text-xs text-gray-400 mb-1">Precio contado</p>
                      <p className="font-bold text-gray-800">{fmt(productoCot.precio_contado)}</p>
                      <p className="text-xs text-green-600 font-medium mt-0.5">
                        Ganancia: {fmt(productoCot.precio_contado - productoCot.precio_costo)}
                        {" "}({Math.round((productoCot.precio_contado / productoCot.precio_costo - 1) * 100)}%)
                      </p>
                    </div>
                    <div className="bg-[#1a1a2e]/5 border border-[#1a1a2e]/15 rounded-xl p-3 text-sm">
                      <p className="text-xs text-gray-400 mb-1">Precio financiado</p>
                      <p className="font-bold text-[#1a1a2e]">{fmt(productoCot.precio_financiado)}</p>
                      <p className="text-xs text-green-700 font-bold mt-0.5">
                        Ganancia: {fmt(productoCot.precio_financiado - productoCot.precio_costo)}
                        {" "}({Math.round((productoCot.precio_financiado / productoCot.precio_costo - 1) * 100)}%)
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Costo: {fmt(productoCot.precio_costo)}</p>
                </div>

                {/* Cards de opciones */}
                <div className="grid grid-cols-3 gap-3">
                  {opcionesCot.map(op => (
                    <div key={op.modalidad} className="border border-[#1a1a2e]/20 rounded-xl p-4 text-center space-y-2">
                      <p className="text-xs font-bold text-[#1a1a2e] uppercase tracking-wide">{op.modalidad}</p>
                      <div>
                        <p className="text-xs text-gray-400">Entrega</p>
                        <p className="font-bold text-gray-800">{fmt(op.entrega)}</p>
                      </div>
                      <div className="bg-[#1a1a2e] rounded-lg py-2">
                        <p className="text-xs text-gray-300">{op.cuotas}x por {op.frecuencia}</p>
                        <p className="text-white font-bold text-lg">{fmt(op.cuota)}</p>
                      </div>
                      <p className="text-xs text-gray-400">Saldo: {fmt(op.saldoFinanciado)}</p>
                    </div>
                  ))}
                </div>

                {/* Preview del mensaje */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Mensaje para WhatsApp</p>
                  <pre className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {generarMensajeWA()}
                  </pre>
                </div>

                {/* Botón copiar */}
                <button
                  onClick={copiarMensaje}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                    copiado
                      ? "bg-green-600 text-white"
                      : "bg-[#25D366] hover:bg-[#20ba59] text-white"
                  }`}
                >
                  {copiado ? "✓ ¡Copiado!" : "Copiar mensaje para WhatsApp"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ SECCIÓN: SINCRONIZACIÓN ═══════════ */}
        {seccionActiva === "sync" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Sincronización con Viena Muebles
              </h2>

              {logs.length > 0 && (
                <p className="text-sm text-gray-500 mb-4">
                  Última sincronización:{" "}
                  <strong>{formatearFecha(logs[0].fecha)}</strong>
                </p>
              )}

              <button
                onClick={sincronizar}
                disabled={sincronizando}
                className="flex items-center gap-2 px-6 py-3 bg-[#1a1a2e] text-white rounded-xl font-semibold hover:bg-[#16213e] disabled:opacity-50 transition-all"
              >
                <svg
                  className={`w-5 h-5 ${sincronizando ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {sincronizando ? "Iniciando..." : "Sincronizar ahora"}
              </button>

              {sincronizando && (
                <p className="text-sm text-gray-500 mt-3">
                  El scraper corre en background. Los resultados aparecerán en
                  los logs en unos minutos.
                </p>
              )}
            </div>

            {/* Tabla de logs */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">
                  Últimas 10 sincronizaciones
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">
                        Fecha
                      </th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">
                        Nuevos
                      </th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">
                        Actualizados
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">
                        Errores
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">
                          {formatearFecha(log.fecha)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                            +{log.productos_nuevos}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                            {log.productos_actualizados}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {log.errores ? (
                            <span
                              className="text-red-500 text-xs cursor-help"
                              title={log.errores}
                            >
                              {log.errores.split("\n").length} error(es)
                            </span>
                          ) : (
                            <span className="text-green-500 text-xs">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {logs.length === 0 && (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    No hay logs aún. Sincronizá para ver el historial.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ SECCIÓN: ESTADÍSTICAS ═══════════ */}
        {seccionActiva === "stats" && (
          <div className="space-y-6">
            {/* Cards de resumen */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  label: "Total productos",
                  valor: stats.total,
                  color: "bg-blue-50 text-blue-700",
                },
                {
                  label: "Activos",
                  valor: stats.activos,
                  color: "bg-green-50 text-green-700",
                },
                {
                  label: "Sin stock",
                  valor: stats.total - stats.activos,
                  color: "bg-gray-50 text-gray-600",
                },
                {
                  label: "Sin precio",
                  valor: stats.sinPrecio,
                  color: "bg-amber-50 text-amber-700",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={`${stat.color} rounded-2xl p-5 text-center`}
                >
                  <div className="text-3xl font-bold">{stat.valor}</div>
                  <div className="text-sm mt-1 opacity-80">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Por categoría */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-4">
                Productos por categoría
              </h3>
              <div className="space-y-3">
                {Object.entries(stats.porCategoria)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, cantidad]) => (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-40 truncate">
                        {cat}
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-[#1a1a2e] h-2 rounded-full"
                          style={{
                            width: `${(cantidad / stats.total) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700 w-8 text-right">
                        {cantidad}
                      </span>
                    </div>
                  ))}
                {Object.keys(stats.porCategoria).length === 0 && (
                  <p className="text-gray-400 text-sm">
                    Sin datos. Sincronizá el catálogo.
                  </p>
                )}
              </div>
            </div>

            {/* Productos sin precio */}
            {stats.sinPrecio > 0 && (
              <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
                <h3 className="font-semibold text-amber-800 mb-2">
                  ⚠️ {stats.sinPrecio} producto
                  {stats.sinPrecio !== 1 ? "s" : ""} sin precio cargado
                </h3>
                <p className="text-sm text-amber-700">
                  Estos productos aparecen como &quot;Consultá por precio&quot; en el
                  catálogo. Cargá el precio manualmente desde la sección
                  Productos.
                </p>
                <button
                  onClick={() => setSeccionActiva("productos")}
                  className="mt-3 text-sm font-medium text-amber-800 underline hover:text-amber-600"
                >
                  Ir a Productos →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
