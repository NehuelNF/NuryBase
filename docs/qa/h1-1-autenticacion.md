# Revisión de aceptación: H1.1 Autenticación de usuarios

Fecha de última actualización: 19 de septiembre de 2026. Rama: `Patricio2_branch`.

## Resultado

Los cuatro criterios están implementados. Las credenciales se validan mediante el RPC `public.login` expuesto por PostgREST, que devuelve el JWT y los datos del usuario. El frontend protege las rutas privadas con `authGuard`, conserva la sesión por un máximo de ocho horas y la invalida al cerrar sesión o vencer el TTL.

| Criterio de Trello | Evidencia | Resultado |
| --- | --- | --- |
| Con credenciales válidas, el usuario puede iniciar sesión y acceder al sistema. | `AuthService.login()` valida contra la cuenta y abre sesión (token + usuario en `sessionStorage`, 8h de expiración); `LoginComponent.submit()` redirige a `/pos` (o a `returnUrl`). | Cumple |
| Con credenciales inválidas, el sistema rechaza el acceso y muestra un mensaje de error. | `AuthService.login()` devuelve `{ success: false, message }` si no hay coincidencia o la cuenta está inactiva; `LoginComponent` muestra ese mensaje en un banner de error sin abrir sesión. | Cumple |
| Después de cerrar sesión, la sesión/token deja de ser válida. | `AuthService.logout()` limpia el token, el usuario y `sessionStorage`; `authGuard` bloquea de inmediato cualquier ruta protegida (`/pos`, `/caja`, `/home`) hasta un nuevo login. Antes de esta tarea no existía ningún guard — las rutas eran públicas y el usuario quedaba "logueado" por defecto incluso sin pasar por login. | Cumple |
| Los valores de los campos deben ser validados a nivel de código, no pueden ser nulos, etc. | `LoginComponent.form` usa Reactive Forms con `Validators.required` (+ validador de espacios en blanco) en usuario, y `required` + `minLength(4)` en contraseña; `AuthService.login()` también rechaza credenciales vacías de forma independiente del formulario. | Cumple |

## Evidencia automatizada

Archivos: `src/app/features/auth/services/auth.service.spec.ts`, `src/app/features/auth/pages/login/login.component.spec.ts` y `src/app/core/guards/auth.guard.spec.ts`.

- `AuthService`: no queda autenticado por defecto; rechaza credenciales vacías sin tocar la lista de cuentas; rechaza credenciales inválidas con mensaje; login válido abre sesión y expone el rol (`isCajero`); logout limpia usuario, token y `sessionStorage`.
- `LoginComponent`: formulario inválido con campos vacíos; no llama al servicio si el formulario es inválido (y marca los campos como tocados); el acceso rápido de demo completa el formulario con los datos reales de la cuenta.
- `authGuard`: bloquea y redirige a `/login` sin sesión; permite el paso con sesión válida; vuelve a bloquear inmediatamente después de un logout.

Última ejecución: `npm run build` sin errores ni advertencias y `npm test -- --watch=false --reporters=verbose` con 63/63 pruebas aprobadas en 11 archivos. Incluye bloqueo con sesión expirada, expiración durante una pestaña abierta, restauración de sesión y validación segura de `returnUrl`.

## Recorrido manual para revisión del equipo

1. Levantar la app con `npm start` y abrir `http://localhost:4200`. Debe caer directo en `/login` (antes de esta tarea entraba directo a `/pos` sin pedir sesión).
2. Dejar ambos campos vacíos y presionar "Comenzar turno": deben marcarse en rojo con "El usuario es obligatorio." / "La contraseña es obligatoria.", sin intentar el login.
3. Escribir un usuario/clave que no exista (ej. `test@test.cl` / `0000`) y enviar: debe mostrar el banner "Usuario o contraseña incorrectos." y permanecer en `/login`.
4. Usar uno de los accesos rápidos de demo (Camila, Patricio o Sebastián): debe autocompletar el formulario, validar y redirigir a `/pos`.
5. Ya en `/pos`, cerrar sesión y luego intentar volver con el botón "atrás" del navegador o escribiendo `localhost:4200/pos` directo en la barra de direcciones: debe rebotar de nuevo a `/login`.
6. Volver a iniciar sesión y recargar la página (F5): debe mantener la sesión activa (no vuelve a pedir login), porque la sesión vive en `sessionStorage` con 8h de expiración.

Recorrido manual validado satisfactoriamente por Patricio el 19 de septiembre de 2026. La implementación queda lista para revisión y cierre de la tarjeta en Trello.
