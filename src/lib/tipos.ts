export type Rol = "gerente" | "vendedor";

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
