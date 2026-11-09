import { BotonEnviar, Formulario } from "@/components/formulario";
import { obtenerHoy } from "@/lib/datos";
import { ES_FECHA, uno } from "@/lib/parametros";
import {
  ACTIVIDADES,
  NOMBRE_ACTIVIDAD,
  type FilaActividad,
} from "@/lib/pulso/motor";
import { requerirRol } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { guardarActividad } from "./acciones";

export default async function PaginaActividad(
  props: PageProps<"/vendedor/actividad">,
) {
  const usuario = await requerirRol("vendedor");
  const [hoy, params] = await Promise.all([obtenerHoy(), props.searchParams]);
  const pedida = uno(params.fecha) ?? "";
  const fecha = ES_FECHA.test(pedida) && pedida <= hoy ? pedida : hoy;

  const supabase = await crearClienteServidor();
  const { data: registro } = await supabase
    .from("actividades")
    .select("*")
    .eq("vendedor_id", usuario.id)
    .eq("fecha", fecha)
    .maybeSingle<FilaActividad & { notas: Partial<Record<string, string>> | null }>();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-xl font-semibold">Registrar actividad</h1>

      <section className="tarjeta">
        <form className="flex items-end gap-2">
          <div>
            <label htmlFor="fecha" className="etiqueta">
              Día
            </label>
            <input
              id="fecha"
              name="fecha"
              type="date"
              defaultValue={fecha}
              max={hoy}
              required
              className="campo"
            />
          </div>
          <button type="submit" className="boton-secundario py-2">
            Cambiar día
          </button>
        </form>
      </section>

      <section className="tarjeta">
        <p className="mb-4 text-sm text-slate-600">
          Escribe el <strong>total del día</strong> para cada actividad. Si quieres,
          agrega una nota con algo adicional (cliente, contexto, pendiente).
          {registro
            ? " Ya hay un registro para este día; al guardar se actualiza."
            : " Puedes volver y actualizarlo cuantas veces necesites."}
        </p>
        <Formulario
          key={fecha}
          accion={guardarActividad}
          className="flex flex-wrap gap-4"
        >
          <input type="hidden" name="fecha" value={fecha} />
          <div className="grid basis-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ACTIVIDADES.map((a) => (
              <div key={a} className="flex flex-col gap-1.5">
                <label htmlFor={a} className="etiqueta">
                  {NOMBRE_ACTIVIDAD[a]}
                </label>
                <input
                  id={a}
                  name={a}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  defaultValue={registro?.[a] ?? 0}
                  required
                  className="campo"
                />
                <textarea
                  name={`nota_${a}`}
                  rows={2}
                  maxLength={500}
                  defaultValue={registro?.notas?.[a] ?? ""}
                  placeholder="Notas (opcional)"
                  aria-label={`Notas de ${NOMBRE_ACTIVIDAD[a]}`}
                  className="campo resize-y text-sm"
                />
              </div>
            ))}
          </div>
          <BotonEnviar>Guardar actividad</BotonEnviar>
        </Formulario>
      </section>
    </div>
  );
}
