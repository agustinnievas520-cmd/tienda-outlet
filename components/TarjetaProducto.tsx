"use client";

import { useState } from "react";
import Image from "next/image";

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
  entrega_inicial?: number;
}

interface Props {
  producto: Producto;
  whatsappNumero: string;
  onVerDetalle: () => void;
}

function formatearPrecio(valor: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
}

export default function TarjetaProducto({ producto, whatsappNumero, onVerDetalle }: Props) {
  const [imgError, setImgError] = useState(false);
  const mensajeWA = encodeURIComponent(
    `Hola! Estoy interesado en ${producto.nombre}. ¿Me podés dar más info y opciones de financiación?`
  );
  const urlWA = `https://wa.me/${whatsappNumero}?text=${mensajeWA}`;

  const tienePrecio = producto.precio_costo > 0;
  const imgSrc = producto.imagen_url.startsWith("/")
    ? `${producto.imagen_url}?v=3`
    : `/api/imagen?v=10&url=${encodeURIComponent(producto.imagen_url)}`;

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col group">
      {/* Imagen */}
      <div
        className="relative aspect-[4/3] bg-gray-100 overflow-hidden cursor-pointer"
        onClick={onVerDetalle}
        title="Ver detalle"
      >
        {producto.imagen_url && !imgError ? (
          <>
            <Image
              src={imgSrc}
              alt={producto.nombre}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              style={{ objectPosition: "50% 5%" }}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              unoptimized
              onError={() => setImgError(true)}
            />
            {/* Gradiente que cubre la franja inferior del proveedor */}
            <div className="absolute inset-x-0 bottom-0 h-[22%] bg-gradient-to-t from-gray-100 to-transparent pointer-events-none z-[5]" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg
              className="w-16 h-16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Overlay de sin stock */}
        {!producto.disponible && (
          <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center">
            <span className="bg-gray-700 text-white text-sm font-semibold px-4 py-2 rounded-full">
              Sin stock
            </span>
          </div>
        )}

        {/* Badge de categoría */}
        <div className="absolute top-2 left-2">
          <span className="bg-[#1a1a2e]/80 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
            {producto.categoria}
          </span>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4 flex flex-col flex-1">
        <h3
          className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2 mb-3 flex-1 cursor-pointer hover:text-[#1a1a2e] transition-colors"
          onClick={onVerDetalle}
        >
          {producto.nombre}
        </h3>

        {tienePrecio ? (
          <div className="space-y-1 mb-4">
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-gray-500">Contado</span>
              <span className="text-xl font-bold text-[#1a1a2e]">
                {formatearPrecio(producto.precio_contado)}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium text-green-700">
                {producto.cuotas}x {formatearPrecio(producto.precio_cuota)}
              </span>
              <span className="text-xs text-gray-400 ml-1">s/ interés</span>
            </div>
            {producto.entrega_inicial != null && producto.entrega_inicial > 0 && (
              <div className="text-xs font-bold text-[#c9a84c] mt-0.5">
                Entrega: {formatearPrecio(producto.entrega_inicial)}
              </div>
            )}
          </div>
        ) : (
          <div className="mb-4">
            <span className="text-sm text-amber-600 font-medium">
              Consultá por precio
            </span>
          </div>
        )}

        {/* Botón WhatsApp */}
        <a
          href={urlWA}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 ${
            producto.disponible
              ? "bg-[#25D366] hover:bg-[#20ba59] active:scale-95"
              : "bg-gray-400 cursor-not-allowed pointer-events-none"
          }`}
          onClick={(e) => !producto.disponible && e.preventDefault()}
        >
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Consultar por WhatsApp
        </a>
      </div>
    </div>
  );
}
