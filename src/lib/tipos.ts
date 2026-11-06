export type Rol = "gerente" | "vendedor";

// Nombre que ve el usuario para cada rol. En la base de datos el rol sigue
// llamándose "vendedor".
export const NOMBRE_ROL: Record<Rol, string> = {
  gerente: "Gerente",
  vendedor: "Desarrollador de Negocios",
};

export type Usuario = {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  activo: boolean;
};

export type Producto = {
  id: string;
  nombre: string;
  activo: boolean;
};

export type EstadoFormulario = { error?: string; ok?: string } | null;
