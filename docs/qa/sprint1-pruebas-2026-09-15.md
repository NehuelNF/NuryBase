# Pruebas de aceptación — Sprint 1

Fecha: 15 de septiembre de 2026  
Rama: `Patricio_Branch`

## Resultado general

- Pruebas unitarias: 37/37 aprobadas.
- Compilación de producción: aprobada sin errores ni advertencias.
- Recorridos manuales en navegador: aprobados.
- Consola del navegador: sin errores.

## Tarjetas revisadas

### H2.2 — Búsqueda manual y catálogo

- `CAFE` encontró Café Espresso Doble y Café Latte Vainilla, confirmando búsqueda sin depender de tildes o mayúsculas.
- `NUR-201` devolvió únicamente Sándwich Ave Palta.
- Seleccionar el producto agregó nombre, precio, cantidad y subtotal a la comanda.
- Total observado: $4.800; subtotal neto: $3.888; IVA: $912.

Resultado: cumple los tres criterios de aceptación de H2.2.

### H2.4 — Registro de medio de pago

- Efectivo: con $2.000 para una venta de $4.800 mostró que faltaban $2.800 y bloqueó la confirmación.
- Tarjeta: seleccionar el medio mantuvo bloqueada la venta hasta pulsar `Pago listo en la máquina`. No existe conexión con una pasarela; la aprobación ocurre externamente en la máquina del local.
- Junaeb: mantuvo bloqueada la venta hasta pulsar `Listo / Escaneado`.
- Los comprobantes registraron correctamente `Tarjeta` y `Ticket Junaeb (BAES App)`.

Resultado: cumple los tres criterios de aceptación de H2.4 con el flujo operativo definido para el local.

### H2.6 — Comprobante de venta

- El comprobante digital mostró producto, cantidad, total, subtotal neto, IVA, medio de pago, cajero, sucursal, fecha y folio.
- La acción `Imprimir / PDF` está disponible y su prueba unitaria verifica la llamada de impresión sin alterar la venta.

Resultado: cumple los dos criterios de aceptación de H2.6 y la opción adicional de impresión/PDF.

## Corrección realizada durante QA

El pago con tarjeta se habilitaba al seleccionar el medio. Se cambió para exigir una confirmación explícita del cajero después de que la máquina externa apruebe el pago. Cambiar de medio o de total invalida esa confirmación previa.
