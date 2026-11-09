import Link from "next/link";
import { BotonEnviar, Formulario } from "@/components/formulario";
import { CampoAjusteVentas, TablaMetasActividad } from "@/components/tabla-metas";
import {
  leerMetas,
  listarVendedores,
  metasEfectivas,
  obtenerConfiguracion,
  periodoActual,
} from "@/lib/datos";
import { dinero, nombrePeriodo } from "@/lib/formato";
import { uno } from "@/lib/parametros";
import {
  type Periodo,
  leerPeriodo,
  mismoPeriodo,
  periodoAnterior,
  textoPeriodo,
} from "@/lib/pulso/fechas";
import { ACTIVIDADES, NOMBRE_ACTIVIDAD, diasLaboralesDelMes } from "@/lib/pulso/motor";
import { requerirRol } from "@/lib/sesion";
import { guardarAjustes, guardarMetasGenerales } from "./acciones";

const SIN_LIMITE: Periodo = { anio: 2100, mes: 12 };
const NOMBRE_DIA = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

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
  const previo = periodoAnterior(periodo);
  const vendedor = vendedores.find((v) => v.id === uno(params.vendedor)) ?? vendedores[0];
  const ids = vendedores.map((v) => v.id);

  const metas = await leerMetas([periodo, previo], ids);
  const de = <T extends Periodo>(filas: T[], p: Periodo) =>
    filas.filter((f) => mismoPeriodo(f, p));

  // Si el período no tiene metas generales se proponen las del mes anterior.
  const vacio =
    de(metas.generalesVentas, periodo).length === 0 &&
    de(metas.generalesActividad, periodo).length === 0;
  const hayPrevias =
    de(metas.generalesVentas, previo).length > 0 ||
    de(metas.generalesActividad, previo).length > 0;
  const sugeridas = vacio && hayPrevias;
  const fuente = sugeridas ? previo : periodo;

  const generalVentas = de(metas.generalesVentas, fuente)[0]?.monto ?? null;
  const generalDiaria = (a: string) =>
    de(metas.generalesActividad, fuente).find((m) => m.actividad === a)?.meta_diaria ?? null;

  const diasSemana = config.dias_laborales.length;
  const diasMes = diasLaboralesDelMes(periodo, config.dias_laborales);
  const textoDias =
    config.dias_laborales.join() === "1,2,3,4,5"
      ? "lunes a viernes"
      : config.dias_laborales.map((d) => NOMBRE_DIA[d]).join(", ");

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <h1 className="text-xl font-semibold">Configuración de metas</h1>

      <section className="tarjeta flex flex-wrap items-end justify-between gap-4">
        <form className="flex items-end gap-2">
          {vendedor && <input type="hidden" name="vendedor" value={vendedor.id} />}
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
        <p className="text-sm text-slate-600">
          Jornada: <strong>{config.horas_jornada} h</strong> diarias, {textoDias} (
          {config.horas_jornada * diasSemana} h por semana). {nombrePeriodo(periodo)} tiene{" "}
          <strong>{diasMes} días laborales</strong>.
        </p>
      </section>

      <section className="tarjeta">
        <h2 className="font-medium">Metas generales · {nombrePeriodo(periodo)}</h2>
        <p className="mt-1 text-sm text-slate-600">
          Aplican a todos los Desarrolladores de Negocios. Escribe solo la meta diaria: la
          semanal y la mensual se calculan solas.
        </p>
        {sugeridas && (
          <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Este período aún no tiene metas. Se muestran las del mes anterior como
            sugerencia; no quedan vigentes hasta que pulses Guardar metas generales.
          </p>
        )}
        <Formulario
          key={`general-${textoPeriodo(periodo)}`}
          accion={guardarMetasGenerales}
          className="mt-4 flex flex-col gap-5"
        >
          <input type="hidden" name="anio" value={periodo.anio} />
          <input type="hidden" name="mes" value={periodo.mes} />
          <div>
            <label htmlFor="monto" className="etiqueta">
              Meta mensual de ventas por persona ({config.moneda})
            </label>
            <input
              id="monto"
              name="monto"
              type="number"
              inputMode="decimal"
              min={0.01}
              step={0.01}
              defaultValue={generalVentas ?? ""}
              className="campo max-w-xs"
            />
          </div>
          <TablaMetasActividad
            modo="general"
            diasSemana={diasSemana}
            diasMes={diasMes}
            filas={ACTIVIDADES.map((a) => ({
              actividad: a,
              nombre: NOMBRE_ACTIVIDAD[a],
              general: null,
              valor: generalDiaria(a),
            }))}
          />
          <p className="text-xs text-slate-500">
            Deja vacía una actividad si no tiene meta este mes.
          </p>
          <div>
            <BotonEnviar>Guardar metas generales</BotonEnviar>
          </div>
        </Formulario>
      </section>

      {vendedor ? (
        <>
          <ResumenEquipo
            vendedores={vendedores}
            seleccionado={vendedor.id}
            periodo={periodo}
            moneda={config.moneda}
            metas={metas}
          />
          <AjusteIndividual
            vendedor={vendedor}
            vendedores={vendedores}
            periodo={periodo}
            moneda={config.moneda}
            diasSemana={diasSemana}
            diasMes={diasMes}
            metas={metas}
            sugeridas={sugeridas}
            generalVentas={generalVentas}
            generalDiaria={generalDiaria}
          />
        </>
      ) : (
        <p className="tarjeta text-sm text-slate-600">
          Todavía no hay Desarrolladores de Negocios activos. Créalos en Usuarios para
          asignarles ajustes individuales.
        </p>
      )}
    </div>
  );
}

type Vendedor = Awaited<ReturnType<typeof listarVendedores>>[number];
type Metas = Awaited<ReturnType<typeof leerMetas>>;

function ResumenEquipo({
  vendedores,
  seleccionado,
  periodo,
  moneda,
  metas,
}: {
  vendedores: Vendedor[];
  seleccionado: string;
  periodo: Periodo;
  moneda: string;
  metas: Metas;
}) {
  return (
    <section className="tarjeta">
      <h2 className="mb-3 font-medium">Meta de cada persona · {nombrePeriodo(periodo)}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="pb-2 pr-3 font-medium">Desarrollador de Negocios</th>
              <th className="pb-2 pr-3 text-right font-medium">Meta de ventas</th>
              <th className="pb-2 pr-3 font-medium">Ajuste</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vendedores.map((v) => {
              const efectivas = metasEfectivas(metas, v.id, [periodo]);
              const conAjuste =
                metas.ajustesVentas.some(
                  (a) => a.vendedor_id === v.id && mismoPeriodo(a, periodo),
                ) ||
                metas.ajustesActividad.some(
                  (a) => a.vendedor_id === v.id && mismoPeriodo(a, periodo),
                );
              const meta = efectivas.metasVentas[0]?.monto;
              return (
                <tr key={v.id} className={v.id === seleccionado ? "bg-indigo-50/60" : ""}>
                  <td className="py-2 pr-3">{v.nombre}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {meta === undefined ? "Sin meta" : dinero(meta, moneda)}
                  </td>
                  <td className="py-2 pr-3">
                    {conAjuste ? (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800">
                        Con incremento
                      </span>
                    ) : (
                      <span className="text-slate-500">Solo general</span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    <Link
                      href={`/gerente/metas?vendedor=${v.id}&periodo=${textoPeriodo(periodo)}#ajuste`}
                      className="text-indigo-700 hover:underline"
                    >
                      Ajustar
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AjusteIndividual({
  vendedor,
  vendedores,
  periodo,
  moneda,
  diasSemana,
  diasMes,
  metas,
  sugeridas,
  generalVentas,
  generalDiaria,
}: {
  vendedor: Vendedor;
  vendedores: Vendedor[];
  periodo: Periodo;
  moneda: string;
  diasSemana: number;
  diasMes: number;
  metas: Metas;
  sugeridas: boolean;
  generalVentas: number | null;
  generalDiaria: (a: string) => number | null;
}) {
  // En un período nuevo se proponen también los ajustes del mes anterior.
  const fuente = sugeridas ? periodoAnterior(periodo) : periodo;
  const propio = <T extends Periodo & { vendedor_id: string }>(filas: T[]) =>
    filas.filter((f) => f.vendedor_id === vendedor.id && mismoPeriodo(f, fuente));
  const incrementoVentas = propio(metas.ajustesVentas)[0]?.incremento ?? null;
  const incrementoDiario = (a: string) =>
    propio(metas.ajustesActividad).find((m) => m.actividad === a)?.incremento_diario ?? null;

  return (
    <section id="ajuste" className="tarjeta scroll-mt-4">
      <h2 className="font-medium">Ajuste individual</h2>
      <p className="mt-1 text-sm text-slate-600">
        Súbele la meta a una persona en particular. El incremento se suma a la meta general
        solo para ella; deja vacío lo que no cambia.
      </p>
      <form className="mt-4 flex items-end gap-2">
        <input type="hidden" name="periodo" value={textoPeriodo(periodo)} />
        <div className="min-w-48">
          <label htmlFor="vendedor" className="etiqueta">
            Desarrollador de Negocios
          </label>
          <select id="vendedor" name="vendedor" defaultValue={vendedor.id} className="campo">
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="boton-secundario py-2">
          Elegir
        </button>
      </form>

      <Formulario
        key={`ajuste-${vendedor.id}-${textoPeriodo(periodo)}`}
        accion={guardarAjustes}
        className="mt-5 flex flex-col gap-5"
      >
        <input type="hidden" name="vendedor_id" value={vendedor.id} />
        <input type="hidden" name="anio" value={periodo.anio} />
        <input type="hidden" name="mes" value={periodo.mes} />
        <h3 className="text-sm font-semibold">
          {vendedor.nombre} · {nombrePeriodo(periodo)}
        </h3>
        <CampoAjusteVentas general={generalVentas} valor={incrementoVentas} moneda={moneda} />
        <TablaMetasActividad
          modo="ajuste"
          diasSemana={diasSemana}
          diasMes={diasMes}
          filas={ACTIVIDADES.map((a) => ({
            actividad: a,
            nombre: NOMBRE_ACTIVIDAD[a],
            general: generalDiaria(a),
            valor: incrementoDiario(a),
          }))}
        />
        <div>
          <BotonEnviar>Guardar ajuste</BotonEnviar>
        </div>
      </Formulario>
    </section>
  );
}
