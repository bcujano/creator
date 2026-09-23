-- Respuestas del cliente separadas de las del consultor, datos para el acuerdo
-- y datos legales de la empresa que contrata.

alter table levantamientos
  add column respuestas_cliente jsonb not null default '{}',
  add column cliente_respondio_en timestamptz,
  add column cliente_termino boolean not null default false;

alter table clientes
  add column razon_social text not null default '',
  add column direccion text not null default '',
  add column cedula_representante text not null default '';

alter table ajustes add column legal jsonb not null default '{}';

update ajustes set legal = '{
  "razon_social": "321 SOLUCIONES INMOBILIARIAS S.A.S.",
  "ruc": "1793232459001",
  "linea_negocio": "AiUDA",
  "descripcion_linea": "línea de negocio dedicada a brindar soluciones empresariales con inteligencia artificial",
  "representante": "Byron Cujano",
  "cargo": "Director General",
  "ciudad": "Quito",
  "direccion": "",
  "plazo_minimo_meses": 6,
  "dias_preaviso": 30,
  "garantia_dias": 30
}' where id = 1;

-- Las respuestas que el cliente ya dejó en el insumo "formulario" pasan a su nuevo lugar.
update levantamientos l
set respuestas_cliente = coalesce(i.meta->'respuestas', '{}'),
    cliente_respondio_en = i.creado_en
from insumos i
where i.levantamiento_id = l.id and i.tipo = 'formulario' and i.origen = 'cliente' and i.eliminado_en is null;

update insumos set eliminado_en = now()
where tipo = 'formulario' and origen = 'cliente' and eliminado_en is null;
