-- =====================================================================
-- fn_anular_venta: anula una venta de forma atómica.
--
--   1) Exige que quien llama sea admin (JWT app_role) — "fuera del
--      alcance autorizado" queda bloqueado aquí mismo, no solo
--      escondiendo el botón en el frontend.
--   2) Exige que el turno en el que ocurrió la venta siga abierto (una
--      vez cerrado y cuadrado, los totales ya se reportaron y no deben
--      cambiar retroactivamente). Sí, esto significa que después de
--      cerrar sesión (que obliga a cerrar caja) esa venta ya no se
--      puede anular — es la regla que pide el criterio de aceptación.
--   3) Marca la venta como anulada (nunca DELETE, para no perder rastro).
--   4) Restituye el stock descontado por receta, línea por línea,
--      revirtiendo exactamente lo que hizo fn_aplicar_venta().
--
-- Se queda en una sola función PL/pgSQL para que todo corra en una
-- única transacción: si algo falla a mitad de camino (ej. un producto
-- sin receta), Postgres revierte todo y la venta queda intacta. Por
-- eso los chequeos de autorización van ANTES de tocar stock: así un
-- rechazo nunca deja restituciones a medio aplicar.
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
    v_app_role      TEXT;
    v_turno_abierto BOOLEAN;
    detalle_row     RECORD;
    receta_row      RECORD;
    v_restituido    NUMERIC(12,3);
    v_stock_previo  NUMERIC(12,3);
    v_nuevo_stock   NUMERIC(12,3);
BEGIN
    v_app_role := current_setting('request.jwt.claims', true)::json->>'app_role';

    IF v_app_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'No tienes autorización para anular ventas.' USING ERRCODE = '42501';
    END IF;

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

    IF v_venta.cajero_id IS NULL THEN
        RAISE EXCEPTION 'No se puede anular una venta sin cajero asignado: no hay forma de validar su turno.';
    END IF;

    SELECT EXISTS (
        SELECT 1
          FROM turnos t
         WHERE t.usuario_id = v_venta.cajero_id
           AND t.sucursal_id = v_venta.sucursal_id
           AND t.hora_inicio <= v_venta.fecha_venta
           AND t.hora_fin IS NULL
    ) INTO v_turno_abierto;

    IF NOT v_turno_abierto THEN
        RAISE EXCEPTION 'No se puede anular: el turno de esta venta ya está cerrado.';
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
