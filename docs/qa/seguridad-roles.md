# Seguridad: bloqueo de rutas y endpoints por rol

Fecha: 24 de septiembre de 2026. Rama: `Patricio2_branch`.

## Hallazgo inicial

El guard verificaba únicamente la existencia de sesión. Los JWT de los tres usuarios usaban el mismo rol PostgreSQL `web_anon`, que tenía lectura y escritura sobre todas las tablas. Una petición anónima y las cuentas cajero/bodeguero obtenían `200` en `/usuarios`.

## Rutas Angular

`/pos` y `/caja`: admin y cajero. `/product-master`: solo admin. El bodeguero no tiene permiso para abrir esa ruta y se redirige a `/sin-acceso`. Acceso sin sesión redirige a `/login`. Nueve combinaciones de rol/ruta cubiertas por pruebas unitarias. La protección de datos reside también en PostgreSQL porque una ruta del navegador por sí sola no protege la API.

Verificación manual anterior, el 24-09-2026: cajero `/product-master` → `/caja`; bodeguero `/pos` y `/caja` → `/product-master`; admin permanecía en `/pos` y `/product-master`. Este resultado del bodeguero fue reemplazado por la aclaración y corrección del 25-09-2026.

### Aclaración y revalidación manual — 25-09-2026

- Aclaración de Patricio: bodeguero no debe tener acceso al Maestro de productos.
- Hallazgo inicial: bodeguero veía el enlace «Maestro de productos» y podía abrir `/product-master`.
- Corrección: la ruta y el enlace quedan solo para admin; URL directa y `returnUrl` no autorizada del bodeguero terminan en `/sin-acceso`.
- Bodeguero: el inicio de sesión termina en «Acceso restringido»; el menú ya no muestra «Maestro de productos» y conserva «Inventario». La ruta `/inventario` todavía no tiene vista implementada. La navegación directa a `/product-master` vuelve a `/sin-acceso` y no monta el componente de catálogo.
- Admin: conserva acceso a «Maestro de productos»; la pantalla cargó los 370 productos locales. «Administración» sigue sin ruta registrada.
- Sin sesión: `/pos` redirige a `/login?returnUrl=%2Fpos`.
- Vista «Acceso restringido» revisada en 1440, 1280, 1100, 1102, 768 y 390 px; sin desbordamiento horizontal. Al solicitar 1101 px, el navegador reportó 1102 px.
- Resultado tras la corrección: PASS en bloqueo de Maestro de productos para bodeguero y en filtrado de menú; Inventario y Administración siguen pendientes de sus vistas/rutas.

## Endpoints PostgREST, prueba real

Los códigos se obtuvieron tras iniciar sesión con las cuentas locales. Cada consulta GET usó `?select=id&limit=1`.

| Rol | `/productos` | `/usuarios` | `/ventas` | `/ingredientes` |
| --- | ---: | ---: | ---: | ---: |
| Anónimo | 401 | 401 | — | — |
| Cajero | 200 | 403 | 403 | 403 |
| Bodeguero | 200 | 403 | 403 | 200 |
| Admin | 200 | 200 | 200 | 200 |

El bodeguero conserva lectura de `/productos` para Inventario. Tras aplicar la migración actualizada, `has_table_privilege` debe dar `false` para INSERT, UPDATE y DELETE de `public.productos` con el rol `nury_bodeguero`. El cajero tampoco puede modificar productos ni ventas directamente; anónimo carece de permisos de datos.

`/rpc/fn_registrar_venta` con `p_items: []` devolvió el error de validación esperado (400) a cajero/admin y 403 a bodeguero. La llamada no creó una venta.

## Implementación y ejecución

- `database/local/07_seguridad_roles.sql` revoca los permisos amplios, crea los roles del JWT y concede acceso mínimo según el flujo actual. Es idempotente para un volumen existente.
- El 25-09 se actualizó `07_seguridad_roles.sql` para dejar los productos en solo lectura para bodeguero. La aplicación local de ese cambio está pendiente: el contenedor existente no tiene montado ese archivo. No se borró ni modificó el volumen; `06_auth.sql` sí se volvió a aplicar correctamente.
- `database/local/06_auth.sql` emite el rol PostgreSQL que corresponde al usuario. Se aplicaron ambos scripts, en ese orden, a la base Docker local sin borrar datos.
- `npm test -- --watch=false --reporters=verbose`: 13 suites y 102 pruebas aprobadas; 9 casos nuevos del guard por rol.
- `npm run build`: aprobado, 0 errores y 0 advertencias. Los intentos iniciales dentro del sandbox fallaron al resolver archivos con `Acceso denegado`; ambos comandos pasaron con acceso ampliado al workspace.

La tarjeta Trello ya estaba asignada a Patricio y ubicada en la lista activa «En progreso». El ID de esa lista en `AGENTS.md` está desactualizado; el tablero devuelve `6aa1663b34750a80b909be0e`.

Las sesiones JWT emitidas antes de aplicar el cambio mantienen el rol anterior `web_anon` hasta que el usuario cierre sesión y vuelva a entrar. Ese rol ya no tiene acceso a datos.
