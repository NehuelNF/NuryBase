-- =====================================================================
-- Apertura y cierre de turno contra la tabla real `turnos`.
--
-- Hasta ahora "iniciar/cerrar turno" solo era un estado en memoria del
-- navegador (PosService.isRegisterOpen); nunca se insertaba nada en
-- `turnos`. Estas dos funciones lo dejan persistido de verdad, para
-- reportes por turno y para saber cuándo empezó/terminó cada sesión
-- de caja (fn_anular_venta ya no depende de esto: ver 08_anulacion_venta.sql).
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_abrir_turno(p_usuario_id INTEGER, p_sucursal_id INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_turno_id INTEGER;
    v_sub      INTEGER;
BEGIN
    -- Nadie puede abrir un turno a nombre de otro usuario, salvo un admin.
    v_sub := NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::integer;
    IF v_sub IS DISTINCT FROM p_usuario_id
       AND current_setting('request.jwt.claims', true)::json->>'app_role' IS DISTINCT FROM 'admin'
    THEN
        RAISE EXCEPTION 'No puedes abrir un turno a nombre de otro usuario.' USING ERRCODE = '42501';
    END IF;

    -- Idempotente: si el usuario ya tiene un turno abierto, se reutiliza
    -- en vez de crear uno nuevo (doble click, refrescar la página, etc.).
    SELECT id INTO v_turno_id
      FROM turnos
     WHERE usuario_id = p_usuario_id
       AND hora_fin IS NULL
     ORDER BY hora_inicio DESC
     LIMIT 1;

    IF v_turno_id IS NOT NULL THEN
        RETURN v_turno_id;
    END IF;

    INSERT INTO turnos (usuario_id, sucursal_id, hora_inicio)
    VALUES (p_usuario_id, p_sucursal_id, now())
    RETURNING id INTO v_turno_id;

    RETURN v_turno_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_cerrar_turno(p_turno_id INTEGER)
RETURNS turnos
LANGUAGE plpgsql
AS $$
DECLARE
    v_turno turnos%ROWTYPE;
BEGIN
    SELECT * INTO v_turno FROM turnos WHERE id = p_turno_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El turno % no existe.', p_turno_id;
    END IF;

    IF v_turno.usuario_id IS DISTINCT FROM NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::integer
       AND current_setting('request.jwt.claims', true)::json->>'app_role' IS DISTINCT FROM 'admin'
    THEN
        RAISE EXCEPTION 'No puedes cerrar el turno de otro usuario.' USING ERRCODE = '42501';
    END IF;

    IF v_turno.hora_fin IS NOT NULL THEN
        RAISE EXCEPTION 'El turno % ya estaba cerrado.', p_turno_id;
    END IF;

    UPDATE turnos SET hora_fin = now() WHERE id = p_turno_id
    RETURNING * INTO v_turno;

    RETURN v_turno;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_abrir_turno(INTEGER, INTEGER) TO web_anon;
GRANT EXECUTE ON FUNCTION fn_cerrar_turno(INTEGER) TO web_anon;
