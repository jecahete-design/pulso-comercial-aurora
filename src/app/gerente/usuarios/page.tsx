import { BotonEnviar, Formulario } from "@/components/formulario";
import { requerirRol } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { NOMBRE_ROL, type Usuario } from "@/lib/tipos";
import {
  actualizarUsuario,
  cambiarEstadoUsuario,
  crearUsuario,
} from "./acciones";

export default async function PaginaUsuarios() {
  const gerente = await requerirRol("gerente");
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("usuarios")
    .select("id, nombre, correo, rol, activo")
    .order("rol")
    .order("nombre")
    .returns<Usuario[]>();
  const usuarios = data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Desarrolladores de Negocios y usuarios</h1>

      <section className="tarjeta">
        <h2 className="mb-3 font-medium">Nuevo usuario</h2>
        <Formulario
          accion={crearUsuario}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
        >
          <div>
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
          <div>
            <label htmlFor="correo-nuevo" className="etiqueta">
              Correo
            </label>
            <input
              id="correo-nuevo"
              name="correo"
              type="email"
              required
              className="campo"
            />
          </div>
          <div>
            <label htmlFor="rol-nuevo" className="etiqueta">
              Rol
            </label>
            <select
              id="rol-nuevo"
              name="rol"
              defaultValue="vendedor"
              className="campo"
            >
              <option value="vendedor">{NOMBRE_ROL.vendedor}</option>
              <option value="gerente">{NOMBRE_ROL.gerente}</option>
            </select>
          </div>
          <div>
            <label htmlFor="clave-nueva" className="etiqueta">
              Contraseña temporal
            </label>
            <input
              id="clave-nueva"
              name="clave"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="campo"
            />
          </div>
          <BotonEnviar>Crear</BotonEnviar>
        </Formulario>
      </section>

      <section className="tarjeta">
        <h2 className="mb-3 font-medium">Equipo</h2>
        <ul className="divide-y divide-slate-200">
          {usuarios.map((u) => (
            <li key={u.id} className="flex flex-wrap items-start gap-3 py-3">
              <Formulario
                accion={actualizarUsuario}
                className="flex min-w-60 flex-1 flex-wrap items-center gap-2"
              >
                <input type="hidden" name="id" value={u.id} />
                <input
                  name="nombre"
                  defaultValue={u.nombre}
                  required
                  maxLength={120}
                  aria-label={`Nombre de ${u.correo}`}
                  className="campo max-w-xs flex-1"
                />
                <BotonEnviar className="boton-secundario">Guardar</BotonEnviar>
                <span className="text-sm text-slate-600">{u.correo}</span>
              </Formulario>
              <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-800">
                {NOMBRE_ROL[u.rol]}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  u.activo
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {u.activo ? "Activo" : "Inactivo"}
              </span>
              {u.id !== gerente.id && (
                <form action={cambiarEstadoUsuario}>
                  <input type="hidden" name="id" value={u.id} />
                  <input type="hidden" name="activo" value={String(!u.activo)} />
                  <button type="submit" className="boton-secundario">
                    {u.activo ? "Desactivar" : "Activar"}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
