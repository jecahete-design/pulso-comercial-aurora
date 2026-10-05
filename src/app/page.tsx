import { redirect } from "next/navigation";
import { obtenerSesion, rutaInicio } from "@/lib/sesion";

export default async function Inicio() {
  const sesion = await obtenerSesion();
  redirect(sesion ? rutaInicio(sesion.rol) : "/login");
}
