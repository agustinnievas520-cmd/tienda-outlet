import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Si el visitante entra con ?v=1 o ?v=2 (link de un vendedor puntual),
// esa preferencia queda guardada en una cookie por 30 días para que
// el resto de su visita —sin importar a qué página navegue después—
// le siga mandando los leads al mismo vendedor.
export function middleware(request: NextRequest) {
  const v = request.nextUrl.searchParams.get("v");
  if (v === "1" || v === "2") {
    const response = NextResponse.next();
    response.cookies.set("vendedor", v, {
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
    });
    return response;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/catalogo"],
};
