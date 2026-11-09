"use server";

import { revalidatePath } from "next/cache";
import { obtenerHoy } from "@/lib/datos";
import { ES_FECHA } from "@/lib/parametros";
import { requerirRol } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { EstadoFormulario } from "@/lib/tipos";

export async function registrarVenta(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const usuario = await requerirRol("vendedor");
  const hoy = await obtenerHoy();
  const fecha = String(datos.get("fecha") ?? "");
  const cliente = String(datos.get("cliente") ?? "").trim();
  const productoId = String(datos.get("producto_id") ?? "");
  const monto = Number(String(datos.get("monto") ?? "").trim());
  const notas = String(datos.get("notas") ?? "").trim();

  if (!ES_FECHA.test(fecha)) return { error: "Elige una fecha válida." };
  if (fecha > hoy) return { error: "No puedes registrar ventas con fecha futura." };
  if (!cliente) return { error: "Escribe el nombre del cliente." };
  if (!productoId) return { error: "Elige un producto." };
  if (!Number.isFinite(monto) || monto <= 0) {
    return { error: "El monto debe ser mayor que cero." };
  }
  if (notas.length > 500) return { error: "La nota admite hasta 500 caracteres." };

  const supabase = await crearClienteServidor();
  // Solo se puede vender un producto activo del catálogo.
  const { data: producto } = await supabase
    .from("productos")
    .select("id")
    .eq("id", productoId)
    .eq("activo", true)
    .maybeSingle();
  if (!producto) return { error: "Ese producto ya no está disponible." };

  const { error } = await supabase.from("ventas").insert({
    vendedor_id: usuario.id,
    fecha,
    cliente,
    producto_id: productoId,
    monto: Math.round(monto * 100) / 100,
    notas: notas || null,
  });
  if (error) return { error: "No se pudo registrar la venta." };
  revalidatePath("/vendedor", "layout");
  return { ok: "Venta registrada." };
}

// La base de datos solo permite eliminar ventas propias del mes en curso.
export async function eliminarVenta(datos: FormData) {
  await requerirRol("vendedor");
  const id = String(datos.get("id") ?? "");
  const supabase = await crearClienteServidor();
  await supabase.from("ventas").delete().eq("id", id);
  revalidatePath("/vendedor", "layout");
}
