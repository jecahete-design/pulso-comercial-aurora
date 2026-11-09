"use server";

import { revalidatePath } from "next/cache";
import { obtenerHoy } from "@/lib/datos";
import { ES_FECHA } from "@/lib/parametros";
import { ACTIVIDADES } from "@/lib/pulso/motor";
import { requerirRol } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { EstadoFormulario } from "@/lib/tipos";

// Guarda el total del día por actividad. Si ya había registro para esa fecha,
// lo reemplaza: hay un solo registro por vendedor y día.
export async function guardarActividad(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const usuario = await requerirRol("vendedor");
  const hoy = await obtenerHoy();
  const fecha = String(datos.get("fecha") ?? "");
  if (!ES_FECHA.test(fecha)) return { error: "Elige una fecha válida." };
  if (fecha > hoy) return { error: "No puedes registrar actividad de días futuros." };

  const valores: Record<string, number> = {};
  const notas: Record<string, string> = {};
  for (const actividad of ACTIVIDADES) {
    const nota = String(datos.get(`nota_${actividad}`) ?? "").trim();
    if (nota.length > 500) return { error: "Cada nota admite hasta 500 caracteres." };
    if (nota) notas[actividad] = nota;
    const texto = String(datos.get(actividad) ?? "").trim();
    const n = texto === "" ? 0 : Number(texto);
    if (!Number.isInteger(n) || n < 0) {
      return { error: "Las cantidades deben ser números enteros, sin negativos." };
    }
    valores[actividad] = n;
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("actividades").upsert(
    {
      vendedor_id: usuario.id,
      fecha,
      ...valores,
      notas,
      actualizado_en: new Date().toISOString(),
    },
    { onConflict: "vendedor_id,fecha" },
  );
  if (error) return { error: "No se pudo guardar la actividad." };
  revalidatePath("/vendedor", "layout");
  return { ok: "Actividad guardada." };
}
