DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_roles WHERE rolname = 'web_anon'
    ) THEN
        CREATE ROLE web_anon NOLOGIN;
    END IF;

    IF NOT EXISTS (
        SELECT FROM pg_roles WHERE rolname = 'authenticator'
    ) THEN
        CREATE ROLE authenticator
            NOINHERIT
            LOGIN
            PASSWORD 'postgrest_local_only';
    END IF;
END
$$;

ALTER ROLE authenticator
    PASSWORD 'postgrest_local_only';

GRANT web_anon TO authenticator;

GRANT USAGE ON SCHEMA public TO web_anon;
