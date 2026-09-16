# Registro y Bitácora de Pruebas Unitarias — NuryBase

Este documento mantiene el registro histórico y actualizado de todas las pruebas unitarias implementadas y ejecutadas en el proyecto.  
**Regla operativa:** Toda IA o desarrollador que implemente o ejecute pruebas debe actualizar este archivo con el desglose de suites, casos de prueba y estado de aprobación.

---

## 📊 Resumen de Última Ejecución

- **Fecha de ejecución:** 16 de septiembre de 2026
- **Rama:** `Patricio_Branch`
- **Entorno:** Vitest 4.1 / Angular 22 / Node 24
- **Total suites (archivos):** 9 aprobadas (100%)
- **Total pruebas ejecutadas:** 51 aprobadas (100%)
- **Tiempo de ejecución:** ~13.1 segundos
- **Resultado:** ✅ PASSED (0 fallos, 0 omitidas)

---

## 📋 Inventario Detallado de Pruebas por Módulo

### 1. Punto de Venta (POS) y Catálogo de Productos
**Archivos:**
- `src/app/features/pos/pages/pos-layout/pos-layout.component.spec.ts` (12 pruebas)
- `src/app/features/pos/services/pos.service.spec.ts` (5 pruebas)

| ID | Suite | Caso de Prueba / Criterio | Estado |
| :--- | :--- | :--- | :--- |
| **POS-01** | `PosLayoutComponent` | Búsqueda insensible a mayúsculas y tildes (`CAFE` encuentra `Café Espresso`) | ✅ PASS |
| **POS-02** | `PosLayoutComponent` | Búsqueda combinada por código de barra y selección de categoría | ✅ PASS |
| **POS-03** | `PosLayoutComponent` | Exclusión de productos inactivos en grilla y conteo de categorías | ✅ PASS |
| **POS-04** | `PosLayoutComponent` | Adición de exactamente 1 ítem mediante el botón accesible del producto | ✅ PASS |
| **POS-05** | `PosLayoutComponent` | Inicialización y montaje correcto del componente POS Layout | ✅ PASS |
| **POS-06** | `PosLayoutComponent` | Filtrado dinámico del catálogo según texto ingresado (H2.2) | ✅ PASS |
| **POS-07** | `PosLayoutComponent` | Adición automática de producto al carrito por código de barras o interno (H2.1 & H2.3) | ✅ PASS |
| **POS-08** | `PosLayoutComponent` | Diálogo de confirmación antes de abrir o cerrar caja | ✅ PASS |
| **POS-09** | `PosLayoutComponent` | Conservación del estado de caja cuando se cancela la acción | ✅ PASS |
| **POS-10** | `PosLayoutComponent` | Bloqueo estricto del ingreso de productos cuando la caja está cerrada | ✅ PASS |
| **POS-11** | `PosLayoutComponent` | Alerta de seguridad al intentar salir con caja abierta y opción de ir a cuadratura | ✅ PASS |
| **POS-12** | `PosLayoutComponent` | Cierre de sesión exitoso una vez confirmado en el modal | ✅ PASS |
| **POS-13** | `PosService` | Creación y provisión correcta del servicio `PosService` | ✅ PASS |
| **POS-14** | `PosService` | Existencia de catálogo inicial con códigos internos formato `NUR-xxx` (H2.3) | ✅ PASS |
| **POS-15** | `PosService` | Adición a comanda, acumulación de cantidades y cálculo neto/IVA/total | ✅ PASS |
| **POS-16** | `PosService` | Búsqueda y adición por código interno o código de barras EAN-13 (H2.1 & H2.3) | ✅ PASS |
| **POS-17** | `PosService` | Completar venta, generación de folio `TK-x` y cálculo exacto de vuelto (H2.4) | ✅ PASS |

---

### 2. Modal de Medios de Pago, Validación y Comprobantes
**Archivo:** `src/app/features/pos/components/payment-modal/payment-modal.component.spec.ts` (18 pruebas)

| ID | Suite | Caso de Prueba / Criterio | Estado |
| :--- | :--- | :--- | :--- |
| **PAY-01** | `PaymentModalComponent` | Impresión disponible únicamente tras venta completada (historial intacto) | ✅ PASS |
| **PAY-02** | `PaymentModalComponent` | Exige selección explícita de efectivo (monto exacto o recibido) antes de confirmar | ✅ PASS |
| **PAY-03** | `PaymentModalComponent` | Rechazo estricto de montos no numéricos (`NaN`) | ✅ PASS |
| **PAY-04** | `PaymentModalComponent` | Rechazo de valores numéricos infinitos (`Infinity`) | ✅ PASS |
| **PAY-05** | `PaymentModalComponent` | Rechazo de montos en negativo (`-1`) | ✅ PASS |
| **PAY-06** | `PaymentModalComponent` | Rechazo de fracciones decimales en pesos chilenos CLP (`5000.5`) | ✅ PASS |
| **PAY-07** | `PaymentModalComponent` | Rechazo de valores superiores al límite seguro (`MAX_SAFE_INTEGER`) | ✅ PASS |
| **PAY-08** | `PaymentModalComponent` | Revalidación del total y reseteo de aprobación Junaeb si el total cambia | ✅ PASS |
| **PAY-09** | `PaymentModalComponent` | Exige nueva confirmación Junaeb si se cambió de medio de pago | ✅ PASS |
| **PAY-10** | `PaymentModalComponent` | Registro único del medio de pago seleccionado sin duplicar eventos | ✅ PASS |
| **PAY-11** | `PaymentModalComponent` | Bloqueo de cobro ante carrito vacío o alterado | ✅ PASS |
| **PAY-12** | `PaymentModalComponent` | Inicialización correcta del modal de pago | ✅ PASS |
| **PAY-13** | `PaymentModalComponent` | Cálculo correcto de vuelto en efectivo en tiempo real (H2.4) | ✅ PASS |
| **PAY-14** | `PaymentModalComponent` | Detección y bloqueo ante pago en efectivo insuficiente | ✅ PASS |
| **PAY-15** | `PaymentModalComponent` | Asignación automática del monto exacto al seleccionar pago con tarjeta | ✅ PASS |
| **PAY-16** | `PaymentModalComponent` | Exige nueva confirmación de máquina de tarjeta tras alternar medios | ✅ PASS |
| **PAY-17** | `PaymentModalComponent` | Exige pulsar `✓ Listo / Escaneado` antes de confirmar venta con Beca Junaeb | ✅ PASS |

---

### 3. Gestión y Cierre de Caja
**Archivos:**
- `src/app/features/caja/pages/cierre-caja/cierre-caja.component.spec.ts` (5 pruebas)
- `src/app/features/caja/services/caja.service.spec.ts` (2 pruebas)

| ID | Suite | Caso de Prueba / Criterio | Estado |
| :--- | :--- | :--- | :--- |
| **CAJ-01** | `CierreCajaComponent` | Muestra recaudación desglosada por medio de pago (Efectivo, Tarjeta, Junaeb) (AC1) | ✅ PASS |
| **CAJ-02** | `CierreCajaComponent` | Listado de productos vendidos filtrado por el medio de pago seleccionado (AC2) | ✅ PASS |
| **CAJ-03** | `CierreCajaComponent` | Bloqueo del modal de confirmación si el turno no registra ventas | ✅ PASS |
| **CAJ-04** | `CierreCajaComponent` | Cierre definitivo de turno, generación de snapshot y reset del historial | ✅ PASS |
| **CAJ-05** | `CierreCajaComponent` | Cancelación del diálogo sin alterar el estado del turno | ✅ PASS |
| **CAJ-06** | `CajaService` | Cierre de turno con snapshot inmutable de totales y vaciado de ventas activas | ✅ PASS |
| **CAJ-07** | `CajaService` | Aislamiento estricto: no mezcla ventas de turnos previos en un nuevo cierre | ✅ PASS |

---

### 4. Autenticación y Control de Acceso
**Archivos:**
- `src/app/features/auth/pages/login/login.component.spec.ts` (3 pruebas)
- `src/app/features/auth/services/auth.service.spec.ts` (4 pruebas)

| ID | Suite | Caso de Prueba / Criterio | Estado |
| :--- | :--- | :--- | :--- |
| **AUT-01** | `LoginComponent` | Inicialización correcta del componente de inicio de sesión | ✅ PASS |
| **AUT-02** | `LoginComponent` | Validación y mensajes de error ante credenciales vacías | ✅ PASS |
| **AUT-03** | `LoginComponent` | Selector rápido de perfiles demo (Admin, Cajero, Bodeguero) | ✅ PASS |
| **AUT-04** | `AuthService` | Provisión correcta del servicio de autenticación | ✅ PASS |
| **AUT-05** | `AuthService` | Usuario cajero predeterminado para flujo operativo del POS | ✅ PASS |
| **AUT-06** | `AuthService` | Autenticación válida con credenciales de prueba | ✅ PASS |
| **AUT-07** | `AuthService` | Cierre de sesión y limpieza de sesión/usuario activo | ✅ PASS |

---

### 5. Estructura y Navegación Base
**Archivos:**
- `src/app/app.spec.ts` (2 pruebas)
- `src/app/layout/sidebar/sidebar.spec.ts` (1 prueba)

| ID | Suite | Caso de Prueba / Criterio | Estado |
| :--- | :--- | :--- | :--- |
| **APP-01** | `App` | Inicialización del componente raíz de Angular | ✅ PASS |
| **APP-02** | `App` | Definición del título de aplicación `NuryBase` | ✅ PASS |
| **APP-03** | `Sidebar` | Inicialización y renderizado del menú lateral de navegación | ✅ PASS |

---

## 🔄 Procedimiento Obligatorio para Actualizar este Registro

Toda IA o participante que ejecute o implemente pruebas debe:
1. Ejecutar la suite: `npm test -- --watch=false --reporters=verbose`
2. Agregar cualquier nueva prueba a la tabla del módulo que corresponda.
3. Actualizar la fecha y el contador total de pruebas aprobadas en el resumen superior.
4. Incluir este archivo en el commit correspondiente (`test:` o `docs:`).
