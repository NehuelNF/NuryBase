# Guía de diseño de NuryBase

Referencia compartida para participantes e IA. Leer antes de crear o modificar interfaces. Esta guía define continuidad visual; no autoriza cambios de negocio ni tomar tareas asignadas a otra persona.

## 1. Dirección visual

NuryBase es una herramienta de trabajo para una cafetería: cálida, sobria y fácil de operar durante un turno. Mantener fondos crema, verdes oliva, texto oscuro, bordes finos y espacios claros. Evitar tarjetas decorativas innecesarias, gradientes, neón, sombras fuertes, emojis como iconos principales y estilos distintos entre módulos.

Extender los componentes existentes antes de inventar variantes. Login, POS, caja e inventario deben sentirse parte de la misma aplicación.

## 2. Referencias vigentes

- Base global y foco: `src/styles.css`.
- POS: `src/app/features/pos/pages/pos-layout/`.
- Cobro: `src/app/features/pos/components/payment-modal/`.
- Acceso: `src/app/features/auth/pages/login/`.
- Navegación: `src/app/layout/sidebar/`.

Inspeccionar siempre estos archivos en la rama actual. Las capturas antiguas no reemplazan al código vigente.

## 3. Tipografía y paleta

Usar una sola familia: `'Segoe UI', Arial, sans-serif`, también en botones, campos y selectores.

| Función | Referencia |
| --- | --- |
| Fondo de aplicación | `#f5f3ed` |
| Superficie | `#fffefa` |
| Texto principal | `#292e27` |
| Acción principal | `#3d5334`, texto blanco |
| Texto secundario | `#68735e` |
| Bordes | `#dedfd5` / `#d4d8ca` |
| Foco | `#a64d34` |
| Sidebar | `#344337` |

Mantener estados comprensibles mediante texto o iconografía además del color. Para precios y reloj usar números tabulares. CLP se muestra sin decimales, por ejemplo `$4.800`.

## 4. Composición y componentes

- Usar flex/grid y separaciones de 8, 12, 16, 24 o 32 px.
- Mantener una acción principal clara por paso.
- Formularios con etiqueta accesible, error cercano y foco visible.
- Botones de icono con nombre accesible y controles táctiles de al menos 44 × 44 px cuando sea posible.
- Modales con título, explicación, cancelar y confirmar; overlay oscuro y panel crema.
- Estados vacíos, carga y error deben explicar qué ocurre y qué hacer.
- Respetar `prefers-reduced-motion` y el foco global.

## 5. Lenguaje y operación

Usar español claro y términos consistentes: «caja», «comanda», «medio de pago», «vuelto» y «comprobante».

La tarjeta se cobra en la máquina externa del local y el operador confirma el pago. No agregar pasarela, formulario de tarjeta/PIN ni aprobación automática. Para efectivo conservar vuelto y validaciones; para Junaeb conservar confirmación explícita. No cambiar reglas tributarias dentro de una tarea visual.

## 6. Revisión visual obligatoria

Para cambios de interfaz, probar el flujo real con sesión iniciada y datos cargados. Revisar, según el alcance, escritorio amplio (1440 px), compacto (1280 px), ambos lados de los breakpoints 1100/1101 px, tablet (768 px) y móvil (390 px).

Comprobar desbordamientos, textos cortados, foco, nombres largos, sidebar expandida/contraída y visibilidad de la acción principal. Entregar capturas reales para revisión remota. Las pruebas unitarias y el build no reemplazan esta revisión.

## 7. Flujo para participantes e IA

1. Leer `AGENTS.md`, esta guía y el componente vecino.
2. Confirmar tarea, responsable y criterios de aceptación.
3. Reutilizar estilos y componentes existentes.
4. Verificar funcionalidad, accesibilidad y apariencia.
5. Ejecutar pruebas y build antes de concluir.
6. Actualizar `docs/qa/registro-pruebas-unitarias.md` cuando se ejecuten pruebas.

La tarea de AuthGuard no modifica presentación visual, por lo que no requiere capturas mientras no cambie HTML o CSS.
