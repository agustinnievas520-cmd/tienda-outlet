// Resuelve a qué vendedor va un lead según el parámetro ?v= de la URL.
// Sin parámetro (o v=1) → vendedor principal. v=2 → siempre el vendedor 2,
// para que un link compartido por un vendedor puntual nunca termine en el otro.
export function resolverWhatsapp(
  v: string | undefined,
  numeroVendedor1: string,
  numeroVendedor2: string
): string {
  if (v === "2" && numeroVendedor2) return numeroVendedor2;
  return numeroVendedor1;
}
