-- Número legible de propuesta: AIU-2026-0001
create or replace function siguiente_numero_propuesta() returns text language sql as $$
  select 'AIU-' || to_char(now() at time zone 'America/Guayaquil', 'YYYY') || '-' ||
         lpad(nextval('propuestas_numero')::text, 4, '0');
$$;
