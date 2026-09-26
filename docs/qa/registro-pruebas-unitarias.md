# Registro y Bitácora de Pruebas Unitarias — NuryBase

Este documento mantiene el inventario y resultado real de las pruebas ejecutadas. Debe actualizarse cada vez que una IA o participante cree o ejecute pruebas.

## Resumen de última ejecución

- **Fecha:** 25 de septiembre de 2026
- **Rama:** `Patricio2_branch`
- **Entorno:** Angular 22.1 / Vitest 4.1.11 / Node 24
- **Suites:** 13 aprobadas de 13
- **Pruebas:** 107 aprobadas de 107
- **Duración:** 15.44 segundos
- **Resultado:** PASS, 0 fallos y 0 omitidas
- **Comando:** `npm test -- --watch=false --reporters=verbose`
- **Build:** `npm run build` aprobado el 25-09-2026, 0 errores y 0 advertencias
- **Validación de API:** matriz de lectura real por rol y permisos efectivos de PostgreSQL en `docs/qa/seguridad-roles.md`
- **Aviso del runner:** sourcemaps externos al paquete en `@zxing/browser`; no afectaron las pruebas.

> El registro del 19-09 indicaba 69 pruebas en esta rama. La implementación anterior de anulación sigue pendiente de reconstrucción y verificación.

## Inventario por suite — 25-09-2026

| Archivo | Pruebas | Estado |
| --- | ---: | --- |
| `src/app/app.spec.ts` | 2 | PASS |
| `src/app/core/api/productos-api.service.spec.ts` | 4 | PASS |
| `src/app/core/guards/auth.guard.spec.ts` | 13 | PASS |
| `src/app/core/services/barcode-scanner.spec.ts` | 1 | PASS |
| `src/app/features/auth/pages/login/login.component.spec.ts` | 9 | PASS |
| `src/app/features/auth/services/auth.service.spec.ts` | 8 | PASS |
| `src/app/features/caja/pages/cierre-caja/cierre-caja.component.spec.ts` | 10 | PASS |
| `src/app/features/caja/services/caja.service.spec.ts` | 7 | PASS |
| `src/app/features/pos/components/payment-modal/payment-modal.component.spec.ts` | 17 | PASS |
| `src/app/features/pos/pages/pos-layout/pos-layout.component.spec.ts` | 9 | PASS |
| `src/app/features/pos/services/pos.service.spec.ts` | 5 | PASS |
| `src/app/features/products/pages/product-master/product-master.spec.ts` | 10 | PASS |
| `src/app/layout/sidebar/sidebar.spec.ts` | 8 | PASS |

## Retiro de perfiles demo del Login — ejecución del 25-09-2026

- Se retiró la sección de botones de acceso rápido y perfiles de demostración (`quick-access-section`, `demoAccounts`) de la pantalla de login (`login.component.html`, `login.component.ts`, `login.component.css`).
- Se validó mediante prueba unitaria en `login.component.spec.ts` que los botones y tarjetas de perfil de prueba no se renderizan en el template.
- Se configuró el consumo dinámico de `environment.apiUrl` en las suites de pruebas de autenticación y API para soportar cualquier URL de endpoint sin desacoples.
- Se aseguró el aislamiento de `TestBed` en `barcode-scanner.spec.ts`.
- Resultado automático: 13/13 suites aprobadas, 107/107 pruebas exitosas. Compilación en modo producción sin errores ni advertencias (`npm run build`).

## AuthGuard y sesión — ejecución del 19-09-2026

- Redirección exacta a `/login?returnUrl=%2Fpos` cuando no existe sesión.
- Acceso permitido con sesión válida.
- Bloqueo inmediato después de cerrar sesión.
- Bloqueo y limpieza de una sesión expirada.
- Restauración de sesión vigente desde `sessionStorage`.
- Expiración del TTL de 8 horas sin necesidad de recargar la pestaña.
- Regreso a una ruta interna solicitada después del login.
- Rechazo de `returnUrl` externo y fallback seguro a `/pos`.

## Roles UI por usuario de PostgreSQL — ejecución del 19-09-2026

- El sidebar no fija roles localmente: consume `AuthService.currentUser().rol`, obtenido desde `public.login()` mediante PostgREST.
- Cajero: muestra Home, Punto de venta y Caja.
- Bodeguero: muestra Home, Maestro Productos e Inventario.
- Administrador: muestra todas las opciones disponibles.
- Sin usuario autenticado: no renderiza enlaces dependientes de rol.
- Verificación de integración local: las tres cuentas de desarrollo devolvieron desde PostgreSQL los roles `cajero`, `admin` y `bodeguero` esperados.
- El login envía al bodeguero a `/product-master` y descarta un `returnUrl` al POS, que no está visible para su rol.
- Resultado automático: 5/5 pruebas del sidebar, 8/8 del login y 69/69 pruebas totales aprobadas.
- Validación asistida en navegador integrado: cajero, administrador y bodeguero mostraron sus menús esperados; aprobada por Patricio el 19 de septiembre de 2026.

### Revalidación — 25-09-2026

- `npm test -- --watch=false --reporters=verbose`: 13/13 suites y 107/107 pruebas aprobadas; incluye que bodeguero no ve ni puede abrir `/product-master`.
- `npm run build`: compilación de producción aprobada, sin errores ni advertencias.

## Procedimiento obligatorio

1. Ejecutar `npm test -- --watch=false --reporters=verbose`.
2. Registrar suites, casos nuevos, fecha, rama y resultado real.
3. Ejecutar `npm run build` y registrar errores o advertencias.
4. No marcar una tarea como finalizada hasta completar también su revisión manual cuando corresponda.

## Catálogo POS con categorías reales — 24-09-2026

- **Rama:** `Patricio2_branch`
- **Cambios:** Categorías derivadas del campo `productos.categoria`; filtro por nombre real; “Sin categoría” para valores vacíos.
- **Pruebas:** `npm test -- --watch=false --reporters=verbose` no pudo completar la compilación del bundle. Angular/esbuild reportó `Acceso denegado` al leer directorios del workspace y resolver CSS y dependencias locales. Una primera ejecución también detectó fixtures numéricos; fueron actualizados al nuevo tipo string antes del segundo intento.
- **Resultado:** Sin conteo de pruebas ejecutadas; suite bloqueada antes de su inicio por acceso al filesystem. No registrar como PASS.
- **Build:** `npm run build` también falló antes de compilar por `Acceso denegado` al resolver archivos del workspace y estilos globales; no atribuido a errores de TypeScript del cambio.
