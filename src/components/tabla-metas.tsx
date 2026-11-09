"use client";

import { useState } from "react";

// Tablas de metas con el cálculo en vivo: el gerente escribe solo la meta
// diaria (o el incremento diario) y ve al momento la semanal y la mensual.

export type FilaMeta = {
  actividad: string;
  nombre: string;
  general: number | null; // meta diaria general (solo en modo ajuste)
  valor: number | null; // lo que ya está guardado en el campo
};

function aNumero(texto: string) {
  const n = Number(texto);
  return texto.trim() === "" || !Number.isFinite(n) || n < 0 ? 0 : n;
}

const entero = (n: number) => n.toLocaleString("es-PA");

export function TablaMetasActividad({
  modo,
  filas,
  diasSemana,
  diasMes,
}: {
  modo: "general" | "ajuste";
  filas: FilaMeta[];
  diasSemana: number;
  diasMes: number;
}) {
  const [valores, setValores] = useState(() =>
    Object.fromEntries(filas.map((f) => [f.actividad, f.valor?.toString() ?? ""])),
  );
  const prefijo = modo === "general" ? "diaria" : "incremento";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="pb-2 pr-3 font-medium">Actividad</th>
            {modo === "ajuste" && <th className="pb-2 pr-3 font-medium">General diaria</th>}
            <th className="pb-2 pr-3 font-medium">
              {modo === "general" ? "Meta diaria" : "+ Incremento diario"}
            </th>
            {modo === "ajuste" && <th className="pb-2 pr-3 font-medium">Total diario</th>}
            <th className="pb-2 pr-3 font-medium">Semanal (× {diasSemana})</th>
            <th className="pb-2 font-medium">Mensual (× {diasMes})</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const diaria =
              (modo === "ajuste" ? (f.general ?? 0) : 0) + aNumero(valores[f.actividad]);
            const vacio = diaria === 0;
            return (
              <tr key={f.actividad}>
                <td className="py-1.5 pr-3">{f.nombre}</td>
                {modo === "ajuste" && (
                  <td className="py-1.5 pr-3 text-slate-500">
                    {f.general === null ? "Sin meta" : entero(f.general)}
                  </td>
                )}
                <td className="py-1.5 pr-3">
                  <input
                    name={`${prefijo}_${f.actividad}`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    value={valores[f.actividad]}
                    onChange={(e) =>
                      setValores((v) => ({ ...v, [f.actividad]: e.target.value }))
                    }
                    aria-label={`${modo === "general" ? "Meta diaria" : "Incremento diario"} de ${f.nombre}`}
                    className="campo max-w-28"
                  />
                </td>
                {modo === "ajuste" && (
                  <td className="py-1.5 pr-3 font-medium">{vacio ? "—" : entero(diaria)}</td>
                )}
                <td className="py-1.5 pr-3 tabular-nums">
                  {vacio ? "—" : entero(diaria * diasSemana)}
                </td>
                <td className="py-1.5 tabular-nums">{vacio ? "—" : entero(diaria * diasMes)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function CampoAjusteVentas({
  general,
  valor,
  moneda,
}: {
  general: number | null;
  valor: number | null;
  moneda: string;
}) {
  const [texto, setTexto] = useState(valor?.toString() ?? "");
  const total = (general ?? 0) + aNumero(texto);
  const dinero = (n: number) =>
    new Intl.NumberFormat("es-PA", {
      style: "currency",
      currency: moneda,
      currencyDisplay: "narrowSymbol",
    }).format(n);
  return (
    <div className="flex flex-wrap items-end gap-4 text-sm">
      <div>
        <span className="etiqueta">Meta general</span>
        <p className="py-2 text-slate-600">{general === null ? "Sin meta" : dinero(general)}</p>
      </div>
      <div>
        <label htmlFor="incremento_ventas" className="etiqueta">
          + Incremento ({moneda})
        </label>
        <input
          id="incremento_ventas"
          name="incremento_ventas"
          type="number"
          inputMode="decimal"
          min={0.01}
          step={0.01}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="campo max-w-40"
        />
      </div>
      <div>
        <span className="etiqueta">Meta del mes para esta persona</span>
        <p className="py-2 font-semibold">{total === 0 ? "Sin meta" : dinero(total)}</p>
      </div>
    </div>
  );
}
