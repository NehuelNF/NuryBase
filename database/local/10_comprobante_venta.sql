-- =====================================================================
-- Comprobante persistido: hasta ahora el monto recibido, el vuelto y el
-- código de autorización (tarjeta/Junaeb) solo vivían en el navegador
-- (PosService.CompletedSale) y se perdían al recargar la página. Esta
-- migración los guarda en `ventas` para que el comprobante sea
-- consultable después, no solo imprimible en el momento.
-- =====================================================================

ALTER TABLE ventas ADD COLUMN IF NOT EXISTS monto_recibido NUMERIC(12,2);
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS vuelto NUMERIC(12,2);
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS codigo_autorizacion VARCHAR(60);
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS titular_junaeb VARCHAR(120);
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS saldo_restante_junaeb NUMERIC(12,2);

-- Se reemplaza fn_registrar_venta (schema_nury.sql) por una versión que
-- además recibe y guarda esos datos de pago. Los 5 parámetros nuevos son
-- opcionales (DEFAULT NULL): cualquier otro llamador que solo mande los
-- 4 originales (sucursal, cajero, medio de pago, items) sigue funcionando
-- igual que antes. Se elimina primero la firma vieja de 4 parámetros
-- para no dejar dos versiones de la función coexistiendo (PostgREST no
-- sabría cuál elegir).
DROP FUNCTION IF EXISTS fn_registrar_venta(INTEGER, INTEGER, VARCHAR, JSONB);

CREATE OR REPLACE FUNCTION fn_registrar_venta(
    p_sucursal_id           INTEGER,
    p_cajero_id             INTEGER,
    p_medio_pago            VARCHAR,
    p_items                 JSONB,
    p_monto_recibido        NUMERIC DEFAULT NULL,
    p_vuelto                NUMERIC DEFAULT NULL,
    p_codigo_autorizacion   VARCHAR DEFAULT NULL,
    p_titular_junaeb        VARCHAR DEFAULT NULL,
    p_saldo_restante_junaeb NUMERIC DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_venta_id      INTEGER;
    item            JSONB;
    v_producto_id   INTEGER;
    v_precio_lista  NUMERIC(12,2);
    v_precio_final  NUMERIC(12,2);
    v_promocion_id  INTEGER;
    v_cantidad      NUMERIC(12,3);
BEGIN
    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'La venta no tiene productos';
    END IF;

    INSERT INTO ventas (
        sucursal_id, cajero_id, medio_pago,
        monto_recibido, vuelto, codigo_autorizacion,
        titular_junaeb, saldo_restante_junaeb
    )
    VALUES (
        p_sucursal_id, p_cajero_id, p_medio_pago,
        p_monto_recibido, p_vuelto, p_codigo_autorizacion,
        p_titular_junaeb, p_saldo_restante_junaeb
    )
    RETURNING id INTO v_venta_id;

    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT id, precio_venta INTO v_producto_id, v_precio_lista
          FROM productos
         WHERE nombre = item->>'producto' AND activo = TRUE;

        IF v_producto_id IS NULL THEN
            RAISE EXCEPTION 'Producto no encontrado o inactivo: %', item->>'producto';
        END IF;

        v_cantidad     := (item->>'cantidad')::NUMERIC;
        v_promocion_id := NULLIF(item->>'promocion_id', '')::INTEGER;
        v_precio_final := COALESCE((item->>'precio_unitario')::NUMERIC, v_precio_lista);

        INSERT INTO detalle_venta (venta_id, producto_id, promocion_id, cantidad, precio_lista, precio_unitario)
        VALUES (v_venta_id, v_producto_id, v_promocion_id, v_cantidad, v_precio_lista, v_precio_final);
    END LOOP;

    RETURN v_venta_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION fn_registrar_venta(
    INTEGER, INTEGER, VARCHAR, JSONB, NUMERIC, NUMERIC, VARCHAR, VARCHAR, NUMERIC
) TO web_anon;
