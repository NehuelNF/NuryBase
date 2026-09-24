# Base de datos

PostgreSQL + PostgREST corriendo localmente vía Docker (ver
`GUIA_LEVANTAMIENTO_LOCAL.md`). El frontend ya está conectado: login,
catálogo de productos y registro de ventas pasan por PostgREST.

## Estructura

- `schema_nury.sql` — esquema base (tablas, triggers, `fn_registrar_venta`).
- `seed/` — datos de ejemplo (productos, proveedores).
- `local/` — todo lo que solo aplica al entorno de desarrollo local, en
  orden numerado. Se monta en `infra/docker-compose.yml` bajo
  `docker-entrypoint-initdb.d`, así que solo corre una vez, cuando el
  volumen de Postgres está vacío (`docker compose down -v` + `up -d`
  para reaplicar todo desde cero).
  - `04_roles.sql` — roles de PostgREST (`web_anon`, `authenticator`).
  - `05_sucursal.sql` — sucursal inicial.
  - `06_auth.sql` — usuarios de prueba + función `login()` (JWT).
  - `07_turnos.sql` — `fn_abrir_turno` / `fn_cerrar_turno`.
  - `08_anulacion_venta.sql` — `fn_anular_venta` (anula venta y restituye
    stock; se puede anular sin importar si el turno sigue abierto, ver
    nota abajo).

## Notas

- `ventas.medio_pago` es texto libre (sin CHECK), así que el POS puede
  usar `'efectivo' | 'tarjeta' | 'junaeb'` sin conflicto con lo que
  documenta el esquema (`efectivo/debito/credito/transferencia`).
- Anular una venta nunca hace `DELETE`: solo marca
  `ventas.anulada = true` y revierte el stock con un movimiento de
  tipo `ajuste` (mismo patrón que ya usa el esquema para compras/ventas),
  para no perder el rastro de auditoría.
- `fn_anular_venta` originalmente exigía que el turno de la venta
  siguiera abierto (para no descuadrar un cierre ya reportado), pero
  como cerrar sesión ya obliga a cerrar caja primero, esa regla dejaba
  la función casi inutilizable en el flujo real — se sacó a propósito.
