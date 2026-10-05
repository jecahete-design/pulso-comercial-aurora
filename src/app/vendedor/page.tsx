import Link from "next/link";
import { VistaPulso } from "@/components/vista-pulso";
import { cargarVista, obtenerConfiguracion, periodoActual } from "@/lib/datos";
import { requerirRol } from "@/lib/sesion";

export default async function DashboardVendedor() {
  const usuario = await requerirRol("vendedor");
  const [config, periodo] = await Promise.all([
    obtenerConfiguracion(),
    periodoActual(),
  ]);
  const vista = await cargarVista(usuario.id, periodo);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Mi Pulso Comercial</h1>
        <div className="flex gap-2">
          <Link href="/vendedor/actividad" className="boton">
            + Registrar actividad
          </Link>
          <Link href="/vendedor/ventas" className="boton">
            + Registrar venta
          </Link>
        </div>
      </div>
      <VistaPulso vista={vista} moneda={config.moneda} />
    </div>
  );
}
