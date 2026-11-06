"use server";

import { revalidatePath } from "next/cache";
import { ACTIVIDADES } from "@/lib/pulso/motor";
import { requerirRol } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { EstadoFormulario } from "@/lib/tipos";

// Un campo vacío significa "sin meta"; devuelve undefined si no es válido.
function enteroOpcional(valor: FormDataEntryValue | null) {
  const texto = String(valor ?? "").trim();
  if (texto === "") return null;
  const n = Number(texto);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

// Guarda las metas de un vendedor para un período. Cada período tiene sus
// propias filas, así que cambiar un mes no altera los anteriores.
export async function guardarMetas(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  await requerirRol("gerente");
  const vendedorId = String(datos.get("vendedor_id") ?? "");
  const anio = Number(datos.get("anio"));
  const mes = Number(datos.get("mes"));
  if (!vendedorId || !Number.isInteger(anio) || !Number.isInteger(mes)) {
    return { error: "Elige un desarrollador de negocios y un período." };
  }

  const textoMonto = String(datos.get("monto") ?? "").trim();
  const monto = textoMonto === "" ? null : Number(textoMonto);
  if (monto !== null && (!Number.isFinite(monto) || monto <= 0)) {
    return { error: "La meta de ventas debe ser mayor que cero." };
  }

  const filas = [];
  for (const actividad of ACTIVIDADES) {
    const meta_diaria = enteroOpcional(datos.get(`diaria_${actividad}`));
    const meta_semanal = enteroOpcional(datos.get(`semanal_${actividad}`));
    if (meta_diaria === undefined || meta_semanal === undefined) {
      return {
        error: "Las metas de actividad deben ser enteros mayores que cero, o quedar vacías.",
      };
    }
    filas.push({ vendedor_id: vendedorId, anio, mes, actividad, meta_diaria, meta_semanal });
  }

  const supabase = await crearClienteServidor();
  const ventas =
    monto === null
      ? await supabase
          .from("metas_ventas")
          .delete()
          .eq("vendedor_id", vendedorId)
          .eq("anio", anio)
          .eq("mes", mes)
      : await supabase
          .from("metas_ventas")
          .upsert(
            { vendedor_id: vendedorId, anio, mes, monto: Math.round(monto * 100) / 100 },
            { onConflict: "vendedor_id,anio,mes" },
          );
  const actividad = await supabase
    .from("metas_actividad")
    .upsert(filas, { onConflict: "vendedor_id,anio,mes,actividad" });
  if (ventas.error || actividad.error) {
    return { error: "No se pudieron guardar las metas." };
  }
  revalidatePath("/gerente", "layout");
  return { ok: "Metas guardadas." };
}
