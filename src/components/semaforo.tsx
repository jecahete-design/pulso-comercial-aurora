import type { Estado } from "@/lib/pulso/motor";

const ESTILO: Record<Estado, { punto: string; fondo: string; texto: string }> = {
  verde: { punto: "bg-emerald-500", fondo: "bg-emerald-50 text-emerald-800", texto: "En ritmo" },
  amarillo: { punto: "bg-amber-400", fondo: "bg-amber-50 text-amber-800", texto: "Atención" },
  rojo: { punto: "bg-red-500", fondo: "bg-red-50 text-red-800", texto: "Brecha" },
  en_curso: { punto: "bg-sky-400", fondo: "bg-sky-50 text-sky-800", texto: "En curso" },
  sin_meta: { punto: "bg-slate-300", fondo: "bg-slate-100 text-slate-600", texto: "Sin meta" },
  no_laboral: { punto: "bg-slate-300", fondo: "bg-slate-100 text-slate-600", texto: "No laboral" },
};

// El estado siempre lleva texto además del color.
export function Semaforo({
  estado,
  textoVerde,
}: {
  estado: Estado;
  textoVerde?: string;
}) {
  const e = ESTILO[estado];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${e.fondo}`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${e.punto}`} aria-hidden />
      {estado === "verde" && textoVerde ? textoVerde : e.texto}
    </span>
  );
}

export const COLOR_BARRA: Record<Estado, string> = {
  verde: "bg-emerald-500",
  amarillo: "bg-amber-400",
  rojo: "bg-red-500",
  en_curso: "bg-sky-400",
  sin_meta: "bg-slate-300",
  no_laboral: "bg-slate-300",
};
