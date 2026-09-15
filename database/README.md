# Base de datos

Este proyecto todavía no tiene un backend/base de datos conectado — el
POS, login y caja funcionan hoy con datos en memoria dentro de Angular
(`PosService`, `AuthService`). Esta carpeta guarda el SQL para cuando
se conecte a la base real (PostgreSQL vía PostgREST/Supabase, según lo
mencionado en `docs/qa/h2-2-catalogo.md`).

Los tipos de TypeScript en `src/app/core/models/` fueron generados a
partir de `nury_schema.sql` (ese archivo solo existe en la máquina de
Nelson, no está en este repo), así que son la mejor referencia
disponible del esquema real — pero revisa contra el `.sql` original
antes de aplicar cualquier archivo de aquí a una base de verdad.

## Estructura

- `migrations/` — cambios al esquema, en orden (prefijo numérico).
- `functions/` — funciones RPC en PL/pgSQL, una por archivo.

## Pendiente conocido

`core/models/comun.model.ts` define `MedioPago` como
`'efectivo' | 'debito' | 'credito' | 'transferencia'`, pero el POS
(`features/pos/models/pos.model.ts`) usa
`'efectivo' | 'tarjeta' | 'junaeb'`. Son dos cosas distintas hoy:
cuando se conecte el POS a la base real, alguien tiene que decidir
cómo mapear "tarjeta" a débito/crédito y dónde vive Junaeb (¿un medio
de pago más en el enum, o una tabla de convenios aparte?). La función
`cuadrar_y_cerrar_turno` está escrita contra el enum de la base
(`efectivo/debito/credito/transferencia`), no contra el del POS.
