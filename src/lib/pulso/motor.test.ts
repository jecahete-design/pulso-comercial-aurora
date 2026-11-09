import { describe, expect, it } from "vitest";
import { diaISO, hoyEn, leerPeriodo, lunesDe } from "./fechas";
import {
  ACTIVIDADES,
  type FilaActividad,
  type FilaMetaActividad,
  calcularDia,
  calcularResultados,
  calcularSemana,
  construirVista,
  diasLaboralesDelMes,
  semaforoRitmo,
} from "./motor";

const OCT = { anio: 2026, mes: 10 }; // 31 días; el 1 es jueves, el 5 es lunes
const LV = [1, 2, 3, 4, 5];

function actividad(fecha: string, valores: Partial<FilaActividad> = {}): FilaActividad {
  return {
    fecha,
    llamadas: 0,
    reuniones: 0,
    visitas: 0,
    propuestas: 0,
    seguimientos: 0,
    prospectos: 0,
    ...valores,
  };
}

function metas(
  periodo: { anio: number; mes: number },
  diaria: number | null,
  actividades: readonly (typeof ACTIVIDADES)[number][] = ACTIVIDADES,
): FilaMetaActividad[] {
  return actividades.map((a) => ({
    ...periodo,
    actividad: a,
    meta_diaria: diaria,
  }));
}

describe("fechas", () => {
  it("calcula el día de la semana y el lunes", () => {
    expect(diaISO("2026-10-05")).toBe(1);
    expect(diaISO("2026-10-04")).toBe(7);
    expect(lunesDe("2026-10-01")).toBe("2026-09-28");
    expect(lunesDe("2026-10-11")).toBe("2026-10-05");
  });

  it("usa la fecha de Panamá, no la UTC", () => {
    // 03:00 UTC del día 6 todavía es día 5 en Panamá (UTC-5)
    expect(hoyEn("America/Panama", new Date("2026-10-06T03:00:00Z"))).toBe("2026-10-05");
  });

  it("no acepta períodos futuros ni inválidos", () => {
    expect(leerPeriodo("2026-09", OCT)).toEqual({ anio: 2026, mes: 9 });
    expect(leerPeriodo("2026-11", OCT)).toEqual(OCT);
    expect(leerPeriodo("abc", OCT)).toEqual(OCT);
    expect(leerPeriodo(undefined, OCT)).toEqual(OCT);
  });
});

describe("semáforo de ritmo (tolerancia de 5 puntos)", () => {
  it("verde en ritmo o por encima", () => {
    expect(semaforoRitmo(40, 40)).toBe("verde");
    expect(semaforoRitmo(41, 40)).toBe("verde");
  });
  it("amarillo hasta 5 puntos por debajo", () => {
    expect(semaforoRitmo(39.9, 40)).toBe("amarillo");
    expect(semaforoRitmo(35, 40)).toBe("amarillo");
  });
  it("rojo a más de 5 puntos por debajo", () => {
    expect(semaforoRitmo(34.9, 40)).toBe("rojo");
  });
});

describe("resultados mensuales", () => {
  it("30% el día 2 es verde y el día 20 es rojo", () => {
    expect(calcularResultados(7500, 25000, OCT, "2026-10-02").estado).toBe("verde");
    expect(calcularResultados(7500, 25000, OCT, "2026-10-20").estado).toBe("rojo");
  });

  it("calcula cumplimiento, esperado y brecha", () => {
    const r = calcularResultados(10000, 25000, OCT, "2026-10-15");
    expect(r.cumplimiento).toBeCloseTo(40);
    expect(r.esperado).toBeCloseTo((15 / 31) * 100);
    expect(r.brecha).toBe(15000);
    expect(r.estado).toBe("rojo"); // 40 frente a 48.4
  });

  it("amarillo dentro de la tolerancia", () => {
    // día 15: esperado 48.39; 44% queda 4.39 puntos por debajo
    expect(calcularResultados(11000, 25000, OCT, "2026-10-15").estado).toBe("amarillo");
  });

  it("sin meta no divide entre cero", () => {
    const r = calcularResultados(5000, null, OCT, "2026-10-15");
    expect(r.estado).toBe("sin_meta");
    expect(r.cumplimiento).toBeNull();
    expect(r.brecha).toBeNull();
  });

  it("brecha negativa cuando se supera la meta", () => {
    expect(calcularResultados(30000, 25000, OCT, "2026-10-31").brecha).toBe(-5000);
  });
});

describe("actividad diaria", () => {
  const base = { diasLaborales: LV, metasActividad: metas(OCT, 20) };

  it("un día sin terminar queda en curso, no en rojo", () => {
    const d = calcularDia(
      { ...base, hoy: "2026-10-05", actividades: [actividad("2026-10-05", { llamadas: 12 })] },
      "2026-10-05",
    );
    const llamadas = d.detalle.find((l) => l.actividad === "llamadas")!;
    expect(llamadas.cumplimiento).toBeCloseTo(60);
    expect(llamadas.estado).toBe("en_curso");
    expect(d.estado).toBe("en_curso");
  });

  it("al alcanzar la meta es verde aunque el día siga abierto", () => {
    const d = calcularDia(
      { ...base, hoy: "2026-10-05", actividades: [actividad("2026-10-05", { llamadas: 21 })] },
      "2026-10-05",
    );
    const llamadas = d.detalle.find((l) => l.actividad === "llamadas")!;
    expect(llamadas.cumplimiento).toBeCloseTo(105);
    expect(llamadas.estado).toBe("verde");
  });

  it("al cierre: 95–99% amarillo, menos de 95% rojo", () => {
    const ctx = {
      ...base,
      hoy: "2026-10-07",
      actividades: [actividad("2026-10-06", { llamadas: 19, reuniones: 18 })],
    };
    const d = calcularDia(ctx, "2026-10-06");
    expect(d.detalle.find((l) => l.actividad === "llamadas")!.estado).toBe("amarillo");
    expect(d.detalle.find((l) => l.actividad === "reuniones")!.estado).toBe("rojo");
  });

  it("un día laboral cerrado sin registro es rojo", () => {
    const d = calcularDia({ ...base, hoy: "2026-10-07", actividades: [] }, "2026-10-06");
    expect(d.cumplimiento).toBe(0);
    expect(d.estado).toBe("rojo");
  });

  it("el promedio topa cada actividad en 100%", () => {
    // solo dos actividades con meta: 300% y 50% promedian 75, no 175
    const ctx = {
      hoy: "2026-10-07",
      diasLaborales: LV,
      metasActividad: metas(OCT, 10, ["llamadas", "visitas"]),
      actividades: [actividad("2026-10-06", { llamadas: 30, visitas: 5 })],
    };
    const d = calcularDia(ctx, "2026-10-06");
    expect(d.cumplimiento).toBeCloseTo(75);
    expect(d.estado).toBe("rojo");
  });

  it("sin metas el estado es sin meta", () => {
    const d = calcularDia(
      { hoy: "2026-10-07", diasLaborales: LV, metasActividad: [], actividades: [] },
      "2026-10-06",
    );
    expect(d.estado).toBe("sin_meta");
    expect(d.cumplimiento).toBeNull();
  });

  it("sábado y domingo no se marcan en rojo", () => {
    const d = calcularDia({ ...base, hoy: "2026-10-07", actividades: [] }, "2026-10-04");
    expect(d.estado).toBe("no_laboral");
  });
});

describe("actividad semanal", () => {
  const base = { hoy: "2026-10-09", diasLaborales: LV, metasActividad: metas(OCT, 20) };
  const todas = (n: number) => ({
    llamadas: n, reuniones: n, visitas: n, propuestas: n, seguimientos: n, prospectos: n,
  });

  it("40% el lunes es verde", () => {
    const s = calcularSemana(
      { ...base, actividades: [actividad("2026-10-05", todas(40))] },
      "2026-10-05",
      "2026-10-05",
    );
    expect(s.esperado).toBeCloseTo(20);
    expect(s.cumplimiento).toBeCloseTo(40);
    expect(s.estado).toBe("verde");
  });

  it("el día en curso no cuenta en el ritmo esperado", () => {
    // miércoles por la mañana: solo lunes y martes están cerrados
    const s = calcularSemana(
      { ...base, hoy: "2026-10-07", actividades: [actividad("2026-10-05", todas(40))] },
      "2026-10-05",
      "2026-10-07",
    );
    expect(s.esperado).toBeCloseTo(40);
    expect(s.estado).toBe("verde");
    // lunes por la mañana, sin actividad todavía: no hay brecha
    const lunes = calcularSemana(
      { ...base, hoy: "2026-10-05", actividades: [] },
      "2026-10-05",
      "2026-10-05",
    );
    expect(lunes.esperado).toBe(0);
    expect(lunes.estado).toBe("verde");
  });

  it("40% el viernes es rojo", () => {
    const s = calcularSemana(
      { ...base, actividades: [actividad("2026-10-05", todas(40))] },
      "2026-10-05",
      "2026-10-09",
    );
    expect(s.esperado).toBeCloseTo(80); // viernes aún en curso
    expect(s.estado).toBe("rojo");
  });

  it("amarillo dentro de 5 puntos del ritmo", () => {
    // miércoles: esperado 60; acumulado 56
    const s = calcularSemana(
      {
        ...base,
        actividades: [
          actividad("2026-10-05", todas(30)),
          actividad("2026-10-06", todas(26)),
        ],
      },
      "2026-10-05",
      "2026-10-07",
    );
    expect(s.esperado).toBeCloseTo(60);
    expect(s.cumplimiento).toBeCloseTo(56);
    expect(s.estado).toBe("amarillo");
  });

  it("el fin de semana el avance esperado es 100%", () => {
    const s = calcularSemana(
      { ...base, hoy: "2026-10-10", actividades: [] },
      "2026-10-05",
      "2026-10-10",
    );
    expect(s.esperado).toBe(100);
  });

  it("respeta días laborales configurados (lunes a sábado)", () => {
    const s = calcularSemana(
      { ...base, diasLaborales: [1, 2, 3, 4, 5, 6], actividades: [] },
      "2026-10-05",
      "2026-10-07",
    );
    expect(s.esperado).toBeCloseTo(50);
  });

  it("una semana que cruza de mes usa la meta vigente el lunes", () => {
    const sep = { anio: 2026, mes: 9 };
    const s = calcularSemana(
      {
        hoy: "2026-10-02",
        diasLaborales: LV,
        metasActividad: [...metas(sep, 10), ...metas(OCT, 20)],
        actividades: [actividad("2026-09-28", todas(25)), actividad("2026-10-01", todas(25))],
      },
      "2026-09-28",
      "2026-10-02",
    );
    expect(s.detalle[0].meta).toBe(50);
    expect(s.detalle[0].realizado).toBe(50);
    expect(s.estado).toBe("verde");
  });
});

describe("vista completa", () => {
  const entrada = {
    hoy: "2026-10-05",
    periodo: OCT,
    diasLaborales: LV,
    ventas: [
      { id: "1", fecha: "2026-10-02", cliente: "A", producto: "P", monto: 3000 },
      { id: "2", fecha: "2026-10-05", cliente: "B", producto: "P", monto: 2000 },
      { id: "3", fecha: "2026-09-20", cliente: "C", producto: "P", monto: 9000 },
    ],
    actividades: [actividad("2026-10-05", { llamadas: 10 })],
    metasVentas: [{ ...OCT, monto: 25000 }, { anio: 2026, mes: 9, monto: 10000 }],
    metasActividad: metas(OCT, 20),
  };

  it("solo cuenta las ventas del período", () => {
    const v = construirVista(entrada);
    expect(v.resultados.vendido).toBe(5000);
    expect(v.ventas).toHaveLength(2);
    expect(v.esActual).toBe(true);
    expect(v.dia?.fecha).toBe("2026-10-05");
  });

  it("la serie acumula hasta el corte y deja el resto vacío", () => {
    const v = construirVista(entrada);
    expect(v.serieVentas).toHaveLength(31);
    expect(v.serieVentas[1].acumulado).toBe(3000);
    expect(v.serieVentas[4].acumulado).toBe(5000);
    expect(v.serieVentas[5].acumulado).toBeNull();
    expect(v.serieVentas[30].esperado).toBe(25000);
  });

  it("las actividades no alteran el cumplimiento de ventas", () => {
    const sin = construirVista({ ...entrada, actividades: [] });
    const con = construirVista(entrada);
    expect(con.resultados).toEqual(sin.resultados);
  });

  it("un mes anterior se lee completo, con su propia meta", () => {
    const v = construirVista({ ...entrada, periodo: { anio: 2026, mes: 9 } });
    expect(v.esActual).toBe(false);
    expect(v.dia).toBeNull();
    expect(v.corte).toBe("2026-09-30");
    expect(v.resultados.esperado).toBe(100);
    expect(v.resultados.meta).toBe(10000);
    expect(v.resultados.cumplimiento).toBeCloseTo(90);
    expect(v.resultados.estado).toBe("rojo");
    expect(v.semanas.map((s) => s.lunes)).toEqual([
      "2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28",
    ]);
  });
});

describe("metas derivadas de la diaria", () => {
  it("la semanal es la diaria por 5 días laborales", () => {
    const semana = calcularSemana(
      { hoy: "2026-10-12", diasLaborales: LV, metasActividad: metas(OCT, 20), actividades: [] },
      "2026-10-05",
      "2026-10-11",
    );
    expect(semana.detalle[0].meta).toBe(100);
  });

  it("la mensual usa los días laborales del mes", () => {
    expect(diasLaboralesDelMes(OCT, LV)).toBe(22);
    expect(diasLaboralesDelMes({ anio: 2026, mes: 2 }, LV)).toBe(20);
  });
});
