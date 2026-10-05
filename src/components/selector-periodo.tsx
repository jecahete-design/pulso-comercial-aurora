import { type Periodo, textoPeriodo } from "@/lib/pulso/fechas";

// Formulario GET: cambia el parámetro ?periodo=AAAA-MM de la página actual.
export function SelectorPeriodo({
  periodo,
  maximo,
  ocultos = {},
}: {
  periodo: Periodo;
  maximo?: Periodo;
  ocultos?: Record<string, string>;
}) {
  return (
    <form className="flex items-end gap-2">
      {Object.entries(ocultos).map(([nombre, valor]) => (
        <input key={nombre} type="hidden" name={nombre} value={valor} />
      ))}
      <div>
        <label htmlFor="periodo" className="etiqueta">
          Período
        </label>
        <input
          id="periodo"
          name="periodo"
          type="month"
          defaultValue={textoPeriodo(periodo)}
          max={maximo ? textoPeriodo(maximo) : undefined}
          required
          className="campo"
        />
      </div>
      <button type="submit" className="boton-secundario py-2">
        Ver
      </button>
    </form>
  );
}
