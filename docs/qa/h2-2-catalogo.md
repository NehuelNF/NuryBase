# Revisión de aceptación: H2.2 Búsqueda manual y catálogo

Fecha: 14 de septiembre de 2026. Rama: `Patricio_Branch`.

Historia: https://trello.com/c/rGoKFzFB
Tarea de revisión: https://trello.com/c/le33FtT8

## Resultado

Los tres criterios están implementados en el frontend con catálogo local de demostración. La revisión no acredita integración con PostgREST, persistencia ni autorización de backend.

| Criterio de Trello | Evidencia | Resultado |
| --- | --- | --- |
| Buscar por nombre, código o texto | `PosLayoutComponent.filteredCatalog` compara nombre, código interno, código de barras y descripción; normaliza espacios, mayúsculas y tildes. | Cumple en frontend |
| Seleccionar un producto desde el catálogo visual | Las tarjetas y sus botones Agregar invocan `addProduct`; el botón tiene nombre accesible y evita propagar el clic. | Cumple en frontend |
| Agregar al carrito nombre, precio y cantidad | `PosService.addToCart` conserva el producto, inicia cantidad en 1 y calcula subtotal. Repetir la selección incrementa la cantidad del mismo ítem. | Cumple en frontend |

## Evidencia automatizada

Archivos: `src/app/features/pos/pages/pos-layout/pos-layout.component.spec.ts` y `src/app/features/pos/services/pos.service.spec.ts`.

- Búsqueda por nombre y código de barras, normalización de tildes y combinación con categorías.
- Exclusión de productos inactivos y actualización de contadores.
- Clic en Agregar: una sola unidad, nombre correcto y total de $2.600 para Espresso Doble.
- Pruebas del servicio para operaciones del carrito.

La última ejecución previa a esta revisión pasó 36/36 pruebas y compiló sin errores ni advertencias. Esta tarea añade documentación; no modifica código ejecutable.

## Recorrido manual para revisión del equipo

1. Abrir `/pos` y buscar `CAFE`, `NUR-101` y `7801234501018` por separado.
2. Confirmar que Espresso Doble aparece; buscar `inexistente` y comprobar el estado vacío.
3. Pulsar Ver Todos los Productos para limpiar búsqueda y categoría.
4. Agregar Espresso Doble: debe aparecer una unidad a $2.600. Repetir: dos unidades y $5.200.
5. Seleccionar Sándwiches y comprobar que la grilla muestra únicamente esa categoría.

Este recorrido queda disponible para validación manual; no se presenta como una nueva prueba de navegador ejecutada en esta tarea.
