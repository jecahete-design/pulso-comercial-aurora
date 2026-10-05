import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  SUPABASE_CLAVE_PUBLICA,
  SUPABASE_URL,
  supabaseConfigurado,
} from "@/lib/supabase/config";

// Renueva la sesión en cada petición y envía al login a quien no la tenga.
// Los permisos reales se verifican en cada página, acción y en la base de datos.
export async function proxy(request: NextRequest) {
  const ruta = request.nextUrl.pathname;
  // La vista previa con datos inventados no requiere sesión (solo desarrollo).
  if (ruta === "/demo" && process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }
  const enLogin = ruta === "/login";
  const irALogin = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  };

  if (!supabaseConfigurado()) {
    return enLogin ? NextResponse.next() : irALogin();
  }

  let respuesta = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_CLAVE_PUBLICA, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(lista) {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        respuesta = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) =>
          respuesta.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  if (!data?.claims && !enLogin) {
    const redireccion = irALogin();
    respuesta.cookies.getAll().forEach((c) => redireccion.cookies.set(c));
    return redireccion;
  }
  return respuesta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
