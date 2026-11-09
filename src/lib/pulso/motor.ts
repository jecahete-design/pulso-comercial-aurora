import {
  type Periodo,
  diaDelMes,
  diaISO,
  diasDelMes,
  fechaDe,
  finMes,
  inicioMes,
  lunesDe,
  mismoPeriodo,
  periodoDe,
  sumarDias,
} from "./fechas";

// Motor Pulso: todos los cálculos y semáforos de la ficha (secciones 6, 7 y 15).
// Son funciones puras: reciben filas ya leídas y no consultan la base de datos.

export const ACTIVIDADES = [
  "llamadas",
  "reuniones",
  "visitas",
  "propuestas",
  "seguimientos",
  "prospectos",
] as const;
export type Actividad = (typeof ACTIVIDADES)[number];

export const NOMBRE_ACTIVIDAD: Record<Actividad, string> = {
  llamadas: "Llamadas",
  reuniones: "Reuniones",
  visitas: "Visitas",
  propuestas: "Propuestas",
  seguimientos: "Seguimientos",
  prospectos: "Nuevos prospectos",
};

export type Estado =
  | "verde"
  | "amarillo"
  | "rojo"
  | "en_curso"
  | "sin_meta"
  | "no_laboral";

export const TOLERANCIA_RITMO = 5; // puntos porcentuales
export const UMBRAL_AMARILLO_DIARIO = 95; // % al cierre del día

export type FilaActividad = { fecha: string } & Record<Actividad, number>;
export type FilaVenta = {
  id: string;
  fecha: string;
  cliente: string;
  producto: string;
  monto: number;
  notas?: string | null;
};
export type FilaMetaVenta = Periodo & { monto: number };
export type FilaMetaActividad = Periodo & {
  actividad: Actividad;
  meta_diaria: number | null;
};

export type LecturaActividad = {
  actividad: Actividad;
  realizado: number;
  meta: number | null;
  cumplimiento: number | null;
  estado: Estado;
};
export type PulsoDia = {
  fecha: string;
  cumplimiento: number | null;
  estado: Estado;
  detalle: LecturaActividad[];
};
export type PulsoSemana = {
  lunes: string;
  domingo: string;
  cumplimiento: number | null;
  esperado: number;
  estado: Estado;
  detalle: LecturaActividad[];
};
export type PulsoResultados = {
  meta: number | null;
  vendido: number;
  cumplimiento: number | null;
  esperado: number;
  brecha: number | null;
  estado: Estado;
};

// Ritmo: compara el cumplimiento con el avance esperado a la fecha.
export function semaforoRitmo(cumplimiento: number, esperado: number): Estado {
  if (cumplimiento >= esperado) return "verde";
  if (cumplimiento >= esperado - TOLERANCIA_RITMO) return "amarillo";
  return "rojo";
}

// Diario: no se juzga un día que todavía no termina.
function semaforoDiario(
  cumplimiento: number,
  laboral: boolean,
  cerrado: boolean,
): Estado {
  if (cumplimiento >= 100) return "verde";
  if (!laboral) return "no_laboral";
  if (!cerrado) return "en_curso";
  return cumplimiento >= UMBRAL_AMARILLO_DIARIO ? "amarillo" : "rojo";
}

// Promedio del cumplimiento de las actividades con meta, cada una topada en 100.
function promedioTopado(detalle: LecturaActividad[]) {
  const conMeta = detalle.filter((l) => l.cumplimiento !== null);
  if (conMeta.length === 0) return null;
  const suma = conMeta.reduce((s, l) => s + Math.min(l.cumplimiento!, 100), 0);
  return suma / conMeta.length;
}

export function calcularResultados(
  vendido: number,
  meta: number | null,
  periodo: Periodo,
  corte: string,
): PulsoResultados {
  const esperado = (diaDelMes(corte) / diasDelMes(periodo)) * 100;
  if (meta === null || meta <= 0) {
    return {
      meta: null,
      vendido,
      cumplimiento: null,
      esperado,
      brecha: null,
      estado: "sin_meta",
    };
  }
  const cumplimiento = (vendido / meta) * 100;
  return {
    meta,
    vendido,
    cumplimiento,
    esperado,
    brecha: meta - vendido,
    estado: semaforoRitmo(cumplimiento, esperado),
  };
}

type Contexto = {
  hoy: string;
  diasLaborales: number[];
  actividades: FilaActividad[];
  metasActividad: FilaMetaActividad[];
};

// Solo se carga la meta diaria; la semanal y la mensual se derivan de ella.
function metaDiariaDe(ctx: Contexto, periodo: Periodo, actividad: Actividad) {
  const fila = ctx.metasActividad.find(
    (m) => mismoPeriodo(m, periodo) && m.actividad === actividad,
  );
  return fila?.meta_diaria ?? null;
}

// Días laborales de un mes, para mostrar la meta mensual de actividad.
export function diasLaboralesDelMes(periodo: Periodo, diasLaborales: number[]) {
  let total = 0;
  for (let dia = 1; dia <= diasDelMes(periodo); dia++) {
    if (diasLaborales.includes(diaISO(fechaDe(periodo, dia)))) total++;
  }
  return total;
}

export function calcularDia(ctx: Contexto, fecha: string): PulsoDia {
  const laboral = ctx.diasLaborales.includes(diaISO(fecha));
  const cerrado = fecha < ctx.hoy;
  const fila = ctx.actividades.find((a) => a.fecha === fecha);
  const detalle = ACTIVIDADES.map((actividad): LecturaActividad => {
    const realizado = fila?.[actividad] ?? 0;
    const meta = metaDiariaDe(ctx, periodoDe(fecha), actividad);
    if (meta === null) {
      return { actividad, realizado, meta, cumplimiento: null, estado: "sin_meta" };
    }
    const cumplimiento = (realizado / meta) * 100;
    return {
      actividad,
      realizado,
      meta,
      cumplimiento,
      estado: semaforoDiario(cumplimiento, laboral, cerrado),
    };
  });
  const cumplimiento = promedioTopado(detalle);
  return {
    fecha,
    cumplimiento,
    estado:
      cumplimiento === null
        ? "sin_meta"
        : semaforoDiario(cumplimiento, laboral, cerrado),
    detalle,
  };
}

// Semana de lunes a domingo, leída a la fecha de corte. La meta semanal es la
// diaria vigente el lunes (aunque la semana cruce a otro mes) por los días
// laborales de la semana: con lunes a viernes, la diaria por 5.
export function calcularSemana(
  ctx: Contexto,
  lunes: string,
  corte: string,
): PulsoSemana {
  const domingo = sumarDias(lunes, 6);
  const hasta = corte < domingo ? corte : domingo;
  let laborales = 0;
  let transcurridos = 0;
  for (let i = 0; i < 7; i++) {
    const dia = sumarDias(lunes, i);
    if (!ctx.diasLaborales.includes(diaISO(dia))) continue;
    laborales++;
    // El día en curso no cuenta hasta que termina: no se exige ritmo por
    // un día que el vendedor todavía está trabajando.
    if (dia <= hasta && dia < ctx.hoy) transcurridos++;
  }
  const esperado = laborales === 0 ? 100 : (transcurridos / laborales) * 100;

  const filas = ctx.actividades.filter(
    (a) => a.fecha >= lunes && a.fecha <= hasta,
  );
  const detalle = ACTIVIDADES.map((actividad): LecturaActividad => {
    const realizado = filas.reduce((s, f) => s + f[actividad], 0);
    const diaria = metaDiariaDe(ctx, periodoDe(lunes), actividad);
    const meta = diaria === null || laborales === 0 ? null : diaria * laborales;
    if (meta === null) {
      return { actividad, realizado, meta, cumplimiento: null, estado: "sin_meta" };
    }
    const cumplimiento = (realizado / meta) * 100;
    return {
      actividad,
      realizado,
      meta,
      cumplimiento,
      estado: semaforoRitmo(cumplimiento, esperado),
    };
  });
  const cumplimiento = promedioTopado(detalle);
  return {
    lunes,
    domingo,
    cumplimiento,
    esperado,
    estado:
      cumplimiento === null ? "sin_meta" : semaforoRitmo(cumplimiento, esperado),
    detalle,
  };
}

export type EntradaVista = {
  hoy: string;
  periodo: Periodo;
  diasLaborales: number[];
  ventas: FilaVenta[];
  actividades: FilaActividad[];
  metasVentas: FilaMetaVenta[];
  metasActividad: FilaMetaActividad[];
};

export type PuntoVentas = {
  dia: number;
  acumulado: number | null; // null en los días que aún no llegan
  esperado: number | null; // null si no hay meta
};

export type VistaPulso = {
  periodo: Periodo;
  esActual: boolean;
  corte: string;
  resultados: PulsoResultados;
  dia: PulsoDia | null; // solo en el período en curso
  semana: PulsoSemana;
  semanas: PulsoSemana[]; // semanas cuyo lunes cae en el período
  dias: PulsoDia[]; // del día 1 al corte
  serieVentas: PuntoVentas[];
  ventas: FilaVenta[];
};

// Arma todo lo que muestran los dashboards para un vendedor y un período.
// El corte es hoy en el mes en curso y el último día en meses anteriores.
export function construirVista(e: EntradaVista): VistaPulso {
  const { periodo, hoy } = e;
  const fin = finMes(periodo);
  const corte = hoy < fin ? (hoy < inicioMes(periodo) ? inicioMes(periodo) : hoy) : fin;
  const esActual = mismoPeriodo(periodoDe(hoy), periodo);
  const ctx: Contexto = e;

  const ventas = e.ventas
    .filter((v) => mismoPeriodo(periodoDe(v.fecha), periodo))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const vendido = ventas.reduce((s, v) => s + v.monto, 0);
  const meta =
    e.metasVentas.find((m) => mismoPeriodo(m, periodo))?.monto ?? null;

  const totalDias = diasDelMes(periodo);
  const serieVentas: PuntoVentas[] = [];
  let acumulado = 0;
  for (let dia = 1; dia <= totalDias; dia++) {
    const fecha = fechaDe(periodo, dia);
    acumulado += ventas
      .filter((v) => v.fecha === fecha)
      .reduce((s, v) => s + v.monto, 0);
    serieVentas.push({
      dia,
      acumulado: fecha <= corte ? acumulado : null,
      esperado: meta === null ? null : (meta * dia) / totalDias,
    });
  }

  const dias: PulsoDia[] = [];
  for (let f = inicioMes(periodo); f <= corte; f = sumarDias(f, 1)) {
    dias.push(calcularDia(ctx, f));
  }

  const semanas: PulsoSemana[] = [];
  let lunes = lunesDe(inicioMes(periodo));
  if (lunes < inicioMes(periodo)) lunes = sumarDias(lunes, 7);
  for (; lunes <= corte; lunes = sumarDias(lunes, 7)) {
    semanas.push(calcularSemana(ctx, lunes, hoy));
  }

  return {
    periodo,
    esActual,
    corte,
    resultados: calcularResultados(vendido, meta, periodo, corte),
    dia: esActual ? calcularDia(ctx, corte) : null,
    semana: calcularSemana(ctx, lunesDe(corte), corte),
    semanas,
    dias,
    serieVentas,
    ventas,
  };
}
