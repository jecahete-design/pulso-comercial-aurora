"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { EstadoFormulario } from "@/lib/tipos";

type Accion = (
  previo: EstadoFormulario,
  datos: FormData,
) => Promise<EstadoFormulario>;

// Formulario conectado a una acción del servidor que muestra su resultado.
export function Formulario({
  accion,
  className,
  children,
}: {
  accion: Accion;
  className?: string;
  children: React.ReactNode;
}) {
  const [estado, enviar] = useActionState(accion, null);
  return (
    <form action={enviar} className={className}>
      {children}
      {estado?.error && (
        <p role="alert" className="basis-full text-sm text-red-700">
          {estado.error}
        </p>
      )}
      {estado?.ok && (
        <p role="status" className="basis-full text-sm text-emerald-700">
          {estado.ok}
        </p>
      )}
    </form>
  );
}

export function BotonEnviar({
  children,
  className = "boton",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "Guardando…" : children}
    </button>
  );
}
