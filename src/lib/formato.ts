import type { Periodo } from "./pulso/fechas";

export function dinero(monto: number, moneda = "USD") {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: moneda,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(monto);
}

export function porcentaje(valor: number | null) {
  return valor === null ? "—" : `${Math.round(valor)}%`;
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
  "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function nombrePeriodo({ anio, mes }: Periodo) {
  return `${MESES[mes - 1]} de ${anio}`;
}

// "2026-10-05" → "5 oct"
export function fechaCorta(fecha: string) {
  const [, m, d] = fecha.split("-").map(Number);
  return `${d} ${MESES[m - 1].slice(0, 3)}`;
}
