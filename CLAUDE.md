# AGENTS.md - Guía Operativa para Agentes de IA en NuryBase

Este archivo contiene las directrices de arquitectura, reglas de negocio, flujo de trabajo y convenciones para cualquier modelo de Inteligencia Artificial (GPT-6 Astra, Claude Code, Cursor, Antigravity) que trabaje en este repositorio.

---

## Levantamiento local del frontend

Para el trabajo habitual de frontend NO es necesario instalar PostgreSQL, PostgREST ni Docker Desktop. Angular se conecta directamente vía HTTPS a la API compartida del VPS (`https://api.nury.cl`, configurada en `src/environments/environment.ts`); no cambiar `apiUrl` a `localhost:3000` para uso normal ni crear un `.env` para el frontend.

Levantar con:
- `npm ci`
- `npm start` → abrir `http://localhost:4200`

Si una tarea requiere inspeccionar PostgreSQL directamente (pgAdmin, SQL en el VPS), leer [database/GUIA_LEVANTAMIENTO_LOCAL.md](database/GUIA_LEVANTAMIENTO_LOCAL.md) y solicitar acceso individual al administrador del VPS; no compartir credenciales root, la contraseña de `nury_admin`, claves SSH ni el `.env` del VPS. No ejecutar SQL directo en la base del VPS sin coordinarlo con el responsable.

## 1. REGLAS CRÍTICAS DEL REPOSITORIO (NO ROMPER)

1. **Rama de Trabajo Exclusiva:**
   - Trabajar **SIEMPRE** sobre la rama activa autorizada `Patricio2_branch`.
   - La rama anterior `Patricio_Branch` se conserva únicamente como referencia histórica para recuperar implementaciones perdidas. No trabajar sobre ella ni copiar cambios desde ella sin autorización explícita de Patricio.
   - **PROHIBIDO** commitear o pushear cambios directamente a `main`.
2. **Sincronización obligatoria antes de trabajar:**
   - Antes de modificar cualquier archivo del repositorio, ejecutar `git fetch origin` y `git merge origin/develop` sobre `Patricio2_branch`.
   - Si el merge produce conflictos, detenerse de inmediato, informar al usuario qué archivos están en conflicto y esperar su decisión antes de resolver nada. No usar `git checkout --ours/--theirs` ni ninguna resolución automática sin autorización explícita.
3. **Autor de Git:**
   - Nombre: `Patricio Menares`
   - Correo: `pa.menares@duocuc.cl`
4. **Formato de Commits (Conventional Commits):**
   - `feat: ...`, `fix: ...`, `style: ...`, `refactor: ...`, `test: ...`, `docs: ...`
5. **Verificación y Registro Obligatorio de Pruebas Unitarias:**
   - Pruebas unitarias: `npm test -- --watch=false --reporters=verbose` (deben pasar el 100% de los tests).
   - **Registro Permanente Obligatorio:** Siempre que se creen o ejecuten pruebas unitarias, es mandatorio registrar y mantener actualizado el inventario y resultado en `docs/qa/registro-pruebas-unitarias.md`. Ninguna IA o participante debe dar por concluida una tarea sin reflejar las pruebas ejecutadas en dicho archivo para consulta permanente del equipo.
   - Compilación: `npm run build` (debe compilar con 0 errores y 0 advertencias).
6. **Exclusividad de Archivos de IA y Regla de Integración con `develop`:**
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
  - Cobro en terminal externo del local; el operador confirma el pago en NuryBase. No solicitar PIN ni datos de tarjeta.
- **Base de Datos y Códigos de Producto:**
  - PostgreSQL vía PostgREST, con SQL versionado en `database/schema_nury.sql`, `database/local/` y `database/seed/`.
  - `public.login()` autentica contra `usuarios` y devuelve el rol operativo normalizado como `admin`, `cajero` o `bodeguero`. La UI consume `AuthService.currentUser().rol`; no fijar roles manualmente en componentes.

---

## 6. ESTADO ACTUAL DEL SPRINT 1

- **Login (`/login`):** Standalone component con Signals, validación de RUT/correo, autenticación directa contra PostgreSQL/PostgREST. Se eliminaron los botones de usuarios de prueba en la interfaz.
- **AuthGuard:** Protege las rutas privadas, conserva `returnUrl`, rechaza destinos externos y elimina sesiones vencidas. Pruebas automáticas y validación manual de Patricio aprobadas el 19 de septiembre de 2026.
- **Roles UI:** El sidebar usa el rol recibido desde PostgreSQL/PostgREST: cajero ve Home/POS/Caja; bodeguero ve Home/Maestro Productos/Inventario y entra inicialmente a Maestro Productos; admin ve todas las opciones. Pruebas automáticas y validación manual aprobadas por Patricio el 19 de septiembre de 2026.
- **POS (`/pos`):** Cabecera de turno con LED verde pulsante y reloj digital en vivo; buscador reactivo de texto + escáner de código de barras; pestañas de categorías con badges de conteo; grilla táctil de productos; comanda lateral con steppers (+ / -) y cobro.
- **Modal de Pago:** Efectivo con vuelto, Tarjeta Transbank y Beca Junaeb simplificada. Previsualización de boleta electrónica digital.
- **Anulación:** La tarea de Trello “Anulación: construir modal de confirmación de anulación en UI y reflejo en estado de venta” volvió a estar pendiente tras el cambio de rama y el levantamiento completo del proyecto. Reconstruir y verificar antes de marcarla finalizada.
- **Pruebas:** Última ejecución en `Patricio2_branch`: 69/69 pruebas aprobadas en 11 archivos; build sin errores ni advertencias. Mantener actualizado `docs/qa/registro-pruebas-unitarias.md`.
