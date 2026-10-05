import { Encabezado } from "@/components/encabezado";
import { requerirRol } from "@/lib/sesion";

export default async function LayoutGerente({
  children,
}: LayoutProps<"/gerente">) {
  const usuario = await requerirRol("gerente");
  return (
    <>
      <Encabezado
        usuario={usuario}
        enlaces={[
          { href: "/gerente", texto: "Pulso del equipo" },
          { href: "/gerente/metas", texto: "Metas" },
          { href: "/gerente/productos", texto: "Productos" },
          { href: "/gerente/usuarios", texto: "Usuarios" },
        ]}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </>
  );
}
