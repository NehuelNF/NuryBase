# Registro y Bitácora de Pruebas Unitarias — NuryBase

Este documento mantiene el inventario y resultado real de las pruebas ejecutadas. Debe actualizarse cada vez que una IA o participante cree o ejecute pruebas.

## Resumen de última ejecución

- **Fecha:** 19 de septiembre de 2026
- **Rama:** `Patricio2_branch`
- **Entorno:** Angular 22.1 / Vitest 4.1.11 / Node 24
- **Suites:** 11 aprobadas de 11
- **Pruebas:** 63 aprobadas de 63
- **Duración:** 7.36 segundos
- **Resultado:** PASS, 0 fallos y 0 omitidas
- **Comando:** `npm test -- --watch=false --reporters=verbose`
- **Build:** `npm run build` aprobado, 0 errores y 0 advertencias
- **Validación manual:** aprobada por Patricio el 19 de septiembre de 2026

> El registro anterior indicaba 70 pruebas en `Patricio_Branch`. La rama actual contiene 63; las pruebas y la implementación anterior de anulación no están presentes y esa tarea volvió a quedar pendiente.

## Inventario por suite

| Archivo | Pruebas | Estado |
| --- | ---: | --- |
| `src/app/app.spec.ts` | 2 | PASS |
| `src/app/core/guards/auth.guard.spec.ts` | 4 | PASS |
| `src/app/features/auth/pages/login/login.component.spec.ts` | 6 | PASS |
| `src/app/features/auth/services/auth.service.spec.ts` | 8 | PASS |
| `src/app/features/caja/pages/cierre-caja/cierre-caja.component.spec.ts` | 5 | PASS |
| `src/app/features/caja/services/caja.service.spec.ts` | 2 | PASS |
| `src/app/features/pos/components/payment-modal/payment-modal.component.spec.ts` | 17 | PASS |
| `src/app/features/pos/pages/pos-layout/pos-layout.component.spec.ts` | 12 | PASS |
| `src/app/features/pos/services/pos.service.spec.ts` | 5 | PASS |
| `src/app/features/products/pages/product-master/product-master.spec.ts` | 1 | PASS |
| `src/app/layout/sidebar/sidebar.spec.ts` | 1 | PASS |

## AuthGuard y sesión — ejecución del 19-09-2026

- Redirección exacta a `/login?returnUrl=%2Fpos` cuando no existe sesión.
- Acceso permitido con sesión válida.
- Bloqueo inmediato después de cerrar sesión.
- Bloqueo y limpieza de una sesión expirada.
- Restauración de sesión vigente desde `sessionStorage`.
- Expiración del TTL de 8 horas sin necesidad de recargar la pestaña.
- Regreso a una ruta interna solicitada después del login.
- Rechazo de `returnUrl` externo y fallback seguro a `/pos`.

## Procedimiento obligatorio

1. Ejecutar `npm test -- --watch=false --reporters=verbose`.
2. Registrar suites, casos nuevos, fecha, rama y resultado real.
3. Ejecutar `npm run build` y registrar errores o advertencias.
4. No marcar una tarea como finalizada hasta completar también su revisión manual cuando corresponda.
