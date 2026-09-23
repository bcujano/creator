-- CREATOR · esquema base
-- Regla de oro: aquí nada se borra de verdad. Las filas se marcan con
-- eliminado_en, y los análisis y propuestas son versiones inmutables.
-- RLS activa y sin políticas: el navegador no toca la base; todo pasa por el
-- servidor con service_role y la autorización la decide src/lib/auth.ts.

create extension if not exists pgcrypto;

create or replace function tocar_actualizado() returns trigger language plpgsql as $$
begin
  new.actualizado_en = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Ajustes (una sola fila)
-- ---------------------------------------------------------------------------
create table ajustes (
  id int primary key default 1 check (id = 1),
  marca jsonb not null default '{}',
  precios jsonb not null default '{}',
  ia jsonb not null default '{}',
  crm jsonb not null default '{}',
  actualizado_en timestamptz not null default now()
);
create trigger ajustes_tocar before update on ajustes for each row execute function tocar_actualizado();

-- ---------------------------------------------------------------------------
-- Catálogo: paquetes, módulos y servicios con precio y costo
-- ---------------------------------------------------------------------------
create table catalogo (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  tipo text not null check (tipo in ('paquete', 'modulo', 'servicio')),
  categoria text not null default 'general',
  nombre_es text not null,
  nombre_en text not null,
  descripcion_es text not null default '',
  descripcion_en text not null default '',
  caracteristicas_es text[] not null default '{}',
  caracteristicas_en text[] not null default '{}',
  resuelve text[] not null default '{}',
  incluye text[] not null default '{}',
  precio_setup numeric(12, 2) not null default 0,
  precio_mensual numeric(12, 2) not null default 0,
  costo_setup numeric(12, 2) not null default 0,
  costo_mensual numeric(12, 2) not null default 0,
  usuarios_incluidos int not null default 0,
  volumen jsonb,
  semanas int not null default 2,
  estado text not null default 'listo' check (estado in ('listo', 'beta', 'proximamente')),
  activo boolean not null default true,
  orden int not null default 100,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  eliminado_en timestamptz
);
create trigger catalogo_tocar before update on catalogo for each row execute function tocar_actualizado();

-- Historial de cambios de precio: nunca se pierde cuánto costaba algo.
create table catalogo_historial (
  id bigint generated always as identity primary key,
  catalogo_id uuid not null references catalogo (id),
  antes jsonb not null,
  despues jsonb not null,
  creado_en timestamptz not null default now()
);

create or replace function registrar_cambio_catalogo() returns trigger language plpgsql as $$
begin
  if to_jsonb(old) - 'actualizado_en' is distinct from to_jsonb(new) - 'actualizado_en' then
    insert into catalogo_historial (catalogo_id, antes, despues) values (old.id, to_jsonb(old), to_jsonb(new));
  end if;
  return new;
end $$;
create trigger catalogo_historial_trg after update on catalogo for each row execute function registrar_cambio_catalogo();

-- ---------------------------------------------------------------------------
-- Clientes y levantamientos
-- ---------------------------------------------------------------------------
create table clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  industria text not null default '',
  ruc text not null default '',
  contacto_nombre text not null default '',
  contacto_cargo text not null default '',
  telefono text not null default '',
  email text not null default '',
  ciudad text not null default '',
  sitio_web text not null default '',
  empleados text not null default '',
  notas text not null default '',
  crm_lead_id text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  eliminado_en timestamptz
);
create trigger clientes_tocar before update on clientes for each row execute function tocar_actualizado();

create table levantamientos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (id),
  titulo text not null,
  estado text not null default 'recolectando'
    check (estado in ('recolectando', 'analizado', 'propuesta', 'enviada', 'ganada', 'perdida')),
  idioma text not null default 'es' check (idioma in ('es', 'en')),
  respuestas jsonb not null default '{}',
  token_cliente text not null unique default encode(gen_random_bytes(18), 'hex'),
  formulario_activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  eliminado_en timestamptz
);
create trigger levantamientos_tocar before update on levantamientos for each row execute function tocar_actualizado();
create index levantamientos_cliente on levantamientos (cliente_id);

-- Todo lo que entra: notas, respuestas del cliente, archivos, audios, imágenes.
-- El texto extraído vive en "contenido"; el archivo original, en Storage.
create table insumos (
  id uuid primary key default gen_random_uuid(),
  levantamiento_id uuid not null references levantamientos (id),
  tipo text not null check (tipo in ('nota', 'archivo', 'audio', 'imagen', 'formulario', 'texto')),
  origen text not null default 'consultor' check (origen in ('consultor', 'cliente')),
  titulo text not null default '',
  contenido text not null default '',
  ruta_archivo text,
  mime text,
  tamano bigint,
  estado text not null default 'listo' check (estado in ('procesando', 'listo', 'error')),
  error text,
  meta jsonb not null default '{}',
  creado_en timestamptz not null default now(),
  eliminado_en timestamptz
);
create index insumos_levantamiento on insumos (levantamiento_id);

-- Cada corrida de IA queda guardada entera: qué entró, qué salió y cuánto costó.
create table analisis (
  id uuid primary key default gen_random_uuid(),
  levantamiento_id uuid not null references levantamientos (id),
  version int not null,
  proveedor text not null,
  modelo text not null,
  entrada text not null,
  resultado jsonb,
  uso jsonb not null default '{}',
  estado text not null default 'listo' check (estado in ('procesando', 'listo', 'error')),
  error text,
  creado_en timestamptz not null default now(),
  unique (levantamiento_id, version)
);

create sequence propuestas_numero;

create table propuestas (
  id uuid primary key default gen_random_uuid(),
  levantamiento_id uuid not null references levantamientos (id),
  analisis_id uuid references analisis (id),
  version int not null,
  numero text not null unique,
  idioma text not null default 'es',
  datos jsonb not null,
  totales jsonb not null,
  estado text not null default 'borrador' check (estado in ('borrador', 'presentada', 'enviada', 'aceptada', 'rechazada')),
  token_publico text not null unique default encode(gen_random_bytes(18), 'hex'),
  crm_sincronizado_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  eliminado_en timestamptz,
  unique (levantamiento_id, version)
);
create trigger propuestas_tocar before update on propuestas for each row execute function tocar_actualizado();

-- ---------------------------------------------------------------------------
-- Bitácora e integración
-- ---------------------------------------------------------------------------
create table eventos (
  id bigint generated always as identity primary key,
  entidad text not null,
  entidad_id text not null,
  accion text not null,
  datos jsonb not null default '{}',
  creado_en timestamptz not null default now()
);
create index eventos_entidad on eventos (entidad, entidad_id);

create table crm_envios (
  id bigint generated always as identity primary key,
  propuesta_id uuid references propuestas (id),
  accion text not null,
  solicitud jsonb not null,
  respuesta jsonb,
  ok boolean not null,
  creado_en timestamptz not null default now()
);

alter table ajustes enable row level security;
alter table catalogo enable row level security;
alter table catalogo_historial enable row level security;
alter table clientes enable row level security;
alter table levantamientos enable row level security;
alter table insumos enable row level security;
alter table analisis enable row level security;
alter table propuestas enable row level security;
alter table eventos enable row level security;
alter table crm_envios enable row level security;

-- Bucket privado para los archivos originales.
insert into storage.buckets (id, name, public)
values ('insumos', 'insumos', false)
on conflict (id) do nothing;

-- Bucket público solo para el logo y activos de marca.
insert into storage.buckets (id, name, public)
values ('marca', 'marca', true)
on conflict (id) do nothing;
