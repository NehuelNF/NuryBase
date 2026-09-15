-- =====================================================================
-- Función RPC: cuadrar_y_cerrar_turno(p_turno_id)
--
-- Qué hace:
--   1) Totaliza la recaudación del turno agrupada por medio de pago
--      (excluyendo ventas anuladas).
--   2) Bloquea el turno marcándolo como cerrado (turno.hora_fin), y
--      un trigger impide que se le sigan asociando ventas después.
--
-- Requiere la migración 0001_add_turno_id_to_venta.sql aplicada antes.
--
-- Supuestos sobre el esquema (ajustar si no calzan con nury_schema.sql):
--   - turno(id, usuario_id, sucursal_id, hora_inicio, hora_fin)
--     hora_fin NULL = turno abierto; no nulo = cerrado/bloqueado.
--   - venta(turno_id, medio_pago, total, anulada, ...)
--   - `medio_pago` se trata como `text`. Si en tu esquema real es un
--     tipo ENUM (p. ej. `medio_pago_enum`), cambia el tipo de columna
--     de retorno de esta función por ese ENUM.
--
-- Ejemplo de uso vía PostgREST/Supabase:
--   select * from cuadrar_y_cerrar_turno(5);
--   supabase.rpc('cuadrar_y_cerrar_turno', { p_turno_id: 5 })
-- =====================================================================

CREATE OR REPLACE FUNCTION cuadrar_y_cerrar_turno(p_turno_id integer)
RETURNS TABLE (
    medio_pago text,
    cantidad_ventas bigint,
    total_recaudado numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_turno turno%ROWTYPE;
BEGIN
    -- Bloquea la fila del turno (FOR UPDATE) para que dos cierres
    -- concurrentes no procesen la misma cuadratura al mismo tiempo.
    SELECT * INTO v_turno
    FROM turno
    WHERE id = p_turno_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El turno % no existe.', p_turno_id;
    END IF;

    IF v_turno.hora_fin IS NOT NULL THEN
        RAISE EXCEPTION 'El turno % ya fue cerrado el %.', p_turno_id, v_turno.hora_fin;
    END IF;

    -- Cierra y bloquea el turno. A partir de aquí, el trigger
    -- trg_bloquear_venta_en_turno_cerrado impide nuevas ventas contra él.
    UPDATE turno
    SET hora_fin = now()
    WHERE id = p_turno_id;

    RETURN QUERY
    SELECT
        v.medio_pago,
        COUNT(*)::bigint AS cantidad_ventas,
        COALESCE(SUM(v.total), 0)::numeric AS total_recaudado
    FROM venta v
    WHERE v.turno_id = p_turno_id
      AND v.anulada = false
    GROUP BY v.medio_pago
    ORDER BY v.medio_pago;
END;
$$;

COMMENT ON FUNCTION cuadrar_y_cerrar_turno(integer) IS
    'Totaliza la recaudación del turno por medio de pago y bloquea el turno para que no reciba más ventas.';

-- ---------------------------------------------------------------------
-- Trigger de refuerzo: aunque la app ya no debería intentarlo, esto
-- impide a nivel de base de datos insertar una venta contra un turno
-- que ya fue cerrado por cuadrar_y_cerrar_turno().
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_bloquear_venta_en_turno_cerrado()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_hora_fin timestamptz;
BEGIN
    IF NEW.turno_id IS NOT NULL THEN
        SELECT hora_fin INTO v_hora_fin FROM turno WHERE id = NEW.turno_id;

        IF v_hora_fin IS NOT NULL THEN
            RAISE EXCEPTION 'No se pueden registrar ventas en el turno %: ya está cerrado.', NEW.turno_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bloquear_venta_en_turno_cerrado ON venta;

CREATE TRIGGER trg_bloquear_venta_en_turno_cerrado
    BEFORE INSERT ON venta
    FOR EACH ROW
    EXECUTE FUNCTION fn_bloquear_venta_en_turno_cerrado();
