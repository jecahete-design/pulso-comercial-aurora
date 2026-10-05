// Los parámetros de la URL pueden llegar repetidos; se toma el primero.
export function uno(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] : valor;
}

export const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;
