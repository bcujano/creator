-- El 02/11/2026 Byron separó las marcas: lo inmobiliario y de obra no es de AiUDA (vive en el catálogo del CRM bajo
-- «Byron Cujano», con sus precios por unidad). Se archivan los tres ítems que 0009 había agregado por error.
update catalogo set activo = false, eliminado_en = now()
 where codigo in ('INMO_SUELO', 'OBRAS', 'ADMIN_RENTAS') and eliminado_en is null;

-- Los nombres dejan claro que son las herramientas propias del cliente, distintas de las compras sueltas del CRM
-- (ebooks por unidad y packs de 5 reels).
update catalogo set nombre_es = 'Fábrica de reels propia', nombre_en = 'Your own reel factory' where codigo = 'FABRICA_REELS';
update catalogo set nombre_es = 'Generador de ebooks propio', nombre_en = 'Your own ebook generator' where codigo = 'EBOOKS';
