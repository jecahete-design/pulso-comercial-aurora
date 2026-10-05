import { BotonEnviar, Formulario } from "@/components/formulario";
import { requerirRol } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { Producto } from "@/lib/tipos";
import {
  actualizarProducto,
  cambiarEstadoProducto,
  crearProducto,
} from "./acciones";

export default async function PaginaProductos() {
  await requerirRol("gerente");
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("productos")
    .select("id, nombre, activo")
    .order("nombre")
    .returns<Producto[]>();
  const productos = data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Productos</h1>

      <section className="tarjeta">
        <h2 className="mb-3 font-medium">Nuevo producto</h2>
        <Formulario
          accion={crearProducto}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="min-w-60 flex-1">
            <label htmlFor="nombre-nuevo" className="etiqueta">
              Nombre
            </label>
            <input
              id="nombre-nuevo"
              name="nombre"
              required
              maxLength={120}
              className="campo"
            />
          </div>
          <BotonEnviar>Crear</BotonEnviar>
        </Formulario>
      </section>

      <section className="tarjeta">
        <h2 className="mb-3 font-medium">Catálogo</h2>
        {productos.length === 0 ? (
          <p className="text-sm text-slate-600">
            Todavía no hay productos. Crea el primero arriba.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {productos.map((p) => (
              <li key={p.id} className="flex flex-wrap items-start gap-3 py-3">
                <Formulario
                  accion={actualizarProducto}
                  className="flex min-w-60 flex-1 flex-wrap items-center gap-2"
                >
                  <input type="hidden" name="id" value={p.id} />
                  <input
                    name="nombre"
                    defaultValue={p.nombre}
                    required
                    maxLength={120}
                    aria-label={`Nombre de ${p.nombre}`}
                    className="campo max-w-sm flex-1"
                  />
                  <BotonEnviar className="boton-secundario">Guardar</BotonEnviar>
                </Formulario>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    p.activo
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {p.activo ? "Activo" : "Inactivo"}
                </span>
                <form action={cambiarEstadoProducto}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="activo" value={String(!p.activo)} />
                  <button type="submit" className="boton-secundario">
                    {p.activo ? "Desactivar" : "Activar"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
