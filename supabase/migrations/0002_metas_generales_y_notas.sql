-- Pulso Comercial Aurora — metas generales con ajustes, jornada y notas.
--
-- 1. Las metas se cargan una sola vez por período y aplican a todos los
--    Desarrolladores de Negocios. A uno en particular se le puede subir la meta
--    con un ajuste (incremento) que se suma a la general.
-- 2. Las metas de actividad se cargan solo por día. La semanal es la diaria por
--    los días laborales de la semana y la mensual, por los del mes.
-- 3. Jornada de 8 horas diarias, de lunes a viernes.
-- 4. Notas libres del vendedor por cada actividad del día y por cada venta.
--
-- Es aditiva: no borra nada. Las tablas metas_ventas y metas_actividad quedan
-- sin uso; sus valores se copian abajo como metas generales más ajustes.

-- ---------------------------------------------------------------------------
-- Jornada
-- ---------------------------------------------------------------------------

alter table configuracion
  add column if not exists horas_jornada integer not null default 8
    check (horas_jornada between 1 and 24);
update configuracion set dias_laborales = '{1,2,3,4,5}', horas_jornada = 8;

-- ---------------------------------------------------------------------------
-- Metas generales y ajustes
-- ---------------------------------------------------------------------------

create table metas_generales_ventas (
  anio integer not null check (anio between 2020 and 2100),
  mes integer not null check (mes between 1 and 12),
  monto numeric(12, 2) not null check (monto > 0),
  primary key (anio, mes)
);

create table metas_generales_actividad (
  anio integer not null check (anio between 2020 and 2100),
  mes integer not null check (mes between 1 and 12),
  actividad tipo_actividad not null,
  meta_diaria integer not null check (meta_diaria > 0),
  primary key (anio, mes, actividad)
);

-- Incremento sobre la meta general para un vendedor en un período.
create table ajustes_meta_ventas (
  vendedor_id uuid not null references usuarios (id) on delete restrict,
  anio integer not null check (anio between 2020 and 2100),
  mes integer not null check (mes between 1 and 12),
  incremento numeric(12, 2) not null check (incremento > 0),
  primary key (vendedor_id, anio, mes)
);

create table ajustes_meta_actividad (
  vendedor_id uuid not null references usuarios (id) on delete restrict,
  anio integer not null check (anio between 2020 and 2100),
  mes integer not null check (mes between 1 and 12),
  actividad tipo_actividad not null,
  incremento_diario integer not null check (incremento_diario > 0),
  primary key (vendedor_id, anio, mes, actividad)
);

alter table metas_generales_ventas enable row level security;
alter table metas_generales_actividad enable row level security;
alter table ajustes_meta_ventas enable row level security;
alter table ajustes_meta_actividad enable row level security;

-- Las metas generales las ven todos; cada vendedor ve solo sus ajustes.
-- Solo el gerente escribe.
create policy metas_generales_ventas_lectura on metas_generales_ventas
  for select to authenticated using (true);
create policy metas_generales_ventas_gerente on metas_generales_ventas
  for all to authenticated using (es_gerente()) with check (es_gerente());

create policy metas_generales_actividad_lectura on metas_generales_actividad
  for select to authenticated using (true);
create policy metas_generales_actividad_gerente on metas_generales_actividad
  for all to authenticated using (es_gerente()) with check (es_gerente());

create policy ajustes_meta_ventas_lectura on ajustes_meta_ventas
  for select to authenticated using (vendedor_id = auth.uid() or es_gerente());
create policy ajustes_meta_ventas_gerente on ajustes_meta_ventas
  for all to authenticated using (es_gerente()) with check (es_gerente());

create policy ajustes_meta_actividad_lectura on ajustes_meta_actividad
  for select to authenticated using (vendedor_id = auth.uid() or es_gerente());
create policy ajustes_meta_actividad_gerente on ajustes_meta_actividad
  for all to authenticated using (es_gerente()) with check (es_gerente());

-- Copia de las metas individuales que ya existían: la general de cada período
-- es la menor del equipo y la diferencia queda como ajuste del vendedor.
insert into metas_generales_ventas (anio, mes, monto)
select anio, mes, min(monto) from metas_ventas group by anio, mes
on conflict do nothing;

insert into ajustes_meta_ventas (vendedor_id, anio, mes, incremento)
select m.vendedor_id, m.anio, m.mes, m.monto - g.monto
from metas_ventas m
join metas_generales_ventas g using (anio, mes)
where m.monto > g.monto
on conflict do nothing;

insert into metas_generales_actividad (anio, mes, actividad, meta_diaria)
select anio, mes, actividad, min(meta_diaria)
from metas_actividad where meta_diaria is not null
group by anio, mes, actividad
on conflict do nothing;

insert into ajustes_meta_actividad (vendedor_id, anio, mes, actividad, incremento_diario)
select m.vendedor_id, m.anio, m.mes, m.actividad, m.meta_diaria - g.meta_diaria
from metas_actividad m
join metas_generales_actividad g using (anio, mes, actividad)
where m.meta_diaria > g.meta_diaria
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Notas del vendedor
-- ---------------------------------------------------------------------------

-- Una nota opcional por actividad del día: {"llamadas": "…", "visitas": "…"}.
alter table actividades
  add column if not exists notas jsonb not null default '{}'::jsonb
    check (jsonb_typeof(notas) = 'object');

alter table ventas
  add column if not exists notas text check (char_length(notas) <= 500);

-- Que la API vea las columnas y tablas nuevas sin esperar.
notify pgrst, 'reload schema';
