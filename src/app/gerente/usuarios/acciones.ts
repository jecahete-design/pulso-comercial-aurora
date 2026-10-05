"use server";

import { revalidatePath } from "next/cache";
import { requerirRol } from "@/lib/sesion";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { EstadoFormulario, Rol } from "@/lib/tipos";

const CLAVE_MINIMA = 8;

export async function crearUsuario(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  await requerirRol("gerente");
  const nombre = String(datos.get("nombre") ?? "").trim();
  const correo = String(datos.get("correo") ?? "").trim().toLowerCase();
  const clave = String(datos.get("clave") ?? "");
  const rol: Rol = datos.get("rol") === "gerente" ? "gerente" : "vendedor";

  if (!nombre || !correo) return { error: "Escribe el nombre y el correo." };
  if (clave.length < CLAVE_MINIMA) {
    return {
      error: `La contraseña temporal debe tener al menos ${CLAVE_MINIMA} caracteres.`,
    };
  }

  const admin = crearClienteAdmin();
  if (!admin) {
    return { error: "Falta configurar SUPABASE_SECRET_KEY en el servidor." };
  }
  // El perfil en la tabla usuarios lo crea el trigger de la base de datos.
  const { error } = await admin.auth.admin.createUser({
    email: correo,
    password: clave,
    email_confirm: true,
    user_metadata: { nombre },
    app_metadata: { rol },
  });
  if (error) {
    return {
      error:
        error.code === "email_exists"
          ? "Ya existe un usuario con ese correo."
          : "No se pudo crear el usuario.",
    };
  }
  revalidatePath("/gerente/usuarios");
  return { ok: "Usuario creado." };
}

export async function actualizarUsuario(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  await requerirRol("gerente");
  const id = String(datos.get("id") ?? "");
  const nombre = String(datos.get("nombre") ?? "").trim();
  if (!id || !nombre) return { error: "Escribe el nombre." };

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("usuarios")
    .update({ nombre })
    .eq("id", id);
  if (error) return { error: "No se pudo guardar el usuario." };
  revalidatePath("/gerente/usuarios");
  return { ok: "Guardado." };
}

export async function cambiarEstadoUsuario(datos: FormData) {
  const gerente = await requerirRol("gerente");
  const id = String(datos.get("id") ?? "");
  const activo = datos.get("activo") === "true";
  // Un gerente no puede desactivarse a sí mismo y quedar sin acceso.
  if (id === gerente.id) return;
  const supabase = await crearClienteServidor();
  await supabase.from("usuarios").update({ activo }).eq("id", id);
  revalidatePath("/gerente/usuarios");
}
