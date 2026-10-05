import Link from "next/link";
import { cerrarSesion } from "@/app/login/acciones";
import type { Usuario } from "@/lib/tipos";

export function Encabezado({
  usuario,
  enlaces,
}: {
  usuario: Usuario;
  enlaces: { href: string; texto: string }[];
}) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <span className="font-semibold text-indigo-700">
          Pulso Comercial Aurora
        </span>
        <nav className="flex flex-1 flex-wrap gap-4 text-sm">
          {enlaces.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              className="text-slate-600 hover:text-slate-900"
            >
              {e.texto}
            </Link>
          ))}
        </nav>
        <span className="text-sm text-slate-600">
          {usuario.nombre} · {usuario.rol === "gerente" ? "Gerente" : "Vendedor"}
        </span>
        <form action={cerrarSesion}>
          <button type="submit" className="boton-secundario">
            Cerrar sesión
          </button>
        </form>
      </div>
    </header>
  );
}
