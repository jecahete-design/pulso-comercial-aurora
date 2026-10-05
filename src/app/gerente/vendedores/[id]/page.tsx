import Link from "next/link";
import { notFound } from "next/navigation";
import { SelectorPeriodo } from "@/components/selector-periodo";
import { VistaPulso } from "@/components/vista-pulso";
import { cargarVista, obtenerConfiguracion, periodoActual } from "@/lib/datos";
import { nombrePeriodo } from "@/lib/formato";
import { uno } from "@/lib/parametros";
import { leerPeriodo, textoPeriodo } from "@/lib/pulso/fechas";
import { requerirRol } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export default async function DetalleVendedor(
  props: PageProps<"/gerente/vendedores/[id]">,
) {
  await requerirRol("gerente");
  const [{ id }, params, config, actual, supabase] = await Promise.all([
    props.params,
    props.searchParams,
    obtenerConfiguracion(),
    periodoActual(),
    crearClienteServidor(),
  ]);
  const { data: vendedor } = await supabase
    .from("usuarios")
    .select("nombre, activo")
    .eq("id", id)
    .eq("rol", "vendedor")
    .maybeSingle<{ nombre: string; activo: boolean }>();
  if (!vendedor) notFound();

  const periodo = leerPeriodo(uno(params.periodo), actual);
  const vista = await cargarVista(id, periodo);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href={`/gerente?periodo=${textoPeriodo(periodo)}`}
            className="text-sm text-indigo-700 hover:underline"
          >
            ← Pulso del equipo
          </Link>
          <h1 className="text-xl font-semibold">
            {vendedor.nombre} · {nombrePeriodo(periodo)}
            {!vendedor.activo && (
              <span className="ml-2 text-sm font-normal text-slate-500">
                (inactivo)
              </span>
            )}
          </h1>
        </div>
        <div className="flex items-end gap-2">
          <SelectorPeriodo periodo={periodo} maximo={actual} />
          <Link
            href={`/gerente/metas?vendedor=${id}&periodo=${textoPeriodo(periodo)}`}
            className="boton-secundario py-2"
          >
            Ver metas
          </Link>
        </div>
      </div>
      <VistaPulso vista={vista} moneda={config.moneda} />
    </div>
  );
}
