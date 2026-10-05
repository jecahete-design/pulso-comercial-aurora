import { redirect } from "next/navigation";
import { BotonEnviar, Formulario } from "@/components/formulario";
import { obtenerSesion, rutaInicio } from "@/lib/sesion";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { iniciarSesion } from "./acciones";

export default async function PaginaLogin() {
  const sesion = await obtenerSesion();
  if (sesion) redirect(rutaInicio(sesion.rol));

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="tarjeta w-full max-w-sm">
        <h1 className="text-xl font-semibold text-indigo-700">
          Pulso Comercial Aurora
        </h1>
        <p className="mt-1 mb-5 text-sm text-slate-600">
          Ingresa con tu correo y contraseña.
        </p>
        {!supabaseConfigurado() && (
          <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Falta conectar la base de datos: crea el archivo .env.local a partir
            de .env.example.
          </p>
        )}
        <Formulario accion={iniciarSesion} className="flex flex-col gap-4">
          <div>
            <label htmlFor="correo" className="etiqueta">
              Correo
            </label>
            <input
              id="correo"
              name="correo"
              type="email"
              autoComplete="email"
              required
              className="campo"
            />
          </div>
          <div>
            <label htmlFor="clave" className="etiqueta">
              Contraseña
            </label>
            <input
              id="clave"
              name="clave"
              type="password"
              autoComplete="current-password"
              required
              className="campo"
            />
          </div>
          <BotonEnviar>Ingresar</BotonEnviar>
        </Formulario>
      </div>
    </main>
  );
}
