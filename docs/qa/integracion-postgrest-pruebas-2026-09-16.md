# Pruebas manuales — Integración de catálogo PostgREST

Fecha: 16 de septiembre de 2026  
Rama: `Patricio_Branch`  
Entorno: Angular `http://localhost:4200`, PostgREST `http://localhost:3000`, PostgreSQL Docker local.

## Resultado

- Recorrido manual en navegador integrado: aprobado.
- Catálogo conectado: 369 productos activos visibles en el POS.
- La prueba no confirmó un cobro; no se generaron ventas de prueba.

## Casos ejecutados

| Caso | Resultado observado | Estado |
| --- | --- | --- |
| Inicio de sesión demo | El perfil de Camila Rojas abrió `/pos` con sucursal Nury Providencia. | Aprobado |
| Carga desde API | El POS indicó `369 productos disponibles` y la pestaña `Todos` mostró 369. | Aprobado |
| Búsqueda sin tildes | `CAFE` redujo el catálogo a 11 productos coincidentes. | Aprobado |
| Búsqueda por código interno | `NUR-001` mostró únicamente CHAPARRITA, con precio $3.500. | Aprobado |
| Comanda e impuestos | Agregar CHAPARRITA registró 1 producto, total $3.500, neto $2.835 e IVA $665. | Aprobado |
| Efectivo insuficiente | Con $2.000 para un total de $3.500 se informó `Faltan $1.500` y no se habilitó el cobro. | Aprobado |
| Efectivo exacto | `Paga Justo` configuró $3.500, vuelto $0 y habilitó la confirmación. | Aprobado |
| Tarjeta | El botón final permaneció bloqueado hasta `Pago listo en la máquina`. | Aprobado |
| Junaeb | El flujo mostró la instrucción de escanear QR y exigió `Listo / Escaneado`. | Aprobado |
| Navegación a caja | `/caja` abrió correctamente y mostró $0 / 0 ventas, consistente con no confirmar la venta de prueba. | Aprobado |
| Categorías del catálogo | Las pestañas mostraron Cafetería (11), Sándwiches (67), Bollería & Dulces (188), Bebidas Frías (95) y Otros (8). La suma corresponde a los 369 productos activos. | Aprobado |

## Corrección verificada

El catálogo de la base de datos conserva sus categorías originales. El POS ahora normaliza y mapea también las categorías no contempladas anteriormente hacia `Otros`, por lo que ningún producto activo queda fuera de una pestaña específica. La cobertura verificada es 369/369 productos.
