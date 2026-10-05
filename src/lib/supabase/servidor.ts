import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_CLAVE_PUBLICA, SUPABASE_URL } from "./config";

// Cliente con la sesión del usuario conectado: todas las consultas pasan por
// los permisos por fila de la base de datos.
export async function crearClienteServidor() {
  const almacen = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_CLAVE_PUBLICA, {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll(lista) {
        try {
          lista.forEach(({ name, value, options }) =>
            almacen.set(name, value, options),
          );
        } catch {
          // Desde un Server Component no se pueden escribir cookies; el proxy
          // se encarga de renovar la sesión.
        }
      },
    },
  });
}
