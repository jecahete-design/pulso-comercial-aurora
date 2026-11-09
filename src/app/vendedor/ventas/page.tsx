import { BotonEnviar, Formulario } from "@/components/formulario";
import { cargarVista, obtenerConfiguracion, obtenerHoy } from "@/lib/datos";
import { dinero, fechaCorta, nombrePeriodo } from "@/lib/formato";
import { periodoDe } from "@/lib/pulso/fechas";
import { requerirRol } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { Producto } from "@/lib/tipos";
import { eliminarVenta, registrarVenta } from "./acciones";

export default async function PaginaVentas() {
  const usuario = await requerirRol("vendedor");
  const [config, hoy, supabase] = await Promise.all([
    obtenerConfiguracion(),
    obtenerHoy(),
    crearClienteServidor(),
  ]);
  const periodo = periodoDe(hoy);
  const [{ data }, vista] = await Promise.all([
    supabase
      .from("productos")
      .select("id, nombre, activo")
      .eq("activo", true)
      .order("nombre")
      .returns<Producto[]>(),
    cargarVista(usuario.id, periodo),
  ]);
  const productos = data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Registrar venta</h1>

      <section className="tarjeta">
        {productos.length === 0 ? (
          <p className="text-sm text-slate-600">
            Todavía no hay productos activos en el catálogo. Pide a tu gerente
            que los cree para poder registrar ventas.
          </p>
        ) : (
          <Formulario
            accion={registrarVenta}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
          >
            <div>
              <label htmlFor="fecha" className="etiqueta">
                Fecha
              </label>
              <input
                id="fecha"
                name="fecha"
                type="date"
                defaultValue={hoy}
                max={hoy}
                required
                className="campo"
              />
            </div>
            <div>
              <label htmlFor="cliente" className="etiqueta">
                Cliente
              </label>
              <input
                id="cliente"
                name="cliente"
                required
                maxLength={160}
                className="campo"
              />
            </div>
            <div>
              <label htmlFor="producto_id" className="etiqueta">
                Producto
              </label>
              <select
                id="producto_id"
                name="producto_id"
                required
                defaultValue=""
                className="campo"
              >
                <option value="" disabled>
                  Elige…
                </option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="monto" className="etiqueta">
                Monto ({config.moneda})
              </label>
              <input
                id="monto"
                name="monto"
                type="number"
                inputMode="decimal"
                min={0.01}
                step={0.01}
                required
                className="campo"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label htmlFor="notas" className="etiqueta">
                Notas (opcional)
              </label>
              <textarea
                id="notas"
                name="notas"
                rows={2}
                maxLength={500}
                placeholder="Algo adicional sobre esta venta"
                className="campo resize-y"
              />
            </div>
            <BotonEnviar>Registrar venta</BotonEnviar>
          </Formulario>
        )}
      </section>

      <section className="tarjeta">
        <h2 className="mb-3 font-medium">
          Mis ventas de {nombrePeriodo(periodo)}
        </h2>
        {vista.ventas.length === 0 ? (
          <p className="text-sm text-slate-600">
            Aún no registras ventas este mes.
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
                  <th className="pb-2 pl-4 font-medium">Notas</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vista.ventas.map((v) => (
                  <tr key={v.id}>
                    <td className="py-2 whitespace-nowrap">{fechaCorta(v.fecha)}</td>
                    <td className="py-2">{v.cliente}</td>
                    <td className="py-2">{v.producto}</td>
                    <td className="py-2 text-right">
                      {dinero(v.monto, config.moneda)}
                    </td>
                    <td className="max-w-64 py-2 pl-4 text-slate-600">{v.notas ?? "—"}</td>
                    <td className="py-2 text-right">
                      <form action={eliminarVenta}>
                        <input type="hidden" name="id" value={v.id} />
                        <button type="submit" className="boton-secundario">
                          Eliminar
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Para corregir una venta del mes, elimínala y regístrala de nuevo. Las
          de meses anteriores ya no se pueden modificar.
        </p>
      </section>
    </div>
  );
}
