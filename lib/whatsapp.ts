import { prisma } from "@/lib/prisma";

// Códigos válidos en el link del vendedor: ?v=1, ?v=2 (los dos números
// históricos de la Configuración) o ?v=<codigo> de un vendedor cargado
// en la sección "Vendedores" del admin (letras, números y guiones).
const CODIGO_VALIDO = /^[a-z0-9-]{1,40}$/;

export function esCodigoVendedor(v: string | null | undefined): v is string {
  return !!v && CODIGO_VALIDO.test(v);
}

// Convierte un nombre ("Juan Pérez") en un código para el link ("juan-perez").
export function generarCodigo(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// Deja solo los dígitos y lo pasa al formato que pide WhatsApp para
// celulares de Argentina (549 + característica + número). Acepta como lo
// escribe la gente: "3401 642045", "03401-15642045", "+54 9 3401 642045".
export function limpiarNumero(numero: string): string {
  let n = numero.replace(/\D/g, "");
  if (n.startsWith("549")) return n;
  if (n.startsWith("54")) n = n.slice(2);
  if (n.startsWith("0")) n = n.slice(1);
  // "15" después de la característica (ej: 3401 15 642045) → se saca
  const con15 = n.match(/^(\d{2,4})15(\d{6,8})$/);
  if (con15 && con15[1].length + con15[2].length === 10) n = con15[1] + con15[2];
  return n.length === 10 ? `549${n}` : numero.replace(/\D/g, "");
}

// El ?v= de la URL actual manda; si no hay, se usa la cookie que el
// middleware dejó guardada la primera vez que el visitante entró con
// un link de vendedor (así el pin se mantiene en toda la visita).
export function vendedorActivo(
  queryV: string | undefined,
  cookieV: string | undefined
): string | undefined {
  if (esCodigoVendedor(queryV)) return queryV;
  if (esCodigoVendedor(cookieV)) return cookieV;
  return undefined;
}

export interface WhatsappResuelto {
  // Número para los botones generales (barra superior, footer, etc.)
  activo: string;
  // Si el visitante vino por un vendedor puntual, su número (todas las
  // consultas van ahí). Si no, undefined y se reparte entre 1 y 2.
  fijo?: string;
}

// Resuelve a qué WhatsApp va un lead según el código del vendedor.
// Sin código → vendedor principal (y en el catálogo se alterna con el 2).
// v=1 / v=2 → números de la Configuración. Otro código → vendedor de la
// tabla Vendedor (si existe y está activo); si no existe, va al principal.
export async function resolverWhatsapp(
  v: string | undefined,
  numero1: string,
  numero2: string
): Promise<WhatsappResuelto> {
  if (v === "1") return { activo: numero1, fijo: numero1 };
  if (v === "2" && numero2) return { activo: numero2, fijo: numero2 };
  if (v && v !== "1" && v !== "2") {
    try {
      const vendedor = await prisma.vendedor.findUnique({ where: { codigo: v } });
      if (vendedor?.activo && vendedor.whatsapp) {
        return { activo: vendedor.whatsapp, fijo: vendedor.whatsapp };
      }
    } catch (error) {
      console.error("Error al buscar vendedor:", error);
    }
  }
  return { activo: numero1 };
}
