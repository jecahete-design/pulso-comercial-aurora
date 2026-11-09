"use server";

import { revalidatePath } from "next/cache";
import { ACTIVIDADES } from "@/lib/pulso/motor";
import { requerirRol } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { EstadoFormulario } from "@/lib/tipos";

// Un campo vacío significa "sin valor"; devuelve undefined si no es válido.
function enteroOpcional(valor: FormDataEntryValue | null) {
  const texto = String(valor ?? "").trim();
  if (texto === "") return null;
  const n = Number(texto);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

function montoOpcional(valor: FormDataEntryValue | null) {
  const texto = String(valor ?? "").trim();
  if (texto === "") return null;
  const n = Number(texto);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : undefined;
}

function leerPeriodo(datos: FormData) {
  const anio = Number(datos.get("anio"));
  const mes = Number(datos.get("mes"));
  return Number.isInteger(anio) && Number.isInteger(mes) && mes >= 1 && mes <= 12
    ? { anio, mes }
    : null;
}

// Metas generales del período: aplican a todos los Desarrolladores de Negocios.
// Solo se carga la meta diaria de cada actividad.
export async function guardarMetasGenerales(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  await requerirRol("gerente");
  const periodo = leerPeriodo(datos);
  if (!periodo) return { error: "Elige un período válido." };

  const monto = montoOpcional(datos.get("monto"));
  if (monto === undefined) return { error: "La meta de ventas debe ser mayor que cero." };

  const conMeta = [];
  const sinMeta = [];
  for (const actividad of ACTIVIDADES) {
    const meta_diaria = enteroOpcional(datos.get(`diaria_${actividad}`));
    if (meta_diaria === undefined) {
      return { error: "Las metas diarias deben ser enteros mayores que cero, o quedar vacías." };
    }
    if (meta_diaria === null) sinMeta.push(actividad);
    else conMeta.push({ ...periodo, actividad, meta_diaria });
  }

  const supabase = await crearClienteServidor();
  const resultados = await Promise.all([
    monto === null
      ? supabase.from("metas_generales_ventas").delete().match(periodo)
      : supabase
          .from("metas_generales_ventas")
          .upsert({ ...periodo, monto }, { onConflict: "anio,mes" }),
    conMeta.length
      ? supabase
          .from("metas_generales_actividad")
          .upsert(conMeta, { onConflict: "anio,mes,actividad" })
      : null,
    sinMeta.length
      ? supabase
          .from("metas_generales_actividad")
          .delete()
          .match(periodo)
          .in("actividad", sinMeta)
      : null,
  ]);
  if (resultados.some((r) => r?.error)) return { error: "No se pudieron guardar las metas." };
  revalidatePath("/", "layout");
  return { ok: "Metas generales guardadas. Ya aplican a todo el equipo." };
}

// Incremento sobre la meta general para una persona en particular.
export async function guardarAjustes(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  await requerirRol("gerente");
  const periodo = leerPeriodo(datos);
  const vendedor_id = String(datos.get("vendedor_id") ?? "");
  if (!periodo || !vendedor_id) {
    return { error: "Elige un Desarrollador de Negocios y un período." };
  }
  const clave = { ...periodo, vendedor_id };

  const incremento = montoOpcional(datos.get("incremento_ventas"));
  if (incremento === undefined) {
    return { error: "El incremento de ventas debe ser mayor que cero, o quedar vacío." };
  }

  const conAjuste = [];
  const sinAjuste = [];
  for (const actividad of ACTIVIDADES) {
    const incremento_diario = enteroOpcional(datos.get(`incremento_${actividad}`));
    if (incremento_diario === undefined) {
      return { error: "Los incrementos deben ser enteros mayores que cero, o quedar vacíos." };
    }
    if (incremento_diario === null) sinAjuste.push(actividad);
    else conAjuste.push({ ...clave, actividad, incremento_diario });
  }

  const supabase = await crearClienteServidor();
  const resultados = await Promise.all([
    incremento === null
      ? supabase.from("ajustes_meta_ventas").delete().match(clave)
      : supabase
          .from("ajustes_meta_ventas")
          .upsert({ ...clave, incremento }, { onConflict: "vendedor_id,anio,mes" }),
    conAjuste.length
      ? supabase
          .from("ajustes_meta_actividad")
          .upsert(conAjuste, { onConflict: "vendedor_id,anio,mes,actividad" })
      : null,
    sinAjuste.length
      ? supabase
          .from("ajustes_meta_actividad")
          .delete()
          .match(clave)
          .in("actividad", sinAjuste)
      : null,
  ]);
  if (resultados.some((r) => r?.error)) return { error: "No se pudo guardar el ajuste." };
  revalidatePath("/", "layout");
  return { ok: "Ajuste guardado." };
}
