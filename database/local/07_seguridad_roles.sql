-- Permisos locales de PostgREST por rol. Idempotente para volúmenes existentes.
BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'nury_admin') THEN
        CREATE ROLE nury_admin NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'nury_cajero') THEN
        CREATE ROLE nury_cajero NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'nury_bodeguero') THEN
        CREATE ROLE nury_bodeguero NOLOGIN;
    END IF;
END $$;

GRANT nury_admin, nury_cajero, nury_bodeguero TO authenticator;
GRANT USAGE ON SCHEMA public TO nury_admin, nury_cajero, nury_bodeguero;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM web_anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM web_anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM web_anon, PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON TABLES FROM web_anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON SEQUENCES FROM web_anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE EXECUTE ON FUNCTIONS FROM web_anon, PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
    REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.login(text, text) TO web_anon;

GRANT ALL ON ALL TABLES IN SCHEMA public TO nury_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO nury_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO nury_admin;

GRANT SELECT ON public.productos, public.sucursales TO nury_cajero;
-- PENDIENTE en la base local actual: el contenedor PostgreSQL existente fue
-- creado antes de montar este archivo, por lo que aún conserva los permisos
-- anteriores de escritura para Bodeguero. Este bloque define el estado deseado:
-- permitir leer productos para Inventario, pero impedir INSERT, UPDATE y DELETE.
-- Aplicar este script a la base existente y verificar lectura permitida y las
-- tres escrituras rechazadas. No borrar el volumen de datos.
REVOKE ALL ON public.productos FROM nury_bodeguero;
GRANT SELECT ON public.productos TO nury_bodeguero;
REVOKE ALL ON SEQUENCE public.productos_id_seq FROM nury_bodeguero;
GRANT SELECT ON public.sucursales, public.ingredientes,
    public.stock_sucursal, public.categorias_ingrediente,
    public.unidades_medida TO nury_bodeguero;

-- El POS registra ventas mediante esta función; las tablas internas no se
-- exponen para escritura directa al cajero.
ALTER FUNCTION public.fn_registrar_venta(integer, integer, character varying, jsonb)
    SECURITY DEFINER;
ALTER FUNCTION public.fn_registrar_venta(integer, integer, character varying, jsonb)
    SET search_path = pg_catalog, public, pg_temp;
GRANT EXECUTE ON FUNCTION public.fn_registrar_venta(integer, integer, character varying, jsonb)
    TO nury_cajero;

COMMIT;
