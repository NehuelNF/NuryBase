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

GRANT SELECT, INSERT, UPDATE, DELETE
ON ALL TABLES IN SCHEMA public
TO web_anon;

GRANT USAGE, SELECT, UPDATE
ON ALL SEQUENCES IN SCHEMA public
TO web_anon;

GRANT EXECUTE
ON ALL FUNCTIONS IN SCHEMA public
TO web_anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO web_anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO web_anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
GRANT EXECUTE ON FUNCTIONS TO web_anon;