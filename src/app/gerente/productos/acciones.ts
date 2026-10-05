"use server";

import { revalidatePath } from "next/cache";
import { requerirRol } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { EstadoFormulario } from "@/lib/tipos";

const DUPLICADO = "23505";

export async function crearProducto(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  await requerirRol("gerente");
  const nombre = String(datos.get("nombre") ?? "").trim();
  if (!nombre) return { error: "Escribe el nombre del producto." };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("productos").insert({ nombre });
  if (error) {
    return {
      error:
        error.code === DUPLICADO
          ? "Ya existe un producto con ese nombre."
          : "No se pudo crear el producto.",
    };
  }
  revalidatePath("/gerente/productos");
  return { ok: "Producto creado." };
}

export async function actualizarProducto(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  await requerirRol("gerente");
  const id = String(datos.get("id") ?? "");
  const nombre = String(datos.get("nombre") ?? "").trim();
  if (!id || !nombre) return { error: "Escribe el nombre del producto." };

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("productos")
    .update({ nombre })
    .eq("id", id);
  if (error) {
    return {
      error:
        error.code === DUPLICADO
          ? "Ya existe un producto con ese nombre."
          : "No se pudo guardar el producto.",
    };
  }
  revalidatePath("/gerente/productos");
  return { ok: "Guardado." };
}

export async function cambiarEstadoProducto(datos: FormData) {
  await requerirRol("gerente");
  const id = String(datos.get("id") ?? "");
  const activo = datos.get("activo") === "true";
  const supabase = await crearClienteServidor();
  await supabase.from("productos").update({ activo }).eq("id", id);
  revalidatePath("/gerente/productos");
}
