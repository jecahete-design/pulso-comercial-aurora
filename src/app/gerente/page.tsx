import { SelectorPeriodo } from "@/components/selector-periodo";
import { TablaEquipo } from "@/components/tabla-equipo";
import { cargarEquipo, obtenerConfiguracion, periodoActual } from "@/lib/datos";
import { nombrePeriodo } from "@/lib/formato";
import { uno } from "@/lib/parametros";
import { leerPeriodo, textoPeriodo } from "@/lib/pulso/fechas";
import { requerirRol } from "@/lib/sesion";

export default async function DashboardGerencial(props: PageProps<"/gerente">) {
  await requerirRol("gerente");
  const [config, actual, params] = await Promise.all([
    obtenerConfiguracion(),
    periodoActual(),
    props.searchParams,
  ]);
  const periodo = leerPeriodo(uno(params.periodo), actual);
  const equipo = await cargarEquipo(periodo);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-semibold">
          Dashboard gerencial · {nombrePeriodo(periodo)}
        </h1>
        <SelectorPeriodo periodo={periodo} maximo={actual} />
      </div>
      <TablaEquipo
        filas={equipo.map((f) => ({
          id: f.vendedor.id,
          nombre: f.vendedor.nombre,
          vista: f.vista,
        }))}
        moneda={config.moneda}
        enlace={(id) =>
          `/gerente/vendedores/${id}?periodo=${textoPeriodo(periodo)}`
        }
      />
    </div>
  );
}
