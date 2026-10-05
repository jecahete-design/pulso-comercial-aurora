import { notFound } from "next/navigation";
import { TablaEquipo } from "@/components/tabla-equipo";
import { VistaPulso } from "@/components/vista-pulso";
import { hoyEn, periodoAnterior, periodoDe, sumarDias, fechaDe } from "@/lib/pulso/fechas";
import {
  ACTIVIDADES,
  type EntradaVista,
  type FilaActividad,
  construirVista,
} from "@/lib/pulso/motor";

// Vista previa con datos inventados, solo en desarrollo: permite revisar los
// dashboards sin base de datos. No existe en producción.

function vendedorDemo(
  hoy: string,
  metaVentas: number,
  ritmoVentas: number, // fracción del avance esperado que logra vender
  ritmoActividad: number, // fracción de la meta diaria que ejecuta
): EntradaVista {
  const periodo = periodoDe(hoy);
  const previo = periodoAnterior(periodo);
  const metasActividad = [periodo, previo].flatMap((p) =>
    ACTIVIDADES.map((actividad, i) => ({
      ...p,
      actividad,
      meta_diaria: [20, 3, 2, 2, 10, 4][i],
      meta_semanal: [100, 15, 10, 10, 50, 20][i],
    })),
  );
  const actividades: FilaActividad[] = [];
  for (let f = sumarDias(hoy, -40); f <= hoy; f = sumarDias(f, 1)) {
    const laboral = new Date(`${f}T12:00:00Z`).getUTCDay() % 6 !== 0;
    if (!laboral) continue;
    // Variación fija por día para que la demo no cambie al recargar.
    const semilla = Number(f.slice(8)) % 5;
    const factor = ritmoActividad * (0.85 + semilla * 0.075) * (f === hoy ? 0.6 : 1);
    actividades.push({
      fecha: f,
      llamadas: Math.round(20 * factor),
      reuniones: Math.round(3 * factor),
      visitas: Math.round(2 * factor),
      propuestas: Math.round(2 * factor),
      seguimientos: Math.round(10 * factor),
      prospectos: Math.round(4 * factor),
    });
  }
  const dia = Number(hoy.slice(8));
  const ventas = [];
  for (let d = 2; d <= dia; d += 3) {
    ventas.push({
      id: `v${d}`,
      fecha: fechaDe(periodo, d),
      cliente: ["Grupo Istmo", "Ferretería Canal", "Clínica del Este", "Transportes Darién"][d % 4],
      producto: ["Plan Básico", "Plan Empresarial", "Soporte Anual"][d % 3],
      monto: Math.round((metaVentas * ritmoVentas * 3) / 31 / 50) * 50,
    });
  }
  return {
    hoy,
    periodo,
    diasLaborales: [1, 2, 3, 4, 5],
    ventas,
    actividades,
    metasVentas: [{ ...periodo, monto: metaVentas }],
    metasActividad,
  };
}

export default function PaginaDemo() {
  if (process.env.NODE_ENV === "production") notFound();
  const hoy = hoyEn("America/Panama");
  const equipo = [
    { id: "ana", nombre: "Ana", vista: construirVista(vendedorDemo(hoy, 20000, 1.25, 1.1)) },
    { id: "carlos", nombre: "Carlos", vista: construirVista(vendedorDemo(hoy, 25000, 0.9, 1.0)) },
    { id: "maria", nombre: "María", vista: construirVista(vendedorDemo(hoy, 30000, 0.45, 0.6)) },
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-6">
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        Vista previa con datos inventados. Sirve para revisar el diseño y los
        cálculos antes de conectar la base de datos.
      </p>
      <section className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Dashboard gerencial (demo)</h1>
        <TablaEquipo filas={equipo} moneda="USD" enlace={(id) => `#${id}`} />
      </section>
      {equipo.map((f) => (
        <section key={f.id} id={f.id} className="flex flex-col gap-6">
          <h2 className="text-xl font-semibold">Detalle de {f.nombre} (demo)</h2>
          <VistaPulso vista={f.vista} moneda="USD" />
        </section>
      ))}
    </main>
  );
}
