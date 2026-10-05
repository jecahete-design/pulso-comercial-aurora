// Las fechas se manejan como texto "AAAA-MM-DD" para no depender de la zona
// horaria del servidor.

export type Periodo = { anio: number; mes: number };

const DIA_MS = 86_400_000;

function aUTC(fecha: string) {
  const [a, m, d] = fecha.split("-").map(Number);
  return Date.UTC(a, m - 1, d);
}

function deUTC(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function hoyEn(zonaHoraria: string, ahora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zonaHoraria,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
}

export function sumarDias(fecha: string, dias: number) {
  return deUTC(aUTC(fecha) + dias * DIA_MS);
}

// Día de la semana ISO: 1 = lunes … 7 = domingo.
export function diaISO(fecha: string) {
  return new Date(aUTC(fecha)).getUTCDay() || 7;
}

export function lunesDe(fecha: string) {
  return sumarDias(fecha, 1 - diaISO(fecha));
}

export function diaDelMes(fecha: string) {
  return Number(fecha.slice(8, 10));
}

export function periodoDe(fecha: string): Periodo {
  return { anio: Number(fecha.slice(0, 4)), mes: Number(fecha.slice(5, 7)) };
}

export function diasDelMes({ anio, mes }: Periodo) {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

export function fechaDe({ anio, mes }: Periodo, dia: number) {
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function inicioMes(p: Periodo) {
  return fechaDe(p, 1);
}

export function finMes(p: Periodo) {
  return fechaDe(p, diasDelMes(p));
}

export function mismoPeriodo(a: Periodo, b: Periodo) {
  return a.anio === b.anio && a.mes === b.mes;
}

export function periodoAnterior({ anio, mes }: Periodo): Periodo {
  return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
}

export function textoPeriodo({ anio, mes }: Periodo) {
  return `${anio}-${String(mes).padStart(2, "0")}`;
}

// Lee "AAAA-MM"; si falta, es inválido o es posterior a `maximo`, devuelve `maximo`.
export function leerPeriodo(texto: string | undefined, maximo: Periodo): Periodo {
  const m = /^(\d{4})-(\d{2})$/.exec(texto ?? "");
  if (!m) return maximo;
  const p = { anio: Number(m[1]), mes: Number(m[2]) };
  if (p.mes < 1 || p.mes > 12 || p.anio < 2020) return maximo;
  return textoPeriodo(p) > textoPeriodo(maximo) ? maximo : p;
}
