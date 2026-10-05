import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

// Cliente con la clave secreta: salta los permisos por fila. Solo debe usarse
// en acciones del servidor que ya verificaron que quien llama es gerente.
export function crearClienteAdmin() {
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!clave) return null;
  return createClient(SUPABASE_URL, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
