import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseConfigurado } from "./supabase/config";
import { crearClienteServidor } from "./supabase/servidor";
import type { Rol, Usuario } from "./tipos";

// Usuario conectado y activo, o null. Se resuelve una sola vez por petición.
export const obtenerSesion = cache(async (): Promise<Usuario | null> => {
  if (!supabaseConfigurado()) return null;
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return null;
  const { data: perfil } = await supabase
    .from("usuarios")
    .select("id, nombre, correo, rol, activo")
    .eq("id", data.claims.sub)
    .maybeSingle<Usuario>();
  return perfil?.activo ? perfil : null;
});

export function rutaInicio(rol: Rol) {
  return rol === "gerente" ? "/gerente" : "/vendedor";
}

export async function requerirRol(rol: Rol): Promise<Usuario> {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  if (sesion.rol !== rol) redirect(rutaInicio(sesion.rol));
  return sesion;
}
