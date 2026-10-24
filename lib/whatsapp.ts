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

// El ?v= de la URL actual manda; si no hay, se usa la cookie que el
// middleware dejó guardada la primera vez que el visitante entró con
// un link de vendedor puntual (así el pin se mantiene en toda la visita).
export function vendedorActivo(
  queryV: string | undefined,
  cookieV: string | undefined
): string | undefined {
  if (queryV === "1" || queryV === "2") return queryV;
  if (cookieV === "1" || cookieV === "2") return cookieV;
  return undefined;
}
