# Guía de diseño de NuryBase

Referencia compartida para participantes e IA. Leer antes de crear o modificar interfaces. Base: diseño de login, POS y pago consolidado hasta el commit `14654a4` (16 de septiembre de 2026). Esta guía define continuidad visual; no autoriza cambios de negocio ni tomar tareas asignadas a otra persona.

## 1. Dirección visual

NuryBase es una herramienta de trabajo para una cafetería: cálida, sobria y fácil de operar durante un turno. Mantener fondos crema, verdes oliva, texto oscuro, bordes finos y espacios claros. La jerarquía nace de tamaño, peso y agrupación; evitar tarjetas decorativas innecesarias, gradientes, neón, sombras fuertes, emojis como iconos principales y un rediseño distinto para cada módulo.

Extender los componentes existentes antes de inventar variantes. Login, POS, caja e inventario deben sentirse parte de la misma aplicación.

## 2. Fuentes de referencia

- Base global y foco: [src/styles.css](../src/styles.css).
- Marca, catálogo, comanda y confirmaciones: [CSS del POS](../src/app/features/pos/pages/pos-layout/pos-layout.component.css) y [plantilla del POS](../src/app/features/pos/pages/pos-layout/pos-layout.component.html).
- Cobro y comprobante: [CSS de pago](../src/app/features/pos/components/payment-modal/payment-modal.component.css).
- Acceso: [CSS del login](../src/app/features/auth/pages/login/login.component.css).
- Navegación: [CSS de sidebar](../src/app/layout/sidebar/sidebar.css).

Inspeccionar estos archivos en la rama actual: las capturas antiguas no reemplazan al código vigente. Los colores siguientes son valores reales de referencia; no son nombres de variables globales ya implementadas.

## 3. Tipografía

Una sola familia: `'Segoe UI', Arial, sans-serif`. Heredar en botones, inputs, selects y textareas. No introducir Google Fonts, Georgia, Courier ni una familia diferente para precios o boletas.

| Uso | Referencia |
| --- | --- |
| Marca POS «nury’s» | 29 px, peso 700, line-height 1, tracking −1.5 px |
| Título principal POS | 32 px, peso 650 |
| Títulos de panel/modal | 24–32 px, peso 650–700 |
| Texto y controles | 12–14 px; conservar legibilidad según dispositivo |
| Etiquetas secundarias | 10–11 px; no usarlas para instrucciones críticas |
| Precios y reloj | Misma familia, `font-variant-numeric: tabular-nums` |

Los tamaños son referencias de la interfaz actual, no una obligación de reducir texto para que quepa. Para nuevos textos largos, usar interlineado aproximado de 1.5–1.65. Reservar mayúsculas espaciadas para etiquetas cortas como «PUNTO DE VENTA».

## 4. Paleta y superficies

| Función | Color de referencia |
| --- | --- |
| Fondo de aplicación | `#f5f3ed` |
| Superficie de panel/tarjeta | `#fffefa` |
| Texto principal | `#292e27` |
| Acción principal oliva | `#3d5334` con texto blanco |
| Texto secundario | `#68735e` |
| Borde suave | `#dedfd5` / `#d4d8ca` |
| Estado abierto, fondo | `#eef2e8` |
| Estado abierto, texto | `#49613a` |
| Estado cerrado, fondo | `#fbf5ef` |
| Estado cerrado, texto | `#8b513d` |
| Foco de teclado | `#a64d34` |
| Sidebar | `#344337` |
| Texto de sidebar | `#cbd1c5` |
| Acento cálido de sidebar | `#d9b388` |

No multiplicar verdes o grises casi iguales al extender la interfaz: reutilizar el valor semántico más cercano. Verificar contraste de texto y estados; los valores heredados no garantizan por sí solos accesibilidad. Los estados siempre deben incluir texto o iconografía comprensible, además del color.

## 5. Composición y alineación

Usar flex/grid y `gap` para distribuir elementos. Referencias: separaciones de 8, 12, 16, 24 y 32 px; paneles con 24–32 px de padding; bordes de 1 px; radios discretos de 4–6 px en controles y hasta 10 px en diálogos. Reservar sombras para elementos superpuestos.

La cabecera actual agrupa el logotipo y `.brand-context` horizontalmente. El contexto contiene «PUNTO DE VENTA» y la sucursal en dos líneas; el separador pertenece a ese bloque. Centrar el conjunto respecto al logo usando flex y line-height explícito. No restaurar la antigua corrección `translateY(2px)` de `.brand-badge-pos`: fue reemplazada por esta estructura. Revisar el alineamiento óptico de letras y separador, no solo sus cajas CSS.

En tarjetas de producto, conservar orden: icono/código, nombre, descripción, precio y botón de agregar. Alinear el precio y el botón en una fila inferior estable. Centrar el «+» dentro de su círculo con grid/flex, line-height controlado y padding explícito; no depender del estilo predeterminado del navegador. Un ajuste óptico debe comprobarse en captura real.

## 6. Componentes y estados

- Una acción principal claramente destacada por paso; secundarios con fondo suave o borde. Etiquetas breves que expresen acciones.
- Mantener estados normal, hover, foco, presionado cuando aplique y deshabilitado. No mostrar un control habilitado si no ejecutará su acción.
- Formularios con etiqueta accesible, mensaje de error próximo al campo y foco visible. El placeholder no sustituye a la etiqueta.
- Modales con título, explicación concreta y botones de cancelar/confirmar. Conservar overlay oscuro y panel crema. Para nuevos diálogos implementar foco inicial, contención de foco y retorno al disparador; verificar teclado.
- Iconos de trazo coherente; reutilizar SVG existentes. Los botones de solo icono necesitan nombre accesible. Procurar áreas táctiles de al menos 44 × 44 px en controles nuevos, aunque el icono sea menor.
- Estados vacíos, carga y error deben describir qué ocurre y qué hacer. No presentar datos ficticios como operación real.
- Respetar `prefers-reduced-motion` y el foco global existente.

## 7. Lenguaje y operación

Escribir en español claro, con términos consistentes: «caja», «comanda», «medio de pago», «vuelto» y «comprobante». CLP sin decimales, por ejemplo `$4.800`; reutilizar el formateador existente.

El sistema registra el medio y la confirmación del pago. La tarjeta se cobra en la máquina externa del local y el operador confirma que está pagada. No agregar pasarela, formulario de tarjeta/PIN ni una animación que declare aprobado el cobro automáticamente. Para efectivo conservar cálculo de vuelto y validaciones; para Junaeb conservar la confirmación operativa explícita. No cambiar fórmulas tributarias como parte de una tarea visual.

Abrir y cerrar caja requieren confirmación. La vista cerrada debe explicar el estado y respetar los bloqueos existentes. Mantener la advertencia de salida con caja abierta y los estados de comprobante/impresión ya implementados.

## 8. Revisión responsive y visual obligatoria

Para cambios de interfaz, abrir el flujo real en navegador, iniciar sesión demo y probar con nombre/sucursal cargados. Revisar sidebar expandida y contraída cuando esté presente. El ancho útil incluye lo que ocupa la navegación.

Comprobar al menos escritorio amplio (1440 px), escritorio compacto (1280 px), 1101/1100 px, tablet (768 px) y móvil (390 px), según el alcance de la pantalla. Los breakpoints heredados del POS incluyen 1100 y 720 px; comprobar ambos lados cuando se modifiquen. No considerar resuelto un desajuste porque un breakpoint oculta el elemento afectado.

Inspeccionar desbordamientos, nombres largos, alineación de marca/separador, centrado de iconos, textos cortados y visibilidad de la acción principal. Probar al 100 % y con zoom aumentado cuando afecte la cabecera. Comparar antes/después al mismo tamaño y con el mismo estado de sesión.

Entregar capturas reales dentro de la conversación para revisión remota desde celular; una pestaña abierta en el PC no es evidencia visible para ese usuario. No sustituir capturas por imágenes generadas. Indicar ancho y estado probado. Las pruebas unitarias y el build no verifican alineación visual.

## 9. Flujo para participantes e IA

1. Leer `AGENTS.md`, esta guía y el componente vecino antes de editar.
2. Identificar tarea, responsable y criterios de aceptación. No apropiarse de tareas de otras personas.
3. Reutilizar estilos/componentes del sistema y limitar el cambio al alcance solicitado.
4. Verificar funcionalidad y apariencia en los estados que muestran los elementos modificados.
5. Ejecutar los checks exigidos por el repositorio antes de commit y entregar evidencia visual si cambió la interfaz.
6. Documentar cualquier patrón nuevo aprobado aquí, junto a su implementación. No declarar implementadas variables o componentes que solo son propuestas.

Inconsistencia heredada conocida: `.sidebar .brand` usa Georgia. Es una excepción pendiente, no el patrón a imitar; no extenderla a nuevos módulos. Su corrección debe incluirse en una tarea explícita de unificación visual.

Prompt sugerido para otra IA: «Lee AGENTS.md y docs/GUIA-DE-DISENO.md. Implementa la tarea reutilizando el diseño de NuryBase. Verifica sesión iniciada, distintos anchos y estados relevantes; entrega capturas reales y resultados de validación».
