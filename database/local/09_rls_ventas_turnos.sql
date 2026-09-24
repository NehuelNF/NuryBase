-- =====================================================================
-- RLS: aísla `ventas` y `turnos` por cajero autenticado.
--
-- Hasta ahora `web_anon` tenía SELECT/INSERT/UPDATE/DELETE sin
-- restricción sobre TODAS las tablas (ver 04_roles.sql) — cualquier
-- sesión autenticada podía leer las ventas de cualquier otro cajero.
-- Estas políticas usan el JWT que ya emite public.login() (claims
-- `sub` = id de usuario, `app_role` = admin/cajero/bodeguero) para que
-- PostgREST filtre filas automáticamente en cada request, sin tener
-- que confiar en que el frontend nunca pida de más.
--
-- Un admin ve todo. Un cajero/bodeguero solo ve sus propias filas
-- (las de su propio usuario_id/cajero_id). fn_anular_venta ya valida
-- el rol por su cuenta (ver 08_anulacion_venta.sql); esta política es
-- una segunda capa de defensa si alguien intentara pegarle directo a
-- PostgREST sin pasar por esa función.
-- =====================================================================

ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ventas_select_admin ON ventas;
DROP POLICY IF EXISTS ventas_select_propia ON ventas;
DROP POLICY IF EXISTS ventas_insert_propia ON ventas;
DROP POLICY IF EXISTS ventas_update_admin ON ventas;

-- SELECT: un admin ve todas las ventas; el resto solo las suyas.
CREATE POLICY ventas_select_admin ON ventas
    FOR SELECT
    USING (current_setting('request.jwt.claims', true)::json->>'app_role' = 'admin');

CREATE POLICY ventas_select_propia ON ventas
    FOR SELECT
    USING (cajero_id = (current_setting('request.jwt.claims', true)::json->>'sub')::integer);

-- INSERT: fn_registrar_venta solo debe poder crear ventas a nombre del
-- cajero autenticado (o de un admin vendiendo directamente).
CREATE POLICY ventas_insert_propia ON ventas
    FOR INSERT
    WITH CHECK (
        cajero_id = (current_setting('request.jwt.claims', true)::json->>'sub')::integer
        OR current_setting('request.jwt.claims', true)::json->>'app_role' = 'admin'
    );

-- UPDATE (anulación): refuerzo a nivel de tabla del chequeo que ya
-- hace fn_anular_venta — solo un admin puede modificar una venta.
CREATE POLICY ventas_update_admin ON ventas
    FOR UPDATE
    USING (current_setting('request.jwt.claims', true)::json->>'app_role' = 'admin')
    WITH CHECK (current_setting('request.jwt.claims', true)::json->>'app_role' = 'admin');

-- fn_actualizar_total_venta (schema_nury.sql) recalcula ventas.total
-- justo después de insertar cada línea de detalle_venta, disparado por
-- el propio cajero que está cobrando. Con la política de UPDATE de
-- arriba (solo admin), ese recálculo quedaba bloqueado en silencio y
-- el total de toda venta nueva quedaba en 0. Se redefine como
-- SECURITY DEFINER para que corra con permisos del dueño de la función
-- y no dependa del rol de quien disparó el trigger; no recibe ningún
-- dato externo más allá del id ya validado por fn_registrar_venta.
CREATE OR REPLACE FUNCTION fn_actualizar_total_venta() RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE ventas
       SET total = (SELECT COALESCE(SUM(subtotal),0) FROM detalle_venta WHERE venta_id = NEW.venta_id)
     WHERE id = NEW.venta_id;
    RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS turnos_select_admin ON turnos;
DROP POLICY IF EXISTS turnos_select_propio ON turnos;
DROP POLICY IF EXISTS turnos_insert_propio ON turnos;
DROP POLICY IF EXISTS turnos_update_propio ON turnos;

-- Mismo criterio para turnos: cada quien ve y abre/cierra su propio
-- turno; un admin ve y gestiona todos.
CREATE POLICY turnos_select_admin ON turnos
    FOR SELECT
    USING (current_setting('request.jwt.claims', true)::json->>'app_role' = 'admin');

CREATE POLICY turnos_select_propio ON turnos
    FOR SELECT
    USING (usuario_id = (current_setting('request.jwt.claims', true)::json->>'sub')::integer);

CREATE POLICY turnos_insert_propio ON turnos
    FOR INSERT
    WITH CHECK (
        usuario_id = (current_setting('request.jwt.claims', true)::json->>'sub')::integer
        OR current_setting('request.jwt.claims', true)::json->>'app_role' = 'admin'
    );

CREATE POLICY turnos_update_propio ON turnos
    FOR UPDATE
    USING (
        usuario_id = (current_setting('request.jwt.claims', true)::json->>'sub')::integer
        OR current_setting('request.jwt.claims', true)::json->>'app_role' = 'admin'
    )
    WITH CHECK (
        usuario_id = (current_setting('request.jwt.claims', true)::json->>'sub')::integer
        OR current_setting('request.jwt.claims', true)::json->>'app_role' = 'admin'
    );
