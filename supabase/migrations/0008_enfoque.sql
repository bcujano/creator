-- En qué se enfoca el sistema (ventas, operación, finanzas…): hasta tres áreas.
-- Vacío = por definir; entonces manda lo que el cliente marque en su formulario.
alter table levantamientos add column enfoques text[] not null default '{}';

-- Hasta hoy todas las reuniones se trabajaron con foco comercial.
update levantamientos set enfoques = '{ventas}';
