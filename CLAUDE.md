# AGENTS.md - Guía Operativa para Agentes de IA en NuryBase

Este archivo contiene las directrices de arquitectura, reglas de negocio, flujo de trabajo y convenciones para cualquier modelo de Inteligencia Artificial (GPT-6 Astra, Claude Code, Cursor, Antigravity) que trabaje en este repositorio.

---

## 1. REGLAS CRÍTICAS DEL REPOSITORIO (NO ROMPER)

1. **Rama de Trabajo Exclusiva:**
   - Trabajar **SIEMPRE** sobre la rama `Patricio_Branch`.
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
   - Los archivos `AGENTS.md`, `CLAUDE.md` y `.cursorrules` son de uso **estricta y exclusivamente personal para `Patricio_Branch`** (contienen credenciales, tokens de Trello y configuración del entorno de trabajo individual).
   - Estos archivos fueron formalmente eliminados de la rama común `develop` y agregados al `.gitignore` de dicha rama.
   - **PROHIBIDO TERMINANTEMENTE:** Cualquier modelo de IA o script que prepare un merge o Pull Request desde `Patricio_Branch` hacia `develop` debe **EXCLUIR** estos tres archivos. Nunca deben volver a comitearse ni empujarse a `develop`.

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
  - Key: `1016bcec3965057c9a07a86302e754af`
  - Token: `ATTA311763bcb61233ef38a6234720f7cf394f671585764053cc7464aed752efc0b45243CBA1`

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
  - Simulación de terminal Transbank / Redcompra Contactless con PIN.
- **Base de Datos y Códigos de Producto:**
  - Basados en `A:\Descargas\nury_schema.sql`. Códigos internos formato `NUR-xxx` y códigos de barras EAN-13.

---

## 6. ESTADO ACTUAL DEL SPRINT 1

- **Login (`/login`):** Standalone component con Signals, validación de RUT/correo, selector rápido de usuarios demo (Camila Rojas - Cajera, Patricio Menares - Admin, Sebastián Vera - Bodeguero).
- **POS (`/pos`):** Cabecera de turno con LED verde pulsante y reloj digital en vivo; buscador reactivo de texto + escáner de código de barras; pestañas de categorías con badges de conteo; grilla táctil de productos; comanda lateral con steppers (+ / -) y cobro.
- **Modal de Pago:** Efectivo con vuelto, Tarjeta Transbank y Beca Junaeb simplificada. Previsualización de boleta electrónica digital.
- **Tests:** 70 de 70 pruebas unitarias pasando (100% PASS). Registro detallado por módulo disponible en `docs/qa/registro-pruebas-unitarias.md`.
