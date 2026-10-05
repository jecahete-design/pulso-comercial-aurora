import { SelectorPeriodo } from "@/components/selector-periodo";
import { VistaPulso } from "@/components/vista-pulso";
import { cargarVista, obtenerConfiguracion, periodoActual } from "@/lib/datos";
import { nombrePeriodo } from "@/lib/formato";
import { uno } from "@/lib/parametros";
import { leerPeriodo } from "@/lib/pulso/fechas";
import { requerirRol } from "@/lib/sesion";

export default async function PaginaDesempeno(
  props: PageProps<"/vendedor/desempeno">,
) {
  const usuario = await requerirRol("vendedor");
  const [config, actual, params] = await Promise.all([
    obtenerConfiguracion(),
    periodoActual(),
    props.searchParams,
  ]);
  const periodo = leerPeriodo(uno(params.periodo), actual);
  const vista = await cargarVista(usuario.id, periodo);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-semibold">
          Mi desempeño · {nombrePeriodo(periodo)}
        </h1>
        <SelectorPeriodo periodo={periodo} maximo={actual} />
      </div>
      <VistaPulso vista={vista} moneda={config.moneda} />
    </div>
  );
}
