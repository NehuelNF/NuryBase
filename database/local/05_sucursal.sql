INSERT INTO sucursales (
    nombre,
    direccion,
    telefono
)
VALUES (
    'Nury Providencia',
    'Providencia, Santiago',
    '+56900000000'
)
ON CONFLICT (nombre) DO NOTHING;