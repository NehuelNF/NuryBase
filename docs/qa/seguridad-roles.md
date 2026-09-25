# Seguridad: bloqueo de rutas y endpoints por rol

Fecha: 24 de septiembre de 2026. Rama: `Patricio2_branch`.

## Hallazgo inicial

El guard verificaba únicamente la existencia de sesión. Los JWT de los tres usuarios usaban el mismo rol PostgreSQL `web_anon`, que tenía lectura y escritura sobre todas las tablas. Una petición anónima y las cuentas cajero/bodeguero obtenían `200` en `/usuarios`.

## Rutas Angular

`/pos` y `/caja`: admin y cajero. `/product-master`: admin y bodeguero. Acceso sin sesión redirige a `/login`; acceso con rol no permitido redirige a la página inicial del rol. Nueve combinaciones de rol/ruta cubiertas por pruebas unitarias. La protección de datos reside también en PostgreSQL porque una ruta del navegador por sí sola no protege la API.

Navegación directa en Chrome con sesiones reales: cajero `/product-master` → `/caja`; bodeguero `/pos` y `/caja` → `/product-master`; admin permanece en `/pos` y `/product-master`.

## Endpoints PostgREST, prueba real

Los códigos se obtuvieron tras iniciar sesión con las cuentas locales. Cada consulta GET usó `?select=id&limit=1`.

| Rol | `/productos` | `/usuarios` | `/ventas` | `/ingredientes` |
| --- | ---: | ---: | ---: | ---: |
| Anónimo | 401 | 401 | — | — |
| Cajero | 200 | 403 | 403 | 403 |
| Bodeguero | 200 | 403 | 403 | 200 |
| Admin | 200 | 200 | 200 | 200 |

`/rpc/fn_registrar_venta` con `p_items: []` devolvió el error de validación esperado (400) a cajero/admin y 403 a bodeguero. La llamada no creó una venta. La consulta `has_table_privilege` confirmó que cajero no puede insertar productos ni ventas directamente; bodeguero puede insertar productos, pero no leer usuarios ni insertar ventas; anónimo carece de esos permisos.

## Implementación y ejecución

- `database/local/07_seguridad_roles.sql` revoca los permisos amplios, crea los roles del JWT y concede acceso mínimo según el flujo actual. Es idempotente para un volumen existente.
- `database/local/06_auth.sql` emite el rol PostgreSQL que corresponde al usuario. Se aplicaron ambos scripts, en ese orden, a la base Docker local sin borrar datos.
- `npm test -- --watch=false --reporters=verbose`: 13 suites y 102 pruebas aprobadas; 9 casos nuevos del guard por rol.
- `npm run build`: aprobado, 0 errores y 0 advertencias. Los intentos iniciales dentro del sandbox fallaron al resolver archivos con `Acceso denegado`; ambos comandos pasaron con acceso ampliado al workspace.

La tarjeta Trello ya estaba asignada a Patricio y ubicada en la lista activa «En progreso». El ID de esa lista en `AGENTS.md` está desactualizado; el tablero devuelve `6aa1663b34750a80b909be0e`.

Las sesiones JWT emitidas antes de aplicar el cambio mantienen el rol anterior `web_anon` hasta que el usuario cierre sesión y vuelva a entrar. Ese rol ya no tiene acceso a datos.
