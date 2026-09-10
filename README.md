# NuryBase

Sistema web para centralizar la gestión de ventas, inventario y reportes de la cadena de cafeterías Nury's.

## Contexto del proyecto

Nury's cuenta con ocho locales, distribuidos entre Santiago y Valparaíso. Actualmente existe información sobre las ventas por sucursal, pero no suficiente trazabilidad sobre los productos vendidos ni sobre el consumo real de los ingredientes.

NuryBase busca resolver esta situación mediante una plataforma centralizada que permita:

- Registrar ventas por sucursal, cajero, producto y medio de pago.
- Mantener el inventario actualizado en tiempo real.
- Gestionar productos compuestos mediante recetas e ingredientes.
- Registrar compras y evitar el procesamiento duplicado de facturas.
- Generar reportes para apoyar las decisiones de la administración.

El sistema debe ser accesible desde computadores, tablets y teléfonos, además de soportar lectores de códigos de barras y lectura de códigos QR mediante cámara.

## Funcionalidades

### Usuarios y accesos

- Inicio y cierre de sesión.
- Persistencia y expiración segura de sesiones.
- Control de acceso según rol: Admin, Cajero y Bodeguero.
- Protección de rutas y operaciones no autorizadas.

### Punto de venta

- Lectura de códigos de barras y códigos QR mediante pistola lectora o cámara.
- Búsqueda manual y catálogo visual de productos.
- Soporte para códigos internos de Nury's.
- Carrito de compra y registro de pagos en efectivo, tarjeta o Junaeb.
- Emisión de ticket o comprobante digital.
- Historial de ventas del turno activo.
- Cierre y cuadratura de caja.
- Anulación de ventas con reversión del inventario asociado a la receta.

### Inventario y abastecimiento

- Registro de materias primas y unidades de medida.
- Ingreso de facturas mediante lectura de código QR.
- Validación de factura usando la combinación única RUT del emisor + folio.
- Actualización automática del stock después de una compra o venta.
- Descuento de ingredientes según la receta del producto vendido.
- Panel de stock por sucursal actualizado en tiempo real.
- Filtros por estado: agotado, crítico y estable.
- Alertas cuando el stock esté bajo el mínimo configurado.
- Ajustes manuales con motivo obligatorio y registro de mermas.

### Reportes e inteligencia de negocio

- Reportes consolidados de ventas por sucursal.
- Filtros por día, semana, mes o rango personalizado.
- Reportes por cajero, cantidad de transacciones y total recaudado.
- Desglose por producto, unidades vendidas y monto generado.
- Reportes de mermas y ajustes de inventario.
- Recomendaciones y proyecciones basadas en el historial de ventas, visibles para Admin.

### Administración

- Creación, edición y desactivación de perfiles de cajero.
- Asignación de usuarios a una sucursal.
- Creación y configuración de promociones.
- Programación de inicio y término de promociones.
- Gestión de productos compuestos, recetas e ingredientes.

## Arquitectura

El frontend está desarrollado con Angular usando componentes standalone y una organización por funcionalidades de negocio. Cada funcionalidad contiene sus propias páginas, componentes, servicios, modelos y rutas.

La aplicación se divide en las siguientes capas:

    Interfaz de usuario
            |
            v
    Páginas y componentes Angular
            |
            v
    Servicios de cada funcionalidad
            |
            v
    API del backend
            |
            v
    Base de datos y servicios externos

### Criterios de arquitectura

- Las rutas de cada funcionalidad deben cargarse de forma diferida cuando corresponda.
- La autenticación, los guards, los interceptores y la sesión deben centralizarse en core.
- Los componentes reutilizables deben ubicarse en shared.
- La lógica específica de ventas, inventario, reportes o administración debe permanecer dentro de su funcionalidad.
- El frontend debe validar la experiencia de usuario, pero la autorización real debe validarse también en el backend.
- El inventario debe recibir actualizaciones mediante WebSockets, Server-Sent Events u otro mecanismo reactivo.
- Las operaciones de venta, anulación, compra y ajuste de stock deben ser consistentes y transaccionales en el backend.

### Convenciones de organización

- Usar nombres técnicos de carpetas en inglés y nombres de páginas de negocio en español.
- Usar el sufijo correspondiente: .component.ts, .service.ts, .guard.ts, .interceptor.ts y .model.ts.
- Mantener los componentes pequeños y enfocados en la presentación.
- Colocar la lógica de negocio y las llamadas HTTP en servicios.
- No crear una carpeta global de servicios para lógica que pertenece a una funcionalidad.
- No organizar el código por rol. Los roles se controlan mediante guards y permisos.
- Crear modelos globales solo cuando sean compartidos por varias funcionalidades.

## Reglas del repositorio

1. No trabajar directamente sobre main. Cada cambio debe realizarse en una rama propia.
2. Usar mensajes de commit claros y, de preferencia, con Conventional Commits:
   - feat: agrega lectura de codigo QR
   - fix: corrige cierre de caja
   - docs: actualiza estructura del proyecto
3. Ejecutar las verificaciones antes de crear un Pull Request:

       npm ci
       npm run build
       npm test

4. No subir secretos, contraseñas, tokens, archivos .env, node_modules ni la carpeta dist.
5. Todo cambio funcional debe incluir o actualizar sus pruebas cuando corresponda.
6. Revisar que las rutas y permisos funcionen para Admin, Cajero y Bodeguero.
7. Mantener compatibilidad responsive para PC, tablets y smartphones.
8. Documentar en el Pull Request el objetivo del cambio, las pruebas realizadas y cualquier pendiente.
9. Resolver los conflictos y contar con revisión antes de fusionar una rama a main.

## Desarrollo local

Instalar las dependencias:

    npm install

Iniciar el servidor de desarrollo:

    npm start

Luego abrir http://localhost:4200/ en el navegador.

## Comandos disponibles

| Comando | Descripción |
| --- | --- |
| npm start | Inicia el servidor de desarrollo. |
| npm run build | Compila la aplicación. |
| npm test | Ejecuta las pruebas unitarias. |
| ng generate component nombre | Genera un componente Angular. |
