-- Pulso Comercial Aurora — esquema base (Etapa 1)
-- Cubre la sección 4 de la ficha y las reglas R01–R03, R08 y R09.

create type rol_usuario as enum ('gerente', 'vendedor');
create type tipo_actividad as enum (
  'llamadas', 'reuniones', 'visitas', 'propuestas', 'seguimientos', 'prospectos'
);

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

-- Un vendedor es un usuario con rol 'vendedor'; el gerente solo supervisa.
create table usuarios (
  id uuid primary key references auth.users (id) on delete restrict,
  nombre text not null,
  correo text not null unique,
  rol rol_usuario not null default 'vendedor',
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

-- Un registro por vendedor y día, con las cantidades acumuladas del día.
create table actividades (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null references usuarios (id) on delete restrict,
  fecha date not null,
  llamadas integer not null default 0 check (llamadas >= 0),
  reuniones integer not null default 0 check (reuniones >= 0),
  visitas integer not null default 0 check (visitas >= 0),
  propuestas integer not null default 0 check (propuestas >= 0),
  seguimientos integer not null default 0 check (seguimientos >= 0),
  prospectos integer not null default 0 check (prospectos >= 0),
  actualizado_en timestamptz not null default now(),
  unique (vendedor_id, fecha)
);

create table ventas (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null references usuarios (id) on delete restrict,
  fecha date not null,
  cliente text not null check (length(trim(cliente)) > 0),
  producto_id uuid not null references productos (id) on delete restrict,
  monto numeric(12, 2) not null check (monto > 0),
  creado_en timestamptz not null default now()
);
create index ventas_vendedor_fecha_idx on ventas (vendedor_id, fecha);

create table metas_ventas (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null references usuarios (id) on delete restrict,
  anio integer not null check (anio between 2020 and 2100),
  mes integer not null check (mes between 1 and 12),
  monto numeric(12, 2) not null check (monto > 0),
  unique (vendedor_id, anio, mes)
);

-- Vigencia mensual. Una meta en null significa "Sin meta" para esa lectura.
create table metas_actividad (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null references usuarios (id) on delete restrict,
  anio integer not null check (anio between 2020 and 2100),
  mes integer not null check (mes between 1 and 12),
  actividad tipo_actividad not null,
  meta_diaria integer check (meta_diaria > 0),
  meta_semanal integer check (meta_semanal > 0),
  unique (vendedor_id, anio, mes, actividad)
);

-- Fila única con los parámetros globales del equipo.
create table configuracion (
  id boolean primary key default true check (id),
  dias_laborales integer[] not null default '{1,2,3,4,5}', -- ISO: 1 = lunes … 7 = domingo
  zona_horaria text not null default 'America/Panama',
  moneda text not null default 'USD'
);
insert into configuracion default values;

-- ---------------------------------------------------------------------------
-- Funciones de apoyo
-- ---------------------------------------------------------------------------

create function es_gerente() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from usuarios
    where id = auth.uid() and rol = 'gerente' and activo
  );
$$;

create function es_vendedor_activo() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from usuarios
    where id = auth.uid() and rol = 'vendedor' and activo
  );
$$;

create function hoy_local() returns date
language sql stable security definer set search_path = public as $$
  select (now() at time zone (select zona_horaria from configuracion))::date;
$$;

-- Crea el perfil al registrarse un usuario de autenticación. El rol sale de
-- app_metadata, que solo puede escribirse con la clave de servicio.
create function crear_perfil_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into usuarios (id, nombre, correo, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_app_meta_data ->> 'rol')::rol_usuario, 'vendedor')
  );
  return new;
end;
$$;

create trigger al_crear_usuario_auth
  after insert on auth.users
  for each row execute function crear_perfil_usuario();

-- ---------------------------------------------------------------------------
-- Permisos por fila
-- ---------------------------------------------------------------------------

alter table usuarios enable row level security;
alter table productos enable row level security;
alter table actividades enable row level security;
alter table ventas enable row level security;
alter table metas_ventas enable row level security;
alter table metas_actividad enable row level security;
alter table configuracion enable row level security;

-- usuarios: cada quien ve su perfil; el gerente ve y administra todos.
create policy usuarios_lectura on usuarios for select to authenticated
  using (id = auth.uid() or es_gerente());
create policy usuarios_gerente_edita on usuarios for update to authenticated
  using (es_gerente()) with check (es_gerente());

-- productos: catálogo visible para todos; solo el gerente lo administra.
create policy productos_lectura on productos for select to authenticated
  using (true);
create policy productos_gerente_crea on productos for insert to authenticated
  with check (es_gerente());
create policy productos_gerente_edita on productos for update to authenticated
  using (es_gerente()) with check (es_gerente());

-- actividades: el vendedor registra y edita las suyas; el gerente solo consulta.
create policy actividades_lectura on actividades for select to authenticated
  using (vendedor_id = auth.uid() or es_gerente());
create policy actividades_vendedor_crea on actividades for insert to authenticated
  with check (vendedor_id = auth.uid() and es_vendedor_activo() and fecha <= hoy_local());
create policy actividades_vendedor_edita on actividades for update to authenticated
  using (vendedor_id = auth.uid() and es_vendedor_activo())
  with check (vendedor_id = auth.uid() and fecha <= hoy_local());

-- ventas: el vendedor registra las suyas y solo corrige las del mes en curso.
create policy ventas_lectura on ventas for select to authenticated
  using (vendedor_id = auth.uid() or es_gerente());
create policy ventas_vendedor_crea on ventas for insert to authenticated
  with check (vendedor_id = auth.uid() and es_vendedor_activo() and fecha <= hoy_local());
create policy ventas_vendedor_edita on ventas for update to authenticated
  using (
    vendedor_id = auth.uid() and es_vendedor_activo()
    and date_trunc('month', fecha) = date_trunc('month', hoy_local())
  )
  with check (
    vendedor_id = auth.uid() and fecha <= hoy_local()
    and date_trunc('month', fecha) = date_trunc('month', hoy_local())
  );
create policy ventas_vendedor_elimina on ventas for delete to authenticated
  using (
    vendedor_id = auth.uid() and es_vendedor_activo()
    and date_trunc('month', fecha) = date_trunc('month', hoy_local())
  );

-- metas: el vendedor consulta las suyas; solo el gerente las configura.
create policy metas_ventas_lectura on metas_ventas for select to authenticated
  using (vendedor_id = auth.uid() or es_gerente());
create policy metas_ventas_gerente_crea on metas_ventas for insert to authenticated
  with check (es_gerente());
create policy metas_ventas_gerente_edita on metas_ventas for update to authenticated
  using (es_gerente()) with check (es_gerente());
create policy metas_ventas_gerente_elimina on metas_ventas for delete to authenticated
  using (es_gerente());

create policy metas_actividad_lectura on metas_actividad for select to authenticated
  using (vendedor_id = auth.uid() or es_gerente());
create policy metas_actividad_gerente_crea on metas_actividad for insert to authenticated
  with check (es_gerente());
create policy metas_actividad_gerente_edita on metas_actividad for update to authenticated
  using (es_gerente()) with check (es_gerente());
create policy metas_actividad_gerente_elimina on metas_actividad for delete to authenticated
  using (es_gerente());

-- configuracion: visible para todos; solo el gerente la cambia.
create policy configuracion_lectura on configuracion for select to authenticated
  using (true);
create policy configuracion_gerente_edita on configuracion for update to authenticated
  using (es_gerente()) with check (es_gerente());
