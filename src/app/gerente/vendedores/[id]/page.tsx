import Link from "next/link";
import { notFound } from "next/navigation";
import { SelectorPeriodo } from "@/components/selector-periodo";
import { VistaPulso } from "@/components/vista-pulso";
import { cargarNotas, cargarVista, obtenerConfiguracion, periodoActual } from "@/lib/datos";
import { fechaCorta, nombrePeriodo } from "@/lib/formato";
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
  const [vista, notas] = await Promise.all([
    cargarVista(id, periodo),
    cargarNotas(id, periodo),
  ]);

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
      <section className="tarjeta">
        <h2 className="mb-3 font-medium">Notas de {vendedor.nombre}</h2>
        {notas.length === 0 ? (
          <p className="text-sm text-slate-600">No dejó notas en este período.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {notas.map((n, i) => (
              <li key={i} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
                <span className="w-24 shrink-0 text-slate-500">{fechaCorta(n.fecha)}</span>
                <span className="w-48 shrink-0 font-medium">{n.campo}</span>
                <span className="whitespace-pre-line text-slate-700">{n.texto}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
