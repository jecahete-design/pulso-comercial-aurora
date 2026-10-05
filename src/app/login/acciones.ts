"use server";

import { redirect } from "next/navigation";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { EstadoFormulario } from "@/lib/tipos";

export async function iniciarSesion(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  if (!supabaseConfigurado()) {
    return { error: "La aplicación aún no está conectada a la base de datos." };
  }
  const correo = String(datos.get("correo") ?? "").trim();
  const clave = String(datos.get("clave") ?? "");
  if (!correo || !clave) {
    return { error: "Escribe tu correo y tu contraseña." };
  }

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: correo,
    password: clave,
  });
  if (error) return { error: "Correo o contraseña incorrectos." };

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("activo")
    .eq("id", data.user.id)
    .maybeSingle<{ activo: boolean }>();
  if (!perfil?.activo) {
    await supabase.auth.signOut();
    return { error: "Tu usuario está desactivado. Consulta con tu gerente." };
  }
  redirect("/");
}

export async function cerrarSesion() {
  if (supabaseConfigurado()) {
    const supabase = await crearClienteServidor();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
