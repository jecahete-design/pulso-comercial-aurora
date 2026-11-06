import { BotonEnviar, Formulario } from "@/components/formulario";
import { listarVendedores, obtenerConfiguracion, periodoActual } from "@/lib/datos";
import { nombrePeriodo } from "@/lib/formato";
import { uno } from "@/lib/parametros";
import {
  type Periodo,
  leerPeriodo,
  periodoAnterior,
  textoPeriodo,
} from "@/lib/pulso/fechas";
import {
  ACTIVIDADES,
  NOMBRE_ACTIVIDAD,
  type FilaMetaActividad,
} from "@/lib/pulso/motor";
import { requerirRol } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { guardarMetas } from "./acciones";

const SIN_LIMITE: Periodo = { anio: 2100, mes: 12 };

async function leerMetas(vendedorId: string, periodo: Periodo) {
  const supabase = await crearClienteServidor();
  const [ventas, actividad] = await Promise.all([
    supabase
      .from("metas_ventas")
      .select("monto")
      .eq("vendedor_id", vendedorId)
      .eq("anio", periodo.anio)
      .eq("mes", periodo.mes)
      .maybeSingle<{ monto: number }>(),
    supabase
      .from("metas_actividad")
      .select("anio, mes, actividad, meta_diaria, meta_semanal")
      .eq("vendedor_id", vendedorId)
      .eq("anio", periodo.anio)
      .eq("mes", periodo.mes)
      .returns<FilaMetaActividad[]>(),
  ]);
  return { monto: ventas.data?.monto ?? null, actividad: actividad.data ?? [] };
}

export default async function PaginaMetas(props: PageProps<"/gerente/metas">) {
  await requerirRol("gerente");
  const [vendedores, config, actual, params] = await Promise.all([
    listarVendedores(),
    obtenerConfiguracion(),
    periodoActual(),
    props.searchParams,
  ]);
  const pedido = uno(params.periodo);
  const periodo = pedido ? leerPeriodo(pedido, SIN_LIMITE) : actual;
  const vendedor =
    vendedores.find((v) => v.id === uno(params.vendedor)) ?? vendedores[0];

  if (!vendedor) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Configuración de metas</h1>
        <p className="tarjeta text-sm text-slate-600">
          Todavía no hay desarrolladores de negocios activos. Créalos primero en
          Usuarios.
        </p>
      </div>
    );
  }

  let metas = await leerMetas(vendedor.id, periodo);
  const sinGuardar = metas.monto === null && metas.actividad.length === 0;
  // Si el período está vacío se proponen las metas del mes anterior.
  let sugeridas = false;
  if (sinGuardar) {
    const previas = await leerMetas(vendedor.id, periodoAnterior(periodo));
    if (previas.monto !== null || previas.actividad.length > 0) {
      metas = previas;
      sugeridas = true;
    }
  }
  const de = (a: string) => metas.actividad.find((m) => m.actividad === a);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-xl font-semibold">Configuración de metas</h1>

      <section className="tarjeta">
        <form className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1">
            <label htmlFor="vendedor" className="etiqueta">
              Desarrollador de Negocios
            </label>
            <select
              id="vendedor"
              name="vendedor"
              defaultValue={vendedor.id}
              className="campo"
            >
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="periodo" className="etiqueta">
              Período
            </label>
            <input
              id="periodo"
              name="periodo"
              type="month"
              defaultValue={textoPeriodo(periodo)}
              required
              className="campo"
            />
          </div>
          <button type="submit" className="boton-secundario py-2">
            Ver metas
          </button>
        </form>
      </section>

      <section className="tarjeta">
        <h2 className="font-medium">
          {vendedor.nombre} · {nombrePeriodo(periodo)}
        </h2>
        {sugeridas && (
          <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Este período aún no tiene metas. Se muestran las del mes anterior
            como sugerencia; no quedan vigentes hasta que pulses Guardar metas.
          </p>
        )}
        {sinGuardar && !sugeridas && (
          <p className="mt-2 text-sm text-slate-600">
            Este período aún no tiene metas configuradas.
          </p>
        )}
        <Formulario
          key={`${vendedor.id}-${textoPeriodo(periodo)}`}
          accion={guardarMetas}
          className="mt-4 flex flex-col gap-5"
        >
          <input type="hidden" name="vendedor_id" value={vendedor.id} />
          <input type="hidden" name="anio" value={periodo.anio} />
          <input type="hidden" name="mes" value={periodo.mes} />

          <fieldset>
            <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Resultados
            </legend>
            <label htmlFor="monto" className="etiqueta">
              Meta mensual de ventas ({config.moneda})
            </label>
            <input
              id="monto"
              name="monto"
              type="number"
              inputMode="decimal"
              min={0.01}
              step={0.01}
              defaultValue={metas.monto ?? ""}
              className="campo max-w-xs"
            />
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Actividades
            </legend>
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-2 font-medium">Actividad</th>
                  <th className="pb-2 font-medium">Meta diaria</th>
                  <th className="pb-2 font-medium">Meta semanal</th>
                </tr>
              </thead>
              <tbody>
                {ACTIVIDADES.map((a) => (
                  <tr key={a}>
                    <td className="py-1.5 pr-3">{NOMBRE_ACTIVIDAD[a]}</td>
                    {(["diaria", "semanal"] as const).map((tipo) => (
                      <td key={tipo} className="py-1.5 pr-3">
                        <input
                          name={`${tipo}_${a}`}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          step={1}
                          defaultValue={de(a)?.[`meta_${tipo}`] ?? ""}
                          aria-label={`Meta ${tipo} de ${NOMBRE_ACTIVIDAD[a]}`}
                          className="campo max-w-32"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-slate-500">
              Deja un campo vacío si esa actividad no tiene meta para este
              desarrollador de negocios.
            </p>
          </fieldset>

          <div>
            <BotonEnviar>Guardar metas</BotonEnviar>
          </div>
        </Formulario>
      </section>
    </div>
  );
}
