# Registro de Pruebas y Criterios de Aceptación — H2.3, H2.7 y H2.9

Fecha: 16 de septiembre de 2026  
Rama: `Patricio_Branch`  
Módulo: Punto de Venta (POS) y Gestión de Caja  
Entorno de ejecución: Vitest 4.1 / Angular 22 / Node 24  
Resultado global: 10 suites aprobadas, 69 pruebas unitarias aprobadas (100% PASS). Compilación de producción: 0 errores, 0 advertencias.

---

## 1. Historia de Usuario H2.3: Entrada Rápida por Código Interno y Adición al Carrito

### Objetivo
Permitir a los cajeros digitar o escanear un código interno (`NUR-xxx`) o código de barras (`EAN-13`) directamente en un campo de entrada rápida en el POS, agregando automáticamente el producto a la comanda activa.

### Criterios de Aceptación Verificados
1. **Búsqueda e inserción directa:**
   - La función `findProductByCode(code)` y el método `onBarcodeScan()` identifican el producto sin distinguir entre mayúsculas y minúsculas (`nur-101` y `NUR-101`).
   - El producto es añadido al carrito de inmediato incrementando la cantidad si ya existía.
2. **Feedback al cajero:**
   - Si el producto existe, muestra una confirmación visual accesible con el código, nombre y precio en formato CLP (`$2.600`) y limpia el campo.
   - Si el código no existe en el catálogo, muestra un mensaje de alerta (`Código "XYZ" no encontrado en catálogo`) y conserva el foco.
3. **Bloqueo por seguridad:**
   - Si la caja se encuentra cerrada, bloquea el escaneo/ingreso e informa al cajero que debe abrir caja para registrar ventas.

### Pruebas Unitarias Asociadas
- `POS-07`: Adición automática de producto al carrito por código de barras o interno.
- `POS-13`: Entrada rápida por código interno y adición con feedback de precio formateado.
- `POS-14`: Manejo y feedback de error cuando el código ingresado no existe.
- `POS-20`: Catálogo inicial con códigos internos formato `NUR-xxx`.
- `POS-22`: Búsqueda y adición por código interno o código de barras EAN-13 en `PosService`.
- `POS-24`: Búsqueda insensible a mayúsculas/minúsculas.
- `POS-25`: Retorno `undefined` ante códigos no registrados.

---

## 2. Historia de Usuario H2.7: Historial de Ventas del Turno Activo

### Objetivo
Construir una vista/modal de auditoría en el POS que permita al cajero revisar el historial completo de transacciones realizadas durante el turno abierto, desglosando productos, cantidades, subtotales, totales y medios de pago.

### Criterios de Aceptación Verificados
1. **Acceso y visibilidad:**
   - Botón "Historial" integrado en la cabecera superior del POS con contador interactivo en vivo (`shiftActiveCount`).
   - Modal accesible con diseño consistente a la paleta institucional (Warm Cream, Olive Green, Tabular numbers).
2. **Filtros interactivos:**
   - Buscador en tiempo real por folio (`TK-x`), nombre de producto vendido o método de pago.
   - Filtros tipo chip por medio de pago (`Todos`, `Efectivo`, `Tarjeta`, `Junaeb`).
3. **Detalle de transacción:**
   - Tabla de ventas con badges de estado (`Completada`, `Anulada`).
   - Lista desglosada de productos con cantidad, precio unitario y subtotal.
   - Resumen superior con recaudación neta activa (`shiftTotalRecaudado`) y conteo de ventas completadas y anuladas.

### Pruebas Unitarias Asociadas
- `POS-15`: Control de apertura/cierre de modal de historial del turno y contadores vivos.
- `POS-16`: Filtro dinámico del historial por texto/folio y por medio de pago.

---

## 3. Historia de Usuario H2.9: Confirmación y Flujo de Anulación de Ventas

### Objetivo
Permitir anular ventas completadas del turno activo de forma segura, solicitando confirmación con motivo obligatorio y descontando inmediatamente el importe de la recaudación y del arqueo de caja.

### Criterios de Aceptación Verificados
1. **Condición previa de caja:**
   - La anulación solo se permite si la caja registradora está abierta. Con caja cerrada, el sistema bloquea la acción para evitar inconsistencias contables.
2. **Modal de confirmación:**
   - Previsualiza el folio (`TK-x`), fecha, cajero, total a anular y la lista de ítems a restituir en inventario.
   - Presenta un banner de advertencia claro sobre el impacto de la operación.
   - Chips de motivos rápidos predefinidos ("Error de digitación", "Cliente desistió", "Cobro duplicado", "Cambio de producto") y campo de texto libre editable.
3. **Validación estricta:**
   - No permite confirmar la anulación sin un motivo explícito.
   - Marca la venta con `estado = 'anulada'`, guarda fecha, hora y usuario que autorizó la anulación.
   - Impide anular dos veces una misma venta.
4. **Impacto en cuadratura de caja:**
   - `CajaService.summaryByMethod()` descuenta automáticamente las ventas anuladas.
   - `CajaService.grandTotal()` descuenta el total anulado.
   - `CierreCaja` no incluye importes ni ventas anuladas en la recaudación del turno.
   - `productosPorMedioPago()` excluye los ítems de compras anuladas del desglose de productos vendidos.

### Pruebas Unitarias Asociadas
- `POS-17`: Bloqueo de solicitud de anulación con caja cerrada.
- `POS-18`: Modal de anulación con previsualización, selección de motivo y validación obligatoria.
- `POS-26`: Anulación de venta con registro de motivo, marca de tiempo y usuario en `PosService`.
- `POS-27`: Rechazo de anulación sin motivo obligatorio.
- `POS-28`: Prevención de re-anulación sobre ventas anuladas.
- `CAJ-08`: Exclusión estricta de ventas anuladas de `summaryByMethod`, `grandTotal` y cierre de caja.
- `CAJ-09`: Exclusión de productos de ventas anuladas en `productosPorMedioPago`.
- `CAJ-10`: Detección de `hayVentasEnElTurno` en falso si todas las ventas fueron anuladas.

---

## 4. Clarificación Operativa: Pausa de Caja vs Cierre de Turno

Para evitar ambigüedades en el flujo del punto de venta:
1. **Pausa / Reanudación de Caja:**
   - La acción en la cabecera del POS se renombró a **"Pausar caja"** / **"Reanudar caja"**.
   - Permite al cajero bloquear temporalmente el ingreso de productos y escaneo sin alterar las ventas del turno ni resetear la contabilidad.
   - El diálogo de confirmación incluye acceso directo: **"Ir a Cierre y Cuadratura de Turno →"** para guiar al usuario si su intención real es finalizar el turno.
2. **Cierre de Turno y Cuadratura (`/caja`):**
   - Es el cierre formal del turno contable, donde se consolida el snapshot inmutable de recaudación, se archiva el desglose por medio de pago y se reinicia el historial a $0 para el siguiente cajero/turno.

---

## 5. Estado Final de Verificación

- **Pruebas unitarias totales:** 70/70 aprobadas (100% de éxito).
- **Compilación de producción:** `ng build` exitoso con tamaño de bundle inicial de 277 kB (límite budget: 500 kB).
- **Cumplimiento de diseño:** `docs/GUIA-DE-DISENO.md` aplicado rigurosamente.
- **Aislamiento de ramas:** Archivos personales de IA (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`) preservados en `Patricio_Branch` y excluidos de `develop`.
