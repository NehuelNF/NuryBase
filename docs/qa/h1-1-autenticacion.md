# Revisión de aceptación: H1.1 Autenticación de usuarios

Fecha: 17 de septiembre de 2026. Rama: `Sebastian_Branch`.

## Resultado

Los cuatro criterios están implementados en el frontend, con las credenciales validadas contra una lista de cuentas de demostración (`AuthService.mockUsers`), ya que todavía no existe un endpoint de login real en PostgREST (falta la función SQL de login y la configuración de JWT — ver `database/local/04_roles.sql` e `infra/docker-compose.yml`). El resto del ciclo de vida de la sesión (guard de rutas, token, expiración, logout) no depende del backend y funciona igual quede conectado a un backend real más adelante.

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

Última ejecución: `npm run build` sin errores ni advertencias, y `npx ng test --watch=false` con 57/57 pruebas aprobadas en 10 archivos (incluye las 13 nuevas de esta tarea, más las ya existentes de POS, caja y catálogo, que siguen pasando sin cambios).

## Recorrido manual para revisión del equipo

1. Levantar la app con `npm start` y abrir `http://localhost:4200`. Debe caer directo en `/login` (antes de esta tarea entraba directo a `/pos` sin pedir sesión).
2. Dejar ambos campos vacíos y presionar "Comenzar turno": deben marcarse en rojo con "El usuario es obligatorio." / "La contraseña es obligatoria.", sin intentar el login.
3. Escribir un usuario/clave que no exista (ej. `test@test.cl` / `0000`) y enviar: debe mostrar el banner "Usuario o contraseña incorrectos." y permanecer en `/login`.
4. Usar uno de los accesos rápidos de demo (Camila, Patricio o Sebastián): debe autocompletar el formulario, validar y redirigir a `/pos`.
5. Ya en `/pos`, cerrar sesión y luego intentar volver con el botón "atrás" del navegador o escribiendo `localhost:4200/pos` directo en la barra de direcciones: debe rebotar de nuevo a `/login`.
6. Volver a iniciar sesión y recargar la página (F5): debe mantener la sesión activa (no vuelve a pedir login), porque la sesión vive en `sessionStorage` con 8h de expiración.

Este recorrido fue ejecutado en esta tarea (pasos 1 a 6 verificados en el navegador por el equipo) y queda disponible para que cualquiera lo repita como parte de la revisión del PR.
