import { Encabezado } from "@/components/encabezado";
import { requerirRol } from "@/lib/sesion";

export default async function LayoutVendedor({
  children,
}: LayoutProps<"/vendedor">) {
  const usuario = await requerirRol("vendedor");
  return (
    <>
      <Encabezado
        usuario={usuario}
        enlaces={[
          { href: "/vendedor", texto: "Mi Pulso" },
          { href: "/vendedor/actividad", texto: "Registrar actividad" },
          { href: "/vendedor/ventas", texto: "Registrar venta" },
          { href: "/vendedor/desempeno", texto: "Mi desempeño" },
        ]}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </>
  );
}
