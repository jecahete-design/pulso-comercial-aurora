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
};

const POR_DEFECTO: Configuracion = {
  dias_laborales: [1, 2, 3, 4, 5],
  zona_horaria: "America/Panama",
  moneda: "USD",
};

export const obtenerConfiguracion = cache(async (): Promise<Configuracion> => {
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("configuracion")
    .select("dias_laborales, zona_horaria, moneda")
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

  const [ventas, actividades, metasVentas, metasActividad] = await Promise.all([
    supabase
      .from("ventas")
      .select("id, vendedor_id, fecha, cliente, monto, productos(nombre)")
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
    supabase
      .from("metas_ventas")
      .select("vendedor_id, anio, mes, monto")
      .in("vendedor_id", vendedorIds)
      .eq("anio", periodo.anio)
      .eq("mes", periodo.mes)
      .returns<(FilaMetaVenta & { vendedor_id: string })[]>(),
    supabase
      .from("metas_actividad")
      .select("vendedor_id, anio, mes, actividad, meta_diaria, meta_semanal")
      .in("vendedor_id", vendedorIds)
      .in("anio", [periodo.anio, previo.anio])
      .in("mes", [periodo.mes, previo.mes])
      .returns<(FilaMetaActividad & { vendedor_id: string })[]>(),
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
            }),
          ),
        actividades: (actividades.data ?? []).filter((a) => a.vendedor_id === id),
        metasVentas: (metasVentas.data ?? [])
          .filter((m) => m.vendedor_id === id)
          .map((m) => ({ ...m, monto: Number(m.monto) })),
        metasActividad: (metasActividad.data ?? []).filter(
          (m) =>
            m.vendedor_id === id &&
            (mismoPeriodo(m, periodo) || mismoPeriodo(m, previo)),
        ),
      }),
    );
  }
  return vistas;
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
