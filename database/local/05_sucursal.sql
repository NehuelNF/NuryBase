INSERT INTO sucursales (nombre, direccion, activo)
VALUES ('Nury Providencia', 'Desarrollo local', TRUE)
ON CONFLICT (nombre) DO NOTHING;
