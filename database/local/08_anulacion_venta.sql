-- =====================================================================
-- fn_anular_venta: anula una venta de forma atómica.
--
--   1) Marca la venta como anulada (nunca DELETE, para no perder rastro).
--   2) Restituye el stock descontado por receta, línea por línea,
--      revirtiendo exactamente lo que hizo fn_aplicar_venta().
--
-- Se queda en una sola función PL/pgSQL para que todo corra en una
-- única transacción: si algo falla a mitad de camino (ej. un producto
-- sin receta), Postgres revierte todo y la venta queda intacta.
--
-- Nota: en un principio esto exigía que el turno de la venta siguiera
-- abierto (para no descuadrar un cierre ya reportado). Se sacó esa
-- validación porque cerrar sesión ya obliga a cerrar caja primero
-- (ver Sidebar.logout), así que casi cualquier venta que un admin
-- quisiera revisar más tarde ya tendría el turno cerrado — la regla
-- volvía la función prácticamente inutilizable en el flujo real.
-- =====================================================================

ALTER TABLE ventas ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT;

CREATE OR REPLACE FUNCTION fn_anular_venta(
    p_venta_id      INTEGER,
    p_usuario_id    INTEGER,
    p_motivo        TEXT
)
RETURNS ventas
LANGUAGE plpgsql
AS $$
DECLARE
    v_venta         ventas%ROWTYPE;
    detalle_row     RECORD;
    receta_row      RECORD;
    v_restituido    NUMERIC(12,3);
    v_stock_previo  NUMERIC(12,3);
    v_nuevo_stock   NUMERIC(12,3);
BEGIN
    IF p_motivo IS NULL OR btrim(p_motivo) = '' THEN
        RAISE EXCEPTION 'Debes indicar un motivo para anular la venta.';
    END IF;

    SELECT * INTO v_venta FROM ventas WHERE id = p_venta_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La venta % no existe.', p_venta_id;
    END IF;

    IF v_venta.anulada THEN
        RAISE EXCEPTION 'La venta % ya estaba anulada.', p_venta_id;
    END IF;

    -- Restituye el stock descontado por cada línea (reverso de fn_aplicar_venta)
    FOR detalle_row IN
        SELECT producto_id, cantidad FROM detalle_venta WHERE venta_id = p_venta_id
    LOOP
        FOR receta_row IN
            SELECT ingrediente_id, cantidad_necesaria
              FROM recetas
             WHERE producto_id = detalle_row.producto_id
        LOOP
            v_restituido := receta_row.cantidad_necesaria * detalle_row.cantidad;

            SELECT stock_actual INTO v_stock_previo
              FROM stock_sucursal
             WHERE ingrediente_id = receta_row.ingrediente_id
               AND sucursal_id = v_venta.sucursal_id
             FOR UPDATE;

            v_nuevo_stock := COALESCE(v_stock_previo, 0) + v_restituido;

            UPDATE stock_sucursal
               SET stock_actual = v_nuevo_stock,
                   actualizado_en = now()
             WHERE ingrediente_id = receta_row.ingrediente_id
               AND sucursal_id = v_venta.sucursal_id;

            INSERT INTO movimientos_stock
                (ingrediente_id, sucursal_id, tipo_movimiento, cantidad, stock_resultante, referencia_tipo, referencia_id, nota)
            VALUES
                (receta_row.ingrediente_id, v_venta.sucursal_id, 'ajuste', v_restituido, v_nuevo_stock, 'venta', p_venta_id, 'Restitución por anulación de venta');
        END LOOP;
    END LOOP;

    UPDATE ventas
       SET anulada = TRUE,
           anulada_en = now(),
           anulada_por = p_usuario_id,
           motivo_anulacion = p_motivo
     WHERE id = p_venta_id
    RETURNING * INTO v_venta;

    RETURN v_venta;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_anular_venta(INTEGER, INTEGER, TEXT) TO web_anon;
