import { Configuracion } from "@prisma/client";

// Calcula el precio de contado aplicando margen de ganancia
export function calcularPrecioContado(
  precio_costo: number,
  config: Configuracion
): number {
  return precio_costo * config.margen_ganancia;
}

// Calcula el valor de cada cuota con interés compuesto
export function calcularPrecioCuota(
  precio_costo: number,
  config: Configuracion
): number {
  const precioContado = calcularPrecioContado(precio_costo, config);
  return (precioContado * (1 + config.interes_cuota * config.cuotas)) / config.cuotas;
}

// Formatea un número como moneda argentina
export function formatearPrecio(valor: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
}

// ─── Sistema de financiamiento propio ────────────────────────

export interface OpcionFinanciamiento {
  modalidad: "Semanal" | "Quincenal" | "Mensual";
  cuotas: 12 | 6 | 3;
  frecuencia: "semana" | "quincena" | "mes";
  entrega: number;
  cuota: number;
  ventaFinal: number;
  saldoFinanciado: number;
  ganancia: number;
}

// Entrega inicial por tramo de precio (basado en modelo real del negocio)
export function calcularEntregaInicial(costo: number): number {
  if (costo < 300_000) return Math.round(costo * 0.50);  // 50% — gama baja
  if (costo < 600_000) return Math.round(costo * 0.48);  // 48% — gama media
  return Math.round(costo * 0.60);                        // 60% — gama alta
}

// Margen de ganancia financiada por tramo (escala real del negocio)
export function calcularMargenFinanciado(costo: number): number {
  if (costo < 250_000) return 1.90;   // 90% — productos baratos
  if (costo < 600_000) return 1.75;   // 75%  — gama media
  return 1.62;                         // 62%  — gama alta
}

// Precio financiado total (usa escala automática por tramo)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function calcularPrecioFinanciado(precio_costo: number, _config: Configuracion): number {
  return Math.round(precio_costo * calcularMargenFinanciado(precio_costo));
}

// Genera las 3 opciones de financiamiento para un producto
export function calcularOpcionesFinanciamiento(
  costo: number,
  ventaFinanciada: number
): OpcionFinanciamiento[] {
  const entrega = calcularEntregaInicial(costo);
  const saldo = Math.max(0, ventaFinanciada - entrega);
  const ganancia = ventaFinanciada - costo;
  return [
    { modalidad: "Semanal",   cuotas: 12, frecuencia: "semana",   entrega, cuota: Math.round(saldo / 12), ventaFinal: ventaFinanciada, saldoFinanciado: saldo, ganancia },
    { modalidad: "Quincenal", cuotas: 6,  frecuencia: "quincena", entrega, cuota: Math.round(saldo / 6),  ventaFinal: ventaFinanciada, saldoFinanciado: saldo, ganancia },
    { modalidad: "Mensual",   cuotas: 3,  frecuencia: "mes",      entrega, cuota: Math.round(saldo / 3),  ventaFinal: ventaFinanciada, saldoFinanciado: saldo, ganancia },
  ];
}
