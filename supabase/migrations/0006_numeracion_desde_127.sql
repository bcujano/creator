-- La propuesta de DKB Courier se firmó como N.º 127 (numeración comercial de 321).
-- Se corrige su número en el sistema y la serie continúa desde ahí (la siguiente es 0128).
update propuestas set numero = 'AIU-2026-0127'
 where id = 'a8b797b5-3c7d-4e85-93af-509c9fa08b4e' and numero = 'AIU-2026-0012';

insert into eventos (entidad, entidad_id, accion, datos)
select 'propuesta', 'a8b797b5-3c7d-4e85-93af-509c9fa08b4e', 'numero_corregido',
       '{"antes": "AIU-2026-0012", "despues": "AIU-2026-0127", "motivo": "acuerdo firmado como N.º 127"}'
 where exists (select 1 from propuestas where numero = 'AIU-2026-0127');

-- Nunca retroceder: si la serie ya pasó de 127, se queda donde está.
select setval('propuestas_numero', greatest(127, (select last_value from propuestas_numero)), true);
