# AGENTS.md - Guía Operativa para Agentes de IA en NuryBase

Este archivo contiene las directrices de arquitectura, reglas de negocio, flujo de trabajo y convenciones para cualquier modelo de Inteligencia Artificial (GPT-6 Astra, Claude Code, Cursor, Antigravity) que trabaje en este repositorio.

## Diseño compartido: lectura obligatoria

Antes de modificar cualquier interfaz, leer y aplicar [docs/GUIA-DE-DISENO.md](docs/GUIA-DE-DISENO.md). Define tipografía, paleta, alineación, componentes y revisión visual de NuryBase para todos los participantes y sus IA. Verificar cambios visuales con sesión iniciada y en los anchos donde el elemento sea visible; entregar capturas reales para revisión remota.

---

## Levantamiento local obligatorio

Antes de trabajar con base de datos, leer [database/GUIA_LEVANTAMIENTO_LOCAL.md](database/GUIA_LEVANTAMIENTO_LOCAL.md). El entorno usa Docker Desktop, PostgreSQL y PostgREST; pgAdmin 4 se utiliza para inspeccionar PostgreSQL.

- PostgreSQL: `localhost:5433` desde Windows/pgAdmin, `5432` dentro de Docker.
- PostgREST: `http://localhost:3000`; Angular: `http://localhost:4200`.
- Crear solo `infra/.env.local` según la guía y levantar con `docker compose --env-file .\\infra\\.env.local -f .\\infra\\docker-compose.yml up -d`.
- Angular se conecta a PostgreSQL únicamente mediante PostgREST.

## 1. REGLAS CRÍTICAS DEL REPOSITORIO (NO ROMPER)

0. **No improvisar ante información faltante o conflictos:**
   - Si una instrucción, archivo, rama, ruta o dato solicitado no existe o no puede verificarse, detenerse e informar antes de actuar.
   - Si un paso documentado falla, genera conflictos o exige una decisión no prevista, pedir autorización explícita antes de sustituirlo, omitirlo o aplicar una alternativa.
   - No inventar pasos ni modificar el alcance de una guía sin aprobación de Patricio.

1. **Rama de Trabajo Exclusiva:**
   - Trabajar **SIEMPRE** sobre la rama activa autorizada `Patricio2_branch`.
   - La rama anterior `Patricio_Branch` se conserva únicamente como referencia histórica para recuperar implementaciones perdidas. No trabajar sobre ella ni copiar cambios desde ella sin autorización explícita de Patricio.
   - **PROHIBIDO** commitear o pushear cambios directamente a `main`.
2. **Autor de Git:**
   - Nombre: `Patricio Menares`
   - Correo: `pa.menares@duocuc.cl`
3. **Formato de Commits (Conventional Commits):**
   - `feat: ...`, `fix: ...`, `style: ...`, `refactor: ...`, `test: ...`, `docs: ...`
4. **Verificación y Registro Obligatorio de Pruebas Unitarias:**
   - Pruebas unitarias: `npm test -- --watch=false --reporters=verbose` (deben pasar el 100% de los tests).
   - **Registro Permanente Obligatorio:** Siempre que se creen o ejecuten pruebas unitarias, es mandatorio registrar y mantener actualizado el inventario y resultado en `docs/qa/registro-pruebas-unitarias.md`. Ninguna IA o participante debe dar por concluida una tarea sin reflejar las pruebas ejecutadas en dicho archivo para consulta permanente del equipo.
   - Compilación: `npm run build` (debe compilar con 0 errores y 0 advertencias).
5. **Exclusividad de Archivos de IA y Regla de Integración con `develop`:**
   - Los archivos `AGENTS.md`, `CLAUDE.md` y `.cursorrules` son de uso **estricta y exclusivamente personal para `Patricio2_branch`** (contienen credenciales, tokens de Trello y configuración del entorno de trabajo individual).
   - Estos archivos fueron formalmente eliminados de la rama común `develop` y agregados al `.gitignore` de dicha rama.
   - **PROHIBIDO TERMINANTEMENTE:** Cualquier modelo de IA o script que prepare un merge o Pull Request desde `Patricio2_branch` hacia `develop` debe **EXCLUIR** estos tres archivos. Nunca deben volver a comitearse ni empujarse a `develop`.

---

## 2. STACK TECNOLÓGICO Y ENTORNO LOCAL

- **Frontend:** Angular 22 (Standalone Components, Signals reactivas, Router).
- **Entorno Node:** Node `v24.11.0` en `A:\Program Files\nodejs\node.exe`.
- **Patch de Compatibilidad de Node:**
  - Angular CLI 22 requiere Node `>=24.15.0`. En `node_modules/@angular/cli/src/utilities/node-version.js`, la función `isNodeVersionSupported()` está parcheada para retornar `true`. Si se reinstala `node_modules`, este parche debe preservarse.
- **Estilos y Presupuestos (Budgets):**
  - Configurados en `angular.json`: `anyComponentStyle` con `maximumWarning: 20kB` y `maximumError: 30kB`.

---

## 3. COMANDOS FRECUENTES

```bash
# Iniciar servidor de desarrollo (puerto 4200)
npm start

# Ejecutar suite de pruebas unitarias (Vitest)
npm test -- --watch=false

# Compilación de producción
npm run build

# Ver estado de Git
git status
```

---

## 4. GESTIÓN Y REGLAS DE TRELLO

- **Instrucción de Nelson (Líder del equipo):**
  - Al tomar una tarea del Trello, moverla a la columna **"En progreso"** y asignarse a uno mismo en la tarjeta.
  - Trabajar 2 tareas en paralelo que no dependan la una de la otra.
- **Tablero oficial Sprint 1:** `https://trello.com/b/0IWodKAH/nurybase-sprint-1` (ID: `6aa166363661d7ca0c8b057f`)
- **Lista "En progreso" ID:** `6aa1664c1851e3914a5dc100`
- **Usuario Patricio Menares en Trello:** ID `67d9df77cb3106f778b7215b`
- **Credenciales API Trello:**
  - Key: `<TRELLO_API_KEY>`
  - Token: `<TRELLO_API_TOKEN>`

---

## 5. LÓGICA DE NEGOCIO Y DOMINIO CHILENO

- **Moneda:** Pesos Chilenos (CLP), sin decimales, formateados con `$`.
- **Impuestos:** IVA del 19% incluido en el total de la venta (desglose: Subtotal Neto = Total * 0.81, IVA = Total * 0.19).
- **Flujo de Pago Junaeb (Beca BAES):**
  - El cliente abre la **App Ticket Junaeb** en su móvil y genera su código QR dinámico.
  - El cajero escanea el QR desde el dispositivo móvil del local.
  - En la interfaz del POS se muestra la instrucción operativa y un botón directo **`✓ Listo / Escaneado`** para validar la transacción y pasar a la boleta.
- **Flujo de Pago Efectivo:**
  - Cálculo de vuelto en tiempo real y botones rápidos de billetes chilenos: `$1.000`, `$2.000`, `$5.000`, `$10.000`, `$20.000` y `Paga Justo`.
- **Flujo de Pago Tarjeta:**
  - Cobro en terminal externo del local; el operador confirma el pago en NuryBase. No solicitar PIN ni datos de tarjeta, ni integrar una pasarela como parte del flujo actual.
- **Base de Datos y Códigos de Producto:**
  - PostgreSQL vía PostgREST, con SQL versionado en `database/schema_nury.sql`, `database/local/` y `database/seed/`. Códigos internos formato `NUR-xxx` y códigos de barras EAN-13.
  - `public.login()` autentica contra `usuarios` y devuelve el rol operativo de PostgreSQL normalizado como `admin`, `cajero` o `bodeguero`. La UI debe usar `AuthService.currentUser().rol`; no inventar ni fijar roles en componentes.

---

## 6. ESTADO ACTUAL DEL SPRINT 1

- **Login (`/login`):** Standalone component con Signals, validación de RUT/correo, autenticación directa contra PostgreSQL/PostgREST. Se eliminaron los botones de usuarios de prueba en la interfaz.
- **AuthGuard:** Implementado para todas las rutas privadas. Conserva `returnUrl`, rechaza destinos externos, restaura sesiones vigentes y elimina sesiones al cerrar sesión o vencer el TTL de 8 horas. Pruebas automáticas y validación manual de Patricio aprobadas el 19 de septiembre de 2026.
- **Roles UI:** El sidebar filtra opciones con el rol entregado por PostgreSQL/PostgREST: cajero ve POS/Caja; bodeguero no ve Maestro de productos; admin ve todas las opciones. La ruta protegida `/product-master` solo permite admin. Mientras Inventario no tenga una ruta implementada, el acceso inicial o una URL no autorizada del bodeguero muestra «Acceso restringido» (`/sin-acceso`).
- **POS (`/pos`):** Cabecera de turno con LED verde pulsante y reloj digital en vivo; buscador reactivo de texto + escáner de código de barras; pestañas de categorías con badges de conteo; grilla táctil de productos; comanda lateral con steppers (+ / -) y cobro.
- **Modal de Pago:** Efectivo con vuelto, Tarjeta Transbank y Beca Junaeb simplificada. Previsualización de boleta electrónica digital.
- **Historial:** Modal de historial de ventas del turno con filtros por texto/folio y medio de pago.
- **Anulación:** La tarea de Trello “Anulación: construir modal de confirmación de anulación en UI y reflejo en estado de venta” volvió a estar pendiente después del cambio de rama y del levantamiento completo del proyecto. No declararla finalizada hasta reconstruirla y verificarla.
- **Pruebas:** Última ejecución en `Patricio2_branch`: 69/69 pruebas aprobadas en 11 archivos; build sin errores ni advertencias. Mantener actualizado `docs/qa/registro-pruebas-unitarias.md`.
