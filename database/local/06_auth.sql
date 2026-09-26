-- Autenticación local de desarrollo.
-- En producción, reemplazar el secreto y usar un gestor de secretos.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- El modelo inicial solo contemplaba cajero/administrador. Se incluye
-- bodeguero porque el frontend ya contempla ese perfil operativo.
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check
    CHECK (rol IN ('cajero', 'administrador', 'bodeguero'));

INSERT INTO usuarios (
    nombre, identificador_acceso, password_hash, rol, sucursal_id,
    debe_cambiar_password, activo
)
VALUES
    ('Cajero Demo', 'cajero@gmail.com', crypt('cajero123', gen_salt('bf')), 'cajero', 1, FALSE, TRUE),
    ('Admin Demo', 'admin@gmail.com', crypt('admin123', gen_salt('bf')), 'administrador', NULL, FALSE, TRUE),
    ('Bodeguero Demo', 'bodeguero@gmail.com', crypt('bodeguero123', gen_salt('bf')), 'bodeguero', 1, FALSE, TRUE)
ON CONFLICT (identificador_acceso) DO NOTHING;

CREATE OR REPLACE FUNCTION public.login(p_identificador text, p_contrasena text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_usuario usuarios%ROWTYPE;
    v_header text := '{"alg":"HS256","typ":"JWT"}';
    v_payload text;
    v_token text;
    v_secret text := 'nurybase-dev-jwt-secret-change-me';
    v_now bigint := extract(epoch FROM clock_timestamp())::bigint;
BEGIN
    SELECT * INTO v_usuario
      FROM usuarios
     WHERE lower(identificador_acceso) = lower(trim(p_identificador))
       AND activo = TRUE;

    IF NOT FOUND OR NOT (v_usuario.password_hash = crypt(p_contrasena, v_usuario.password_hash)) THEN
        RAISE EXCEPTION 'Credenciales inválidas' USING ERRCODE = '28000';
    END IF;

    v_payload := json_build_object(
        'sub', v_usuario.id::text,
        'role', CASE v_usuario.rol
            WHEN 'administrador' THEN 'nury_admin'
            WHEN 'cajero' THEN 'nury_cajero'
            WHEN 'bodeguero' THEN 'nury_bodeguero'
        END,
        'app_role', CASE WHEN v_usuario.rol = 'administrador' THEN 'admin' ELSE v_usuario.rol END,
        'exp', v_now + 28800,
        'iat', v_now
    )::text;

    -- PostgreSQL inserta saltos de línea en base64 cuando la salida supera
    -- 76 caracteres. Deben eliminarse porque un JWT va en un header HTTP.
    v_token := replace(replace(replace(replace(encode(convert_to(v_header, 'UTF8'), 'base64'), E'\n', ''), '+', '-'), '/', '_'), '=', '')
        || '.'
        || replace(replace(replace(replace(encode(convert_to(v_payload, 'UTF8'), 'base64'), E'\n', ''), '+', '-'), '/', '_'), '=', '')
        || '.'
        || replace(replace(replace(encode(hmac(
            replace(replace(replace(replace(encode(convert_to(v_header, 'UTF8'), 'base64'), E'\n', ''), '+', '-'), '/', '_'), '=', '')
            || '.'
            || replace(replace(replace(replace(encode(convert_to(v_payload, 'UTF8'), 'base64'), E'\n', ''), '+', '-'), '/', '_'), '=', ''),
            v_secret,
            'sha256'
        ), 'base64'), '+', '-'), '/', '_'), '=', '');

    RETURN json_build_object(
        'token', v_token,
        'user', json_build_object(
            'id', v_usuario.id,
            'nombre', v_usuario.nombre,
            'identificadorAcceso', v_usuario.identificador_acceso,
            'rol', CASE WHEN v_usuario.rol = 'administrador' THEN 'admin' ELSE v_usuario.rol END,
            'sucursalId', v_usuario.sucursal_id,
            'sucursalNombre', COALESCE((SELECT nombre FROM sucursales WHERE id = v_usuario.sucursal_id), 'Casa Central (Todas)'),
            'activo', v_usuario.activo
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.login(text, text) TO web_anon;
