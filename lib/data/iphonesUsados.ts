// iPhone usados (lista del proveedor). Solo datos públicos: los costos y las
// ganancias NO se guardan acá, porque esto llega al navegador de los clientes.
//
// Para actualizar con una lista nueva: cambiar los datos, poner disponible:false
// a los que ya no están y cambiar ACTUALIZADO con la fecha de la lista.

export const ACTUALIZADO = "2026-11-20";
export const GARANTIA_DIAS = 90;

export interface IphoneUsado {
  id: string;
  modelo: "iPhone 13" | "iPhone 14" | "iPhone 15" | "iPhone 16" | "iPhone 16 Pro" | "iPhone 16 Pro Max";
  capacidad: string;
  color: string;
  bateria: number;
  conCaja: boolean;
  foto: string; // imagen ilustrativa del modelo y color
  entrega: number;
  total: number; // precio total financiado
  semanal: number; // 16 cuotas
  quincenal: number; // 8 cuotas
  mensual: number; // 4 cuotas
  disponible: boolean;
}

export const ORDEN_MODELOS: IphoneUsado["modelo"][] = [
  "iPhone 16 Pro Max",
  "iPhone 16 Pro",
  "iPhone 16",
  "iPhone 15",
  "iPhone 14",
  "iPhone 13",
];

export const IPHONES_USADOS: IphoneUsado[] = [
  { id: "13-128-blanco-79", modelo: "iPhone 13", capacidad: "128 GB", color: "Blanco", bateria: 79, conCaja: true, foto: "/iphones/13-blanco.webp", entrega: 280000, total: 981200, semanal: 43825, quincenal: 87650, mensual: 175300, disponible: true },
  { id: "13-128-azul-87", modelo: "iPhone 13", capacidad: "128 GB", color: "Azul", bateria: 87, conCaja: false, foto: "/iphones/13-azul.webp", entrega: 280000, total: 1006100, semanal: 45382, quincenal: 90763, mensual: 181525, disponible: true },
  { id: "13-128-blanco-87", modelo: "iPhone 13", capacidad: "128 GB", color: "Blanco", bateria: 87, conCaja: true, foto: "/iphones/13-blanco.webp", entrega: 280000, total: 1014400, semanal: 45900, quincenal: 91800, mensual: 183600, disponible: true },
  { id: "13-128-blanco-100", modelo: "iPhone 13", capacidad: "128 GB", color: "Blanco", bateria: 100, conCaja: true, foto: "/iphones/13-blanco.webp", entrega: 280000, total: 1031000, semanal: 46938, quincenal: 93875, mensual: 187750, disponible: true },
  { id: "14-128-blanco-80", modelo: "iPhone 14", capacidad: "128 GB", color: "Blanco", bateria: 80, conCaja: false, foto: "/iphones/14-blanco.webp", entrega: 280000, total: 1031000, semanal: 46938, quincenal: 93875, mensual: 187750, disponible: true },
  { id: "15-128-rosa-85", modelo: "iPhone 15", capacidad: "128 GB", color: "Rosa", bateria: 85, conCaja: false, foto: "/iphones/15-rosa.webp", entrega: 380000, total: 1288500, semanal: 56782, quincenal: 113563, mensual: 227125, disponible: true },
  { id: "16-128-rosa-89", modelo: "iPhone 16", capacidad: "128 GB", color: "Rosa", bateria: 89, conCaja: false, foto: "/iphones/16-rosa.webp", entrega: 750000, total: 1695600, semanal: 59100, quincenal: 118200, mensual: 236400, disponible: true },
  { id: "16-128-blanco-89", modelo: "iPhone 16", capacidad: "128 GB", color: "Blanco", bateria: 89, conCaja: true, foto: "/iphones/16-blanco.webp", entrega: 750000, total: 1695600, semanal: 59100, quincenal: 118200, mensual: 236400, disponible: true },
  { id: "16pro-128-negro-89a", modelo: "iPhone 16 Pro", capacidad: "128 GB", color: "Negro", bateria: 89, conCaja: true, foto: "/iphones/16pro-negro.webp", entrega: 800000, total: 1986900, semanal: 74182, quincenal: 148363, mensual: 296725, disponible: true },
  { id: "16pro-128-natural-88", modelo: "iPhone 16 Pro", capacidad: "128 GB", color: "Natural", bateria: 88, conCaja: true, foto: "/iphones/16pro-natural.webp", entrega: 800000, total: 2045000, semanal: 77813, quincenal: 155625, mensual: 311250, disponible: true },
  { id: "16pro-128-negro-89b", modelo: "iPhone 16 Pro", capacidad: "128 GB", color: "Negro", bateria: 89, conCaja: true, foto: "/iphones/16pro-negro.webp", entrega: 900000, total: 1845000, semanal: 59063, quincenal: 118125, mensual: 236250, disponible: true },
  { id: "16pro-256-blanco-89", modelo: "iPhone 16 Pro", capacidad: "256 GB", color: "Blanco", bateria: 89, conCaja: true, foto: "/iphones/16pro-blanco.webp", entrega: 900000, total: 1911400, semanal: 63213, quincenal: 126425, mensual: 252850, disponible: true },
  { id: "16promax-256-blanco-90", modelo: "iPhone 16 Pro Max", capacidad: "256 GB", color: "Blanco", bateria: 90, conCaja: true, foto: "/iphones/16promax-blanco.webp", entrega: 900000, total: 2044200, semanal: 71513, quincenal: 143025, mensual: 286050, disponible: true },
];
