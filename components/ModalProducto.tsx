"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { calcularOpcionesFinanciamiento, formatearPrecio } from "@/lib/calculos";

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
}

interface Props {
  producto: Producto;
  whatsappNumero: string;
  whatsappNumero2?: string;
  onCerrar: () => void;
}

export default function ModalProducto({ producto, whatsappNumero, whatsappNumero2 = "", onCerrar }: Props) {
  // Alternancia de leads: cada apertura de modal rota entre vendedor 1 y vendedor 2
  const numeroDestino = (() => {
    if (!whatsappNumero2) return whatsappNumero;
    const contador = parseInt(localStorage.getItem("lead_counter") || "0", 10);
    localStorage.setItem("lead_counter", String(contador + 1));
    return contador % 2 === 0 ? whatsappNumero : whatsappNumero2;
  })();
  const tienePrecio = producto.precio_costo > 0;
  const opciones = tienePrecio
    ? calcularOpcionesFinanciamiento(producto.precio_costo, producto.precio_financiado)
    : [];

  const [opcionSeleccionada, setOpcionSeleccionada] = useState(0);
  const opActual = opciones[opcionSeleccionada];

  const mensajeWA = tienePrecio && opActual
    ? encodeURIComponent(
        `Hola! Estoy interesado en *${producto.nombre}*.\n\n` +
        `Opción elegida: *${opActual.modalidad}*\n` +
        `• Entrega inicial: ${formatearPrecio(opActual.entrega)}\n` +
        `• ${opActual.cuotas} cuotas de ${formatearPrecio(opActual.cuota)} por ${opActual.frecuencia}\n` +
        `• Total financiado: ${formatearPrecio(opActual.ventaFinal)}\n\n` +
        `¿Podemos coordinarlo?`
      )
    : encodeURIComponent(
        `Hola! Estoy interesado en *${producto.nombre}*. ¿Me podés dar más info y opciones de financiación?`
      );

  const urlWA = `https://wa.me/${numeroDestino}?text=${mensajeWA}`;
  const imgSrc = `/api/imagen?v=13&url=${encodeURIComponent(producto.imagen_url.split("?")[0])}`;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto" onClick={onCerrar}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="flex min-h-full items-start justify-center p-3 sm:p-5">
      <div
        className="relative bg-[#f8f7f4] rounded-2xl shadow-2xl w-full max-w-[95vw] md:max-w-3xl lg:max-w-4xl overflow-x-hidden my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          onClick={onCerrar}
          className="absolute top-3 right-3 z-20 bg-white hover:bg-gray-100 rounded-full p-2 shadow-md transition-colors"
          aria-label="Cerrar"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-col sm:flex-row">

          {/* ── COLUMNA IZQUIERDA: imagen + marca ── */}
          <div className="sm:w-[40%] bg-white rounded-t-2xl sm:rounded-l-2xl sm:rounded-tr-none flex flex-col min-w-0">

            {/* Badge disponibilidad */}
            <div className="p-4 pb-2">
              {producto.disponible ? (
                <span className="inline-flex items-center gap-1.5 bg-[#c9a84c] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                  ENTREGA INMEDIATA · Te la llevás hoy
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-gray-400 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                  Sin stock disponible
                </span>
              )}
            </div>

            {/* Imagen */}
            <div className="relative aspect-square mx-4 flex-1 overflow-hidden">
              <Image
                src={imgSrc}
                alt={producto.nombre}
                fill
                className="object-contain p-4"
                style={{ objectPosition: "50% 5%" }}
                sizes="(max-width: 768px) 100vw, 42vw"
                unoptimized
              />
              {/* Gradiente que cubre la franja inferior del proveedor */}
              <div className="absolute inset-x-0 bottom-0 h-[18%] bg-gradient-to-t from-white to-transparent pointer-events-none z-[5]" />
            </div>

            {/* Branding Outlet Hogar */}
            <div className="hidden sm:flex items-center gap-3 px-4 py-3 border-t border-gray-100">
              {/* Logo SVG inline */}
              <svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" className="w-11 h-11 flex-shrink-0">
                <defs>
                  <radialGradient id="mog" cx="42%" cy="38%" r="62%">
                    <stop offset="0%" stopColor="#edbc68"/>
                    <stop offset="50%" stopColor="#c88c2a"/>
                    <stop offset="100%" stopColor="#9e6210"/>
                  </radialGradient>
                  <clipPath id="moic"><circle cx="150" cy="150" r="125"/></clipPath>
                </defs>
                <circle cx="150" cy="150" r="149" fill="#18100a"/>
                <circle cx="150" cy="150" r="141" fill="#f0ece0"/>
                <circle cx="150" cy="150" r="133" fill="#18100a"/>
                <circle cx="150" cy="150" r="126" fill="url(#mog)"/>
                <g clipPath="url(#moic)" stroke="#18100a" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="150" y1="28" x2="150" y2="52" strokeWidth="4"/>
                  <line x1="140" y1="52" x2="160" y2="52" strokeWidth="3.5"/>
                  <line x1="140" y1="52" x2="128" y2="80" strokeWidth="3.5"/>
                  <line x1="160" y1="52" x2="172" y2="80" strokeWidth="3.5"/>
                  <line x1="126" y1="80" x2="174" y2="80" strokeWidth="4.5"/>
                  <rect x="34" y="92" width="74" height="54" rx="4" strokeWidth="3.5"/>
                  <line x1="71" y1="146" x2="71" y2="162" strokeWidth="4"/>
                  <line x1="50" y1="162" x2="92" y2="162" strokeWidth="4"/>
                  <rect x="186" y="90" width="52" height="52" rx="5" strokeWidth="3.5"/>
                  <rect x="168" y="112" width="18" height="24" rx="5" strokeWidth="3.5"/>
                  <rect x="238" y="112" width="18" height="24" rx="5" strokeWidth="3.5"/>
                  <rect x="176" y="142" width="72" height="24" rx="5" strokeWidth="3.5"/>
                </g>
                <line x1="46" y1="182" x2="254" y2="182" stroke="#18100a" strokeWidth="2" opacity="0.5"/>
                <text x="150" y="212" fontFamily="Arial, Helvetica, sans-serif" fontSize="22" fontWeight="900" textAnchor="middle" fill="#18100a">OUTLET HOGAR</text>
                <text x="150" y="231" fontFamily="Arial, Helvetica, sans-serif" fontSize="11" letterSpacing="1.5" textAnchor="middle" fill="#18100a">TODO PARA TU HOGAR</text>
              </svg>
              <div>
                <p className="font-black text-[#1a1a2e] text-sm tracking-wider leading-none">OUTLET HOGAR</p>
                <p className="text-[11px] text-[#c9a84c] font-semibold tracking-widest uppercase mt-0.5">Financiación Propia</p>
              </div>
            </div>
          </div>

          {/* ── COLUMNA DERECHA: info del producto ── */}
          <div className="sm:w-[60%] p-4 sm:p-5 flex flex-col gap-3 min-w-0">

            {/* Categoría */}
            <span className="text-[11px] font-bold text-[#c9a84c] uppercase tracking-widest">
              {producto.categoria}
            </span>

            {/* Nombre */}
            <h2 className="text-2xl font-black text-[#1a1a2e] leading-tight -mt-1">
              {producto.nombre}
            </h2>

            {/* Separador dorado */}
            <div className="w-10 h-1 bg-[#c9a84c] rounded-full -mt-1" />

            {/* Descripción / Características */}
            {producto.descripcion && (
              <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
                <p className="text-[11px] font-bold text-[#c9a84c] uppercase tracking-widest mb-2">Características</p>
                <div className="max-h-[120px] overflow-y-auto pr-1 space-y-0.5 scrollbar-thin">
                  {producto.descripcion.split("\n").filter(Boolean).map((linea, i) => (
                    <p key={i} className="text-[12px] text-gray-600 leading-snug flex gap-1.5">
                      <span className="text-[#c9a84c] flex-shrink-0 mt-0.5">•</span>
                      <span>{linea.replace(/^[•\-\*]\s*/, "")}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}

            {tienePrecio ? (
              <>
                {/* Precio contado */}
                <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm">
                  <span className="text-sm text-gray-500 font-medium">Precio contado</span>
                  <span className="text-2xl font-black text-[#1a1a2e]">
                    {formatearPrecio(producto.precio_contado)}
                  </span>
                </div>

                {/* Header financiación */}
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#c9a84c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span className="text-xs font-black text-[#1a1a2e] uppercase tracking-wider">Financiación Propia</span>
                </div>

                {/* Entrega inicial (compartida entre las 3 opciones) */}
                {opciones[0] && (
                  <div className="bg-[#1a1a2e] rounded-xl px-4 py-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1">Entrega inicial</p>
                      <p className="text-2xl font-black text-white leading-none">{formatearPrecio(opciones[0].entrega)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Total financiado</p>
                      <p className="text-sm font-bold text-[#c9a84c]">{formatearPrecio(opciones[0].ventaFinal)}</p>
                    </div>
                  </div>
                )}

                {/* Opciones de cuotas */}
                <div className="space-y-2">
                  {opciones.map((op, i) => {
                    const seleccionada = i === opcionSeleccionada;
                    return (
                      <button
                        key={op.modalidad}
                        type="button"
                        onClick={() => setOpcionSeleccionada(i)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all duration-150 text-left ${
                          seleccionada
                            ? "border-[#c9a84c] bg-[#fffbf0] shadow-sm"
                            : "border-gray-100 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                            seleccionada ? "border-[#c9a84c] bg-[#c9a84c]" : "border-gray-300"
                          }`}>
                            {seleccionada && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm text-[#1a1a2e] uppercase tracking-wide">{op.modalidad}</p>
                              {i === 0 && (
                                <span className="bg-[#c9a84c] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                                  Más elegida
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400">{op.cuotas} cuotas · por {op.frecuencia}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-black ${seleccionada ? "text-[#c9a84c]" : "text-[#1a1a2e]"}`}>
                            {formatearPrecio(op.cuota)}
                          </p>
                          <p className="text-[10px] text-gray-400">por {op.frecuencia}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-amber-700 font-semibold text-sm">Consultá por precio y financiación</p>
              </div>
            )}

            {/* Trust icons */}
            <div className="flex gap-2 justify-around py-1">
              <div className="flex flex-col items-center gap-1.5">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
                </svg>
                <p className="text-[10px] text-gray-500 text-center font-semibold">Solo con DNI</p>
              </div>
              <div className="w-px bg-gray-200" />
              <div className="flex flex-col items-center gap-1.5">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <p className="text-[10px] text-gray-500 text-center font-semibold">Sin banco</p>
              </div>
              <div className="w-px bg-gray-200" />
              <div className="flex flex-col items-center gap-1.5">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
                <p className="text-[10px] text-gray-500 text-center font-semibold">Entrega coordinada</p>
              </div>
            </div>

            {/* Botón WhatsApp */}
            <a
              href={urlWA}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl text-white transition-all duration-200 mt-auto ${
                producto.disponible
                  ? "bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] shadow-lg shadow-green-200"
                  : "bg-gray-400 cursor-not-allowed pointer-events-none"
              }`}
              onClick={(e) => !producto.disponible && e.preventDefault()}
            >
              <svg className="w-7 h-7 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <div>
                <p className="font-bold text-base leading-none">Consultá por WhatsApp</p>
                <p className="text-xs text-green-100 mt-1">Respondemos rápido</p>
              </div>
            </a>
          </div>
        </div>

        {/* ── BARRA INFERIOR: trust items ── */}
        <div className="border-t border-gray-200 grid grid-cols-4 divide-x divide-gray-200 bg-white rounded-b-2xl">
          {[
            {
              label: "GARANTÍA",
              desc: "Producto garantizado",
              icon: (
                <svg className="w-5 h-5 text-[#c9a84c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              ),
            },
            {
              label: "SIN BANCO",
              desc: "Financiación 100% propia",
              icon: (
                <svg className="w-5 h-5 text-[#c9a84c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
                </svg>
              ),
            },
            {
              label: "FLEXIBLE",
              desc: "Planes a tu medida",
              icon: (
                <svg className="w-5 h-5 text-[#c9a84c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              ),
            },
            {
              label: "CONFIANZA",
              desc: "Miles de clientes",
              icon: (
                <svg className="w-5 h-5 text-[#c9a84c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                </svg>
              ),
            },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-1 py-3 px-1 text-center">
              {item.icon}
              <span className="text-[10px] font-black text-[#1a1a2e] tracking-wide">{item.label}</span>
              <span className="text-[9px] text-gray-400 leading-tight">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
