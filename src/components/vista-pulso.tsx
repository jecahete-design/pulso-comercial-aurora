import { GraficaActividad, GraficaVentas } from "@/components/graficas";
import { COLOR_BARRA, Semaforo } from "@/components/semaforo";
import { dinero, fechaCorta, nombrePeriodo, porcentaje } from "@/lib/formato";
import {
  type LecturaActividad,
  type PulsoResultados,
  type VistaPulso as Vista,
  NOMBRE_ACTIVIDAD,
} from "@/lib/pulso/motor";

export function Indicador({
  titulo,
  valor,
  nota,
}: {
  titulo: string;
  valor: string;
  nota?: string;
}) {
  return (
    <div className="tarjeta">
      <div className="text-sm text-slate-600">{titulo}</div>
      <div className="mt-1 text-2xl font-semibold">{valor}</div>
      {nota && <div className="mt-1 text-xs text-slate-500">{nota}</div>}
    </div>
  );
}

export function textoBrecha(r: PulsoResultados, moneda: string) {
  if (r.brecha === null) return "—";
  return r.brecha > 0 ? dinero(r.brecha, moneda) : "Meta alcanzada";
}

export function IndicadoresResultados({
  r,
  moneda,
}: {
  r: PulsoResultados;
  moneda: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Indicador
        titulo="Meta mensual"
        valor={r.meta === null ? "Sin meta" : dinero(r.meta, moneda)}
      />
      <Indicador titulo="Vendido" valor={dinero(r.vendido, moneda)} />
      <Indicador
        titulo="% cumplimiento"
        valor={porcentaje(r.cumplimiento)}
        nota={`Avance esperado a la fecha: ${porcentaje(r.esperado)}`}
      />
      <Indicador
        titulo="Brecha"
        valor={textoBrecha(r, moneda)}
        nota={
          r.brecha !== null && r.brecha < 0
            ? `Superada por ${dinero(-r.brecha, moneda)}`
            : undefined
        }
      />
    </div>
  );
}

function FilasActividad({
  detalle,
  textoVerde,
}: {
  detalle: LecturaActividad[];
  textoVerde?: string;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {detalle.map((l) => (
        <li key={l.actividad}>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium">{NOMBRE_ACTIVIDAD[l.actividad]}</span>
            <span className="flex items-center gap-2 text-slate-600">
              {l.meta === null
                ? `${l.realizado}`
                : `${l.realizado} de ${l.meta} · ${porcentaje(l.cumplimiento)}`}
              <Semaforo estado={l.estado} textoVerde={textoVerde} />
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${COLOR_BARRA[l.estado]}`}
              style={{ width: `${Math.min(l.cumplimiento ?? 0, 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// Bloques comunes al dashboard del vendedor, su histórico y el detalle que ve
// el gerente: resultados, actividad diaria y semanal, gráficas y ventas.
export function VistaPulso({ vista, moneda }: { vista: Vista; moneda: string }) {
  const { resultados: r, dia, semana } = vista;
  return (
    <div className="flex flex-col gap-6">
      <section className="tarjeta flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Pulso de Actividad</span>
          {dia && (
            <>
              <span className="text-slate-500">Hoy</span>
              <Semaforo estado={dia.estado} textoVerde="Meta cumplida" />
            </>
          )}
          <span className="text-slate-500">Semana</span>
          <Semaforo estado={semana.estado} />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Pulso de Resultados</span>
          <Semaforo estado={r.estado} />
        </div>
      </section>

      <IndicadoresResultados r={r} moneda={moneda} />

      <div className="grid gap-6 lg:grid-cols-2">
        {dia && (
          <section className="tarjeta">
            <h2 className="mb-4 font-medium">
              Actividad de hoy{" "}
              <span className="font-normal text-slate-500">
                · {fechaCorta(dia.fecha)}
              </span>
            </h2>
            <FilasActividad detalle={dia.detalle} textoVerde="Meta cumplida" />
          </section>
        )}
        <section className="tarjeta">
          <h2 className="mb-1 font-medium">
            Actividad semanal{" "}
            <span className="font-normal text-slate-500">
              · {fechaCorta(semana.lunes)} al {fechaCorta(semana.domingo)}
            </span>
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            Ritmo esperado a la fecha: {porcentaje(semana.esperado)} de la meta
            semanal
          </p>
          <FilasActividad detalle={semana.detalle} />
        </section>
      </div>

      <section className="tarjeta">
        <h2 className="mb-3 font-medium">
          Ventas vs. avance esperado · {nombrePeriodo(vista.periodo)}
        </h2>
        <GraficaVentas serie={vista.serieVentas} moneda={moneda} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="tarjeta">
          <h2 className="mb-3 font-medium">Cumplimiento diario de actividad</h2>
          <GraficaActividad dias={vista.dias} />
        </section>
        <section className="tarjeta">
          <h2 className="mb-3 font-medium">Semanas del período</h2>
          {vista.semanas.length === 0 ? (
            <p className="text-sm text-slate-600">
              Aún no ha comenzado ninguna semana en este período.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-2 font-medium">Semana</th>
                  <th className="pb-2 text-right font-medium">Cumplimiento</th>
                  <th className="pb-2 text-right font-medium">Esperado</th>
                  <th className="pb-2 text-right font-medium">Ritmo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vista.semanas.map((s) => (
                  <tr key={s.lunes}>
                    <td className="py-2">
                      {fechaCorta(s.lunes)} – {fechaCorta(s.domingo)}
                    </td>
                    <td className="py-2 text-right">{porcentaje(s.cumplimiento)}</td>
                    <td className="py-2 text-right">{porcentaje(s.esperado)}</td>
                    <td className="py-2 text-right">
                      <Semaforo estado={s.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <section className="tarjeta">
        <h2 className="mb-3 font-medium">Ventas cerradas</h2>
        {vista.ventas.length === 0 ? (
          <p className="text-sm text-slate-600">
            No hay ventas registradas en este período.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-2 font-medium">Fecha</th>
                  <th className="pb-2 font-medium">Cliente</th>
                  <th className="pb-2 font-medium">Producto</th>
                  <th className="pb-2 text-right font-medium">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vista.ventas.map((v) => (
                  <tr key={v.id}>
                    <td className="py-2 whitespace-nowrap">{fechaCorta(v.fecha)}</td>
                    <td className="py-2">{v.cliente}</td>
                    <td className="py-2">{v.producto}</td>
                    <td className="py-2 text-right">{dinero(v.monto, moneda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
