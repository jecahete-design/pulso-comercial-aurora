import Link from "next/link";
import { Semaforo } from "@/components/semaforo";
import { Indicador } from "@/components/vista-pulso";
import { dinero, porcentaje } from "@/lib/formato";
import { calcularResultados, type VistaPulso } from "@/lib/pulso/motor";

export type FilaTabla = { id: string; nombre: string; vista: VistaPulso };

// Totales del equipo y tabla "Pulso del equipo" del dashboard gerencial.
// La meta del equipo es la suma de las metas individuales del período.
export function TablaEquipo({
  filas,
  moneda,
  enlace,
}: {
  filas: FilaTabla[];
  moneda: string;
  enlace: (id: string) => string;
}) {
  const vendido = filas.reduce((s, f) => s + f.vista.resultados.vendido, 0);
  const meta = filas.reduce((s, f) => s + (f.vista.resultados.meta ?? 0), 0);
  const total =
    filas.length > 0
      ? calcularResultados(vendido, meta || null, filas[0].vista.periodo, filas[0].vista.corte)
      : null;

  return (
    <div className="flex flex-col gap-6">
      {total && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Indicador
            titulo="Meta total"
            valor={total.meta === null ? "Sin meta" : dinero(total.meta, moneda)}
          />
          <Indicador titulo="Ventas" valor={dinero(total.vendido, moneda)} />
          <Indicador
            titulo="% cumplimiento"
            valor={porcentaje(total.cumplimiento)}
            nota={`Avance esperado a la fecha: ${porcentaje(total.esperado)}`}
          />
          <Indicador
            titulo="Brecha"
            valor={
              total.brecha === null
                ? "—"
                : total.brecha > 0
                  ? dinero(total.brecha, moneda)
                  : "Meta alcanzada"
            }
          />
        </div>
      )}

      <section className="tarjeta">
        <h2 className="mb-3 font-medium">Pulso del equipo</h2>
        {filas.length === 0 ? (
          <p className="text-sm text-slate-600">
            Todavía no hay vendedores activos. Créalos en Usuarios.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-2 font-medium">Vendedor</th>
                  <th className="pb-2 font-medium">Actividad hoy</th>
                  <th className="pb-2 font-medium">Actividad semana</th>
                  <th className="pb-2 text-right font-medium">Ventas</th>
                  <th className="pb-2 text-right font-medium">Meta</th>
                  <th className="pb-2 text-right font-medium">Cumplimiento</th>
                  <th className="pb-2 pl-4 font-medium">Resultados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filas.map(({ id, nombre, vista }) => (
                  <tr key={id}>
                    <td className="py-2.5">
                      <Link
                        href={enlace(id)}
                        className="font-medium text-indigo-700 hover:underline"
                      >
                        {nombre}
                      </Link>
                    </td>
                    <td className="py-2.5">
                      {vista.dia ? (
                        <Semaforo estado={vista.dia.estado} textoVerde="Meta cumplida" />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <Semaforo estado={vista.semana.estado} />
                    </td>
                    <td className="py-2.5 text-right">
                      {dinero(vista.resultados.vendido, moneda)}
                    </td>
                    <td className="py-2.5 text-right">
                      {vista.resultados.meta === null
                        ? "—"
                        : dinero(vista.resultados.meta, moneda)}
                    </td>
                    <td className="py-2.5 text-right">
                      {porcentaje(vista.resultados.cumplimiento)}
                    </td>
                    <td className="py-2.5 pl-4">
                      <Semaforo estado={vista.resultados.estado} />
                    </td>
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
