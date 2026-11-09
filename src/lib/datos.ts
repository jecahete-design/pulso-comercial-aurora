import { cache } from "react";
import {
  type Periodo,
  finMes,
  hoyEn,
  inicioMes,
  lunesDe,
  mismoPeriodo,
  periodoAnterior,
  periodoDe,
  sumarDias,
} from "./pulso/fechas";
import {
  ACTIVIDADES,
  type Actividad,
  NOMBRE_ACTIVIDAD,
  type FilaActividad,
  type FilaMetaActividad,
  type FilaMetaVenta,
  type FilaVenta,
  type VistaPulso,
  construirVista,
} from "./pulso/motor";
import { crearClienteServidor } from "./supabase/servidor";
import type { Usuario } from "./tipos";

// Lecturas de la base de datos. Todas pasan por los permisos por fila: un
// vendedor solo recibe sus propias filas aunque pida las de otro.

export type Configuracion = {
  dias_laborales: number[];
  zona_horaria: string;
  moneda: string;
  horas_jornada: number;
};

const POR_DEFECTO: Configuracion = {
  dias_laborales: [1, 2, 3, 4, 5],
  zona_horaria: "America/Panama",
  moneda: "USD",
  horas_jornada: 8,
};

export const obtenerConfiguracion = cache(async (): Promise<Configuracion> => {
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("configuracion")
    .select("dias_laborales, zona_horaria, moneda, horas_jornada")
    .maybeSingle<Configuracion>();
  return data ?? POR_DEFECTO;
});

export async function obtenerHoy() {
  return hoyEn((await obtenerConfiguracion()).zona_horaria);
}

type VentaBD = {
  id: string;
  vendedor_id: string;
  fecha: string;
  cliente: string;
  monto: number;
  notas: string | null;
  productos: { nombre: string } | null;
};

// Lee las filas del período para uno o todos los vendedores y arma una vista
// por vendedor. Incluye la semana que empieza en el mes anterior.
async function cargarVistas(
  periodo: Periodo,
  vendedorIds: string[],
): Promise<Map<string, VistaPulso>> {
  const vistas = new Map<string, VistaPulso>();
  if (vendedorIds.length === 0) return vistas;

  const [config, supabase] = await Promise.all([
    obtenerConfiguracion(),
    crearClienteServidor(),
  ]);
  const hoy = hoyEn(config.zona_horaria);
  const desde = inicioMes(periodo);
  // La última semana del período puede terminar en el mes siguiente.
  const hasta = sumarDias(lunesDe(finMes(periodo)), 6);
  const previo = periodoAnterior(periodo);

  const periodos = [periodo, previo];
  const [ventas, actividades, metas] = await Promise.all([
    supabase
      .from("ventas")
      .select("id, vendedor_id, fecha, cliente, monto, notas, productos(nombre)")
      .in("vendedor_id", vendedorIds)
      .gte("fecha", desde)
      .lte("fecha", finMes(periodo))
      .returns<VentaBD[]>(),
    supabase
      .from("actividades")
      .select("*")
      .in("vendedor_id", vendedorIds)
      .gte("fecha", lunesDe(desde))
      .lte("fecha", hasta)
      .returns<(FilaActividad & { vendedor_id: string })[]>(),
    leerMetas(periodos, vendedorIds),
  ]);
  for (const id of vendedorIds) {
    vistas.set(
      id,
      construirVista({
        hoy,
        periodo,
        diasLaborales: config.dias_laborales,
        ventas: (ventas.data ?? [])
          .filter((v) => v.vendedor_id === id)
          .map(
            (v): FilaVenta => ({
              id: v.id,
              fecha: v.fecha,
              cliente: v.cliente,
              producto: v.productos?.nombre ?? "—",
              monto: Number(v.monto),
              notas: v.notas,
            }),
          ),
        actividades: (actividades.data ?? []).filter((a) => a.vendedor_id === id),
        ...metasEfectivas(metas, id, periodos),
      }),
    );
  }
  return vistas;
}

// ---------------------------------------------------------------------------
// Metas: una general por período para todo el equipo, más el incremento que el
// gerente le asigne a un vendedor en particular.
// ---------------------------------------------------------------------------

export type MetaGeneralActividad = Periodo & { actividad: Actividad; meta_diaria: number };
export type AjusteActividad = Periodo & {
  vendedor_id: string;
  actividad: Actividad;
  incremento_diario: number;
};
export type MetasLeidas = {
  generalesVentas: (Periodo & { monto: number })[];
  generalesActividad: MetaGeneralActividad[];
  ajustesVentas: (Periodo & { vendedor_id: string; incremento: number })[];
  ajustesActividad: AjusteActividad[];
};

// Lee metas generales y ajustes de los períodos pedidos. Con RLS, un vendedor
// solo recibe sus propios ajustes.
export async function leerMetas(
  periodos: Periodo[],
  vendedorIds: string[],
): Promise<MetasLeidas> {
  const supabase = await crearClienteServidor();
  const anios = [...new Set(periodos.map((p) => p.anio))];
  const meses = [...new Set(periodos.map((p) => p.mes))];
  const delPeriodo = <T extends Periodo>(filas: T[] | null) =>
    (filas ?? []).filter((f) => periodos.some((p) => mismoPeriodo(f, p)));

  const [gv, ga, av, aa] = await Promise.all([
    supabase
      .from("metas_generales_ventas")
      .select("anio, mes, monto")
      .in("anio", anios)
      .in("mes", meses)
      .returns<(Periodo & { monto: number })[]>(),
    supabase
      .from("metas_generales_actividad")
      .select("anio, mes, actividad, meta_diaria")
      .in("anio", anios)
      .in("mes", meses)
      .returns<MetaGeneralActividad[]>(),
    supabase
          .from("ajustes_meta_ventas")
          .select("vendedor_id, anio, mes, incremento")
          .in("vendedor_id", vendedorIds)
          .in("anio", anios)
          .in("mes", meses)
          .returns<(Periodo & { vendedor_id: string; incremento: number })[]>(),
    supabase
          .from("ajustes_meta_actividad")
          .select("vendedor_id, anio, mes, actividad, incremento_diario")
          .in("vendedor_id", vendedorIds)
          .in("anio", anios)
          .in("mes", meses)
          .returns<AjusteActividad[]>(),
  ]);
  return {
    generalesVentas: delPeriodo(gv.data).map((m) => ({ ...m, monto: Number(m.monto) })),
    generalesActividad: delPeriodo(ga.data),
    ajustesVentas: delPeriodo(av.data).map((m) => ({
      ...m,
      incremento: Number(m.incremento),
    })),
    ajustesActividad: delPeriodo(aa.data),
  };
}

// Meta de cada vendedor = general + su ajuste. Sin general ni ajuste: sin meta.
export function metasEfectivas(
  metas: MetasLeidas,
  vendedorId: string,
  periodos: Periodo[],
): { metasVentas: FilaMetaVenta[]; metasActividad: FilaMetaActividad[] } {
  const metasVentas: FilaMetaVenta[] = [];
  const metasActividad: FilaMetaActividad[] = [];
  for (const p of periodos) {
    const general = metas.generalesVentas.find((m) => mismoPeriodo(m, p))?.monto ?? 0;
    const ajuste =
      metas.ajustesVentas.find((m) => m.vendedor_id === vendedorId && mismoPeriodo(m, p))
        ?.incremento ?? 0;
    if (general + ajuste > 0) {
      metasVentas.push({ ...p, monto: Math.round((general + ajuste) * 100) / 100 });
    }
    for (const actividad of ACTIVIDADES) {
      const diaria =
        metas.generalesActividad.find(
          (m) => mismoPeriodo(m, p) && m.actividad === actividad,
        )?.meta_diaria ?? 0;
      const extra =
        metas.ajustesActividad.find(
          (m) =>
            m.vendedor_id === vendedorId &&
            mismoPeriodo(m, p) &&
            m.actividad === actividad,
        )?.incremento_diario ?? 0;
      if (diaria + extra > 0) {
        metasActividad.push({ ...p, actividad, meta_diaria: diaria + extra });
      }
    }
  }
  return { metasVentas, metasActividad };
}

// Notas que dejó el vendedor en el período, de la más reciente a la más antigua.
export type Nota = { fecha: string; campo: string; texto: string };

export async function cargarNotas(vendedorId: string, periodo: Periodo): Promise<Nota[]> {
  const supabase = await crearClienteServidor();
  const [actividades, ventas] = await Promise.all([
    supabase
      .from("actividades")
      .select("fecha, notas")
      .eq("vendedor_id", vendedorId)
      .gte("fecha", inicioMes(periodo))
      .lte("fecha", finMes(periodo))
      .returns<{ fecha: string; notas: Partial<Record<Actividad, string>> | null }[]>(),
    supabase
      .from("ventas")
      .select("fecha, cliente, notas")
      .eq("vendedor_id", vendedorId)
      .gte("fecha", inicioMes(periodo))
      .lte("fecha", finMes(periodo))
      .not("notas", "is", null)
      .returns<{ fecha: string; cliente: string; notas: string }[]>(),
  ]);
  const notas: Nota[] = [];
  for (const fila of actividades.data ?? []) {
    for (const actividad of ACTIVIDADES) {
      const texto = fila.notas?.[actividad]?.trim();
      if (texto) notas.push({ fecha: fila.fecha, campo: NOMBRE_ACTIVIDAD[actividad], texto });
    }
  }
  for (const venta of ventas.data ?? []) {
    if (venta.notas.trim()) {
      notas.push({ fecha: venta.fecha, campo: `Venta · ${venta.cliente}`, texto: venta.notas });
    }
  }
  return notas.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export async function cargarVista(vendedorId: string, periodo: Periodo) {
  return (await cargarVistas(periodo, [vendedorId])).get(vendedorId)!;
}

export type FilaEquipo = { vendedor: Usuario; vista: VistaPulso };

export async function cargarEquipo(periodo: Periodo): Promise<FilaEquipo[]> {
  const vendedores = await listarVendedores();
  const vistas = await cargarVistas(
    periodo,
    vendedores.map((v) => v.id),
  );
  return vendedores.map((vendedor) => ({
    vendedor,
    vista: vistas.get(vendedor.id)!,
  }));
}

export async function listarVendedores(): Promise<Usuario[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("usuarios")
    .select("id, nombre, correo, rol, activo")
    .eq("rol", "vendedor")
    .eq("activo", true)
    .order("nombre")
    .returns<Usuario[]>();
  return data ?? [];
}

export async function periodoActual(): Promise<Periodo> {
  return periodoDe(await obtenerHoy());
}
