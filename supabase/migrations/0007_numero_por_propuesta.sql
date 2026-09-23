-- Un número por negociación: las versiones nuevas de la propuesta de un mismo
-- levantamiento conservan el número (AIU-2026-0127 v2, v3…) y no gastan la serie.
alter table propuestas drop constraint propuestas_numero_key;
alter table propuestas add constraint propuestas_numero_version_key unique (numero, version);
