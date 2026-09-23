-- Condiciones de cierre negociadas en la reunión: el paquete que eligió el
-- cliente y el plan de desembolsos. No cambian el contenido de la versión;
-- cada cambio queda en la bitácora.
alter table propuestas add column cierre jsonb;
