"use client";

import { useState } from "react";
import type { Estado, PulsoDia, PuntoVentas } from "@/lib/pulso/motor";

const ANCHO = 640;
const ALTO = 240;
const M = { arriba: 16, derecha: 72, abajo: 28, izquierda: 52 };
const INDIGO = "#4f46e5";
const GRIS = "#64748b";

function ticks(maximo: number) {
  const paso = 10 ** Math.floor(Math.log10(maximo || 1));
  const base = [1, 2, 5, 10].map((k) => k * paso).find((p) => maximo / p <= 4) ?? paso;
  const lista = [];
  for (let v = 0; v <= maximo + 1e-9; v += base) lista.push(v);
  return lista;
}

function compacto(v: number) {
  return v >= 1000 ? `$${(v / 1000).toLocaleString("es-PA", { maximumFractionDigits: 1 })}K` : `$${v}`;
}

// Ventas acumuladas del mes frente al avance esperado de la meta.
export function GraficaVentas({
  serie,
  moneda,
}: {
  serie: PuntoVentas[];
  moneda: string;
}) {
  const [activo, setActivo] = useState<number | null>(null);
  const dinero = (v: number) =>
    new Intl.NumberFormat("es-PA", { style: "currency", currency: moneda, currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(v);

  const reales = serie.filter((p) => p.acumulado !== null);
  const hayMeta = serie.some((p) => p.esperado !== null);
  const maximo = Math.max(
    1,
    ...serie.map((p) => Math.max(p.acumulado ?? 0, p.esperado ?? 0)),
  );
  const marcas = ticks(maximo);
  const tope = marcas[marcas.length - 1] < maximo ? maximo : marcas[marcas.length - 1];
  const x = (dia: number) =>
    M.izquierda + ((dia - 1) / Math.max(1, serie.length - 1)) * (ANCHO - M.izquierda - M.derecha);
  const y = (v: number) => ALTO - M.abajo - (v / tope) * (ALTO - M.arriba - M.abajo);
  const linea = (puntos: { dia: number; v: number }[]) =>
    puntos.map((p, i) => `${i ? "L" : "M"}${x(p.dia).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");

  const ultimo = reales[reales.length - 1];
  const fin = serie[serie.length - 1];
  const punto = activo === null ? null : serie[activo];
  // Si las dos etiquetas finales chocan, se separan verticalmente.
  const yVendido = ultimo ? y(ultimo.acumulado!) : 0;
  const yEsperado = hayMeta ? y(fin.esperado!) : 0;

  return (
    <figure>
      <div className="mb-2 flex flex-wrap gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <svg width="18" height="4" aria-hidden><line x1="0" y1="2" x2="18" y2="2" stroke={INDIGO} strokeWidth="2" /></svg>
          Vendido acumulado
        </span>
        {hayMeta && (
          <span className="inline-flex items-center gap-1.5">
            <svg width="18" height="4" aria-hidden><line x1="0" y1="2" x2="18" y2="2" stroke={GRIS} strokeWidth="2" strokeDasharray="4 3" /></svg>
            Avance esperado
          </span>
        )}
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${ANCHO} ${ALTO}`}
          className="w-full"
          role="img"
          aria-label="Ventas acumuladas del mes frente al avance esperado"
          onMouseLeave={() => setActivo(null)}
          onMouseMove={(e) => {
            const caja = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - caja.left) / caja.width) * ANCHO;
            const dia = Math.round(
              ((px - M.izquierda) / (ANCHO - M.izquierda - M.derecha)) * (serie.length - 1),
            );
            setActivo(Math.min(serie.length - 1, Math.max(0, dia)));
          }}
        >
          {marcas.map((v) => (
            <g key={v}>
              <line x1={M.izquierda} x2={ANCHO - M.derecha} y1={y(v)} y2={y(v)} stroke="#e2e8f0" />
              <text x={M.izquierda - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#64748b">
                {compacto(v)}
              </text>
            </g>
          ))}
          {serie
            .filter((p) => p.dia === 1 || p.dia % 5 === 0)
            .map((p) => (
              <text key={p.dia} x={x(p.dia)} y={ALTO - 8} textAnchor="middle" fontSize="11" fill="#64748b">
                {p.dia}
              </text>
            ))}
          {hayMeta && (
            <path
              d={linea(serie.map((p) => ({ dia: p.dia, v: p.esperado! })))}
              fill="none"
              stroke={GRIS}
              strokeWidth="2"
              strokeDasharray="5 4"
            />
          )}
          <path
            d={linea(reales.map((p) => ({ dia: p.dia, v: p.acumulado! })))}
            fill="none"
            stroke={INDIGO}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {ultimo && (
            <>
              <circle cx={x(ultimo.dia)} cy={yVendido} r="4" fill={INDIGO} stroke="#fff" strokeWidth="2" />
              <text
                x={x(ultimo.dia) + 8}
                y={yVendido + (hayMeta && Math.abs(yVendido - yEsperado) < 14 && ultimo.dia > serie.length - 4 ? 16 : 4)}
                fontSize="11"
                fontWeight="600"
                fill="#0f172a"
              >
                {compacto(ultimo.acumulado!)}
              </text>
            </>
          )}
          {hayMeta && (
            <text x={x(fin.dia) + 8} y={yEsperado + 4} fontSize="11" fill="#475569">
              Meta {compacto(fin.esperado!)}
            </text>
          )}
          {punto && (
            <line x1={x(punto.dia)} x2={x(punto.dia)} y1={M.arriba} y2={ALTO - M.abajo} stroke="#94a3b8" />
          )}
        </svg>
        {punto && (
          <div
            className="pointer-events-none absolute top-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md"
            style={
              punto.dia > serie.length / 2
                ? { right: `${100 - (x(punto.dia) / ANCHO) * 100 + 2}%` }
                : { left: `${(x(punto.dia) / ANCHO) * 100 + 2}%` }
            }
          >
            <div className="font-semibold text-slate-900">Día {punto.dia}</div>
            <div className="text-slate-700">
              Vendido: {punto.acumulado === null ? "—" : dinero(punto.acumulado)}
            </div>
            {punto.esperado !== null && (
              <div className="text-slate-600">Esperado: {dinero(punto.esperado)}</div>
            )}
          </div>
        )}
      </div>
    </figure>
  );
}

const RELLENO: Record<Estado, string> = {
  verde: "#10b981",
  amarillo: "#fbbf24",
  rojo: "#ef4444",
  en_curso: "#38bdf8",
  sin_meta: "#cbd5e1",
  no_laboral: "#cbd5e1",
};
const NOMBRE_ESTADO: Record<Estado, string> = {
  verde: "Meta cumplida",
  amarillo: "Atención",
  rojo: "Brecha",
  en_curso: "En curso",
  sin_meta: "Sin meta",
  no_laboral: "No laboral",
};

// Cumplimiento diario de actividad (promedio de las actividades con meta).
export function GraficaActividad({ dias }: { dias: PulsoDia[] }) {
  const [activo, setActivo] = useState<number | null>(null);
  const alto = 180;
  const m = { arriba: 12, derecha: 12, abajo: 28, izquierda: 40 };
  const paso = (ANCHO - m.izquierda - m.derecha) / 31;
  const y = (v: number) => alto - m.abajo - (Math.min(v, 100) / 100) * (alto - m.arriba - m.abajo);
  const presentes = [...new Set(dias.map((d) => d.estado))];
  const dia = activo === null ? null : dias[activo];

  return (
    <figure>
      <div className="mb-2 flex flex-wrap gap-4 text-xs text-slate-600">
        {presentes.map((e) => (
          <span key={e} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: RELLENO[e] }} aria-hidden />
            {NOMBRE_ESTADO[e]}
          </span>
        ))}
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${ANCHO} ${alto}`}
          className="w-full"
          role="img"
          aria-label="Cumplimiento diario de actividad del mes"
          onMouseLeave={() => setActivo(null)}
        >
          {[0, 50, 100].map((v) => (
            <g key={v}>
              <line x1={m.izquierda} x2={ANCHO - m.derecha} y1={y(v)} y2={y(v)} stroke="#e2e8f0" />
              <text x={m.izquierda - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#64748b">
                {v}%
              </text>
            </g>
          ))}
          {dias.map((d, i) => {
            const n = i + 1;
            const valor = d.cumplimiento ?? 0;
            const altura = Math.max(2, y(0) - y(valor));
            return (
              <g key={d.fecha} onMouseEnter={() => setActivo(i)}>
                <rect x={m.izquierda + i * paso} y={m.arriba} width={paso} height={alto - m.arriba - m.abajo} fill="transparent" />
                <rect
                  x={m.izquierda + i * paso + 1}
                  y={y(0) - altura}
                  width={paso - 2}
                  height={altura}
                  rx="3"
                  fill={RELLENO[d.estado]}
                  opacity={activo === null || activo === i ? 1 : 0.5}
                />
                {(n === 1 || n % 5 === 0) && (
                  <text x={m.izquierda + i * paso + paso / 2} y={alto - 8} textAnchor="middle" fontSize="11" fill="#64748b">
                    {n}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {dia && activo !== null && (
          <div
            className="pointer-events-none absolute top-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md"
            style={
              activo > 15
                ? { right: `${100 - ((m.izquierda + activo * paso) / ANCHO) * 100 + 1}%` }
                : { left: `${((m.izquierda + (activo + 1) * paso) / ANCHO) * 100 + 1}%` }
            }
          >
            <div className="font-semibold text-slate-900">Día {activo + 1}</div>
            <div className="text-slate-700">
              {dia.cumplimiento === null ? "Sin meta" : `${Math.round(dia.cumplimiento)}% · ${NOMBRE_ESTADO[dia.estado]}`}
            </div>
          </div>
        )}
      </div>
    </figure>
  );
}
