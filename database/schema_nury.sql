-- =====================================================================
-- NURY CAFETERÍA — Esquema de Base de Datos: Inventario + Ventas
-- Motor: PostgreSQL (compatible con mínimos ajustes en MySQL/SQLite)
-- Versión 3 — ajusta facturas_compra/detalle_factura_compra a una factura
-- real (descuentos, flete, impuesto específico, código del proveedor y
-- presentación de compra), a partir de una factura real de Coca-Cola Andina.
-- =====================================================================
--
-- IDEA CENTRAL DEL MODELO
-- ------------------------
-- 1. Todo lo que se compra (pan, queso, café, leche, azúcar, servilletas, etc.)
--    es un INGREDIENTE. Es la única fuente de verdad del stock físico.
-- 2. Lo que se vende (un sándwich, un café con leche, una porción de torta)
--    es un PRODUCTO. Un producto NO tiene stock propio: tiene una RECETA
--    que dice cuánto de cada ingrediente necesita.
-- 3. Al registrar una FACTURA DE COMPRA -> sube el stock de los ingredientes
--    EN LA SUCURSAL que recibió la mercadería.
-- 4. Al registrar una VENTA -> se recorre la receta del producto vendido y
--    se descuenta automáticamente el stock de cada ingrediente involucrado,
--    en la sucursal donde ocurrió la venta.
-- 5. Todo movimiento de stock (por compra, venta o ajuste manual/merma)
--    queda registrado en un "kardex" (movimientos_stock) para trazabilidad.
--
-- QUÉ CAMBIA EN ESTA VERSIÓN respecto a la v1
-- --------------------------------------------
-- - El stock deja de vivir en `ingredientes` y pasa a `stock_sucursal`:
--   cada sucursal tiene su propia cantidad física del mismo ingrediente
--   del catálogo. `ingredientes` queda como catálogo puro (nombre, unidad,
--   costo promedio), no como inventario.
-- - `facturas_compra` y `ventas` ahora quedan atadas a una `sucursal_id`,
--   lo que hace posible el reporte de ventas por sucursal.
-- - Se agrega `usuarios` (cajeros/administradores) con rol, credenciales
--   y ciclo de vida (activo/inactivo, nunca borrado si tiene historial),
--   lo que hace posible el reporte de desempeño por cajero.
-- - Se agrega `promociones`, con vigencia por fecha/hora/día de semana,
--   y `detalle_venta` ahora guarda precio de lista y precio aplicado por
--   separado para poder medir el impacto real de cada promoción.
--
-- QUÉ CAMBIA EN LA VERSIÓN 3 (a partir de una factura real de proveedor)
-- -----------------------------------------------------------------------
-- Una factura real de un proveedor como Coca-Cola Andina trae columnas que
-- v1/v2 no contemplaban: código propio del proveedor por producto, la
-- presentación de compra (cajas de N botellas, no la unidad del ingrediente),
-- descuento por línea, flete por línea, y un impuesto específico (el
-- impuesto adicional a bebidas analcohólicas/alcohólicas, ILA/IABA en Chile)
-- que también va por línea. Se agrega:
-- - `codigos_proveedor_ingrediente`: mapea el código SKU de cada proveedor
--   (ej. '122951') a nuestro ingrediente del catálogo, para que el futuro
--   OCR pueda identificar la línea sin adivinar por el nombre.
-- - `detalle_factura_compra` gana `codigo_proveedor`, `presentacion_compra`,
--   `unidades_por_presentacion`, `descuento_porcentaje`, `descuento_monto`,
--   `flete` e `impuesto_especifico`. El antiguo `subtotal` (generado) se
--   reemplaza por `subtotal_neto` (cantidad × precio − descuento) y
--   `total_linea` (subtotal_neto + flete + impuesto_especifico).
-- - `facturas_compra` gana `monto_neto`, `monto_iva` y
--   `monto_impuestos_especificos`, para que el total de la cabecera se
--   pueda cuadrar contra el desglose real que trae la factura.
-- - El trigger de compra ahora calcula el costo promedio del ingrediente
--   sobre el COSTO REAL POR UNIDAD (incluye descuento, flete e impuesto
--   específico prorrateados), no sobre el precio de lista — así el margen
--   de `v_costo_producto` refleja lo que Nury realmente pagó, no el precio
--   antes de cargos.
--
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. UNIDADES DE MEDIDA
-- ---------------------------------------------------------------------
CREATE TABLE unidades_medida (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(40) NOT NULL UNIQUE,   -- 'Kilogramo', 'Unidad', 'Litro'
    abreviatura     VARCHAR(10) NOT NULL UNIQUE     -- 'kg', 'un', 'L'
);

INSERT INTO unidades_medida (nombre, abreviatura) VALUES
    ('Kilogramo', 'kg'),
    ('Gramo', 'g'),
    ('Litro', 'L'),
    ('Mililitro', 'ml'),
    ('Unidad', 'un'),
    ('Paquete', 'paq');


-- ---------------------------------------------------------------------
-- 2. CATEGORÍAS DE INGREDIENTE (opcional, para orden y reportes)
-- ---------------------------------------------------------------------
CREATE TABLE categorias_ingrediente (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(60) NOT NULL UNIQUE   -- 'Panadería', 'Lácteos', 'Café', 'Insumos'
);


-- ---------------------------------------------------------------------
-- 3. SUCURSALES
-- ---------------------------------------------------------------------
CREATE TABLE sucursales (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(120) NOT NULL UNIQUE,   -- 'Nury Providencia', 'Nury Ñuñoa'
    direccion   VARCHAR(200),
    telefono    VARCHAR(30),
    activo      BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en   TIMESTAMP NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------
-- 4. PROVEEDORES  (sirven a todas las sucursales, no son exclusivos de una)
-- ---------------------------------------------------------------------
CREATE TABLE proveedores (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(120) NOT NULL,
    rut         VARCHAR(20) UNIQUE,   -- llave natural del proveedor chileno; permite NULL, evita duplicados al recargar
    telefono    VARCHAR(30),
    email       VARCHAR(120),
    creado_en   TIMESTAMP NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------
-- 5. INGREDIENTES  (catálogo — el stock físico vive en stock_sucursal)
-- ---------------------------------------------------------------------
CREATE TABLE ingredientes (
    id                      SERIAL PRIMARY KEY,
    nombre                  VARCHAR(120) NOT NULL UNIQUE,   -- 'Pan de molde', 'Queso gauda laminado'
    categoria_id            INTEGER REFERENCES categorias_ingrediente(id),
    unidad_id               INTEGER NOT NULL REFERENCES unidades_medida(id),
    costo_unitario_promedio NUMERIC(12,2) NOT NULL DEFAULT 0,  -- costo promedio ponderado global (todas las sucursales)
    codigo_barras           VARCHAR(64) UNIQUE,   -- EAN/UPC físico del ingrediente (para escaneo al recibir factura)
    activo                  BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en               TIMESTAMP NOT NULL DEFAULT now(),
    actualizado_en          TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_ingredientes_activo ON ingredientes(activo);


-- ---------------------------------------------------------------------
-- 6. STOCK POR SUCURSAL  (el inventario físico real, uno por local)
-- ---------------------------------------------------------------------
CREATE TABLE stock_sucursal (
    id              SERIAL PRIMARY KEY,
    ingrediente_id  INTEGER NOT NULL REFERENCES ingredientes(id),
    sucursal_id     INTEGER NOT NULL REFERENCES sucursales(id),
    stock_actual    NUMERIC(12,3) NOT NULL DEFAULT 0,
    stock_minimo    NUMERIC(12,3) NOT NULL DEFAULT 0,   -- umbral de reposición, propio de cada local
    actualizado_en  TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (ingrediente_id, sucursal_id)
);

CREATE INDEX idx_stock_sucursal_sucursal ON stock_sucursal(sucursal_id);


-- ---------------------------------------------------------------------
-- 7. FACTURAS DE COMPRA (cabecera)  -- esto es lo que se "escanea"
-- ---------------------------------------------------------------------
CREATE TABLE facturas_compra (
    id                          SERIAL PRIMARY KEY,
    proveedor_id                INTEGER REFERENCES proveedores(id),
    sucursal_id                 INTEGER NOT NULL REFERENCES sucursales(id),  -- local que recibió la mercadería
    numero_factura              VARCHAR(60),
    fecha_factura               DATE NOT NULL,
    fecha_registro              TIMESTAMP NOT NULL DEFAULT now(),
    monto_neto                  NUMERIC(12,2),   -- neto antes de IVA e impuestos específicos (campo "NETO" de la factura)
    monto_iva                   NUMERIC(12,2),   -- IVA 19%
    monto_impuestos_especificos NUMERIC(12,2),   -- suma de impuestos adicionales (IABA/ILA en bebidas, u otros rubros)
    monto_total                 NUMERIC(12,2),   -- total final de la factura (campo "TOTAL")
    archivo_url                 TEXT,                 -- link/ruta a la imagen o PDF escaneado (respaldo)
    estado                      VARCHAR(20) NOT NULL DEFAULT 'confirmada'
                                    CHECK (estado IN ('pendiente_revision','confirmada','anulada')),
    creado_en                   TIMESTAMP NOT NULL DEFAULT now()
);

-- Mapea el código SKU propio de cada proveedor (columna "COD" de la factura)
-- a nuestro ingrediente del catálogo. El mismo ingrediente puede tener un
-- código distinto según el proveedor; esto es lo que permite que un OCR
-- futuro identifique la línea sin adivinar por el nombre/descripción.
CREATE TABLE codigos_proveedor_ingrediente (
    id                      SERIAL PRIMARY KEY,
    proveedor_id            INTEGER NOT NULL REFERENCES proveedores(id),
    ingrediente_id          INTEGER NOT NULL REFERENCES ingredientes(id),
    codigo                  VARCHAR(30) NOT NULL,        -- ej. '122951'
    descripcion_proveedor   VARCHAR(150),                 -- ej. 'Coca Cola PT591cc x 6' (texto tal cual en la factura)
    UNIQUE (proveedor_id, codigo)
);

-- Detalle de la factura: cada línea es un ingrediente comprado
CREATE TABLE detalle_factura_compra (
    id                          SERIAL PRIMARY KEY,
    factura_id                  INTEGER NOT NULL REFERENCES facturas_compra(id) ON DELETE CASCADE,
    ingrediente_id              INTEGER NOT NULL REFERENCES ingredientes(id),
    codigo_proveedor            VARCHAR(30),      -- código tal cual aparece en ESTA factura (columna "COD")
    presentacion_compra         VARCHAR(40),      -- ej. 'Caja x6' — cómo se compró, no necesariamente la unidad base
    unidades_por_presentacion   NUMERIC(10,2) DEFAULT 1,  -- ej. 6 botellas por caja; solo referencia/auditoría
    cantidad                    NUMERIC(12,3) NOT NULL CHECK (cantidad > 0),  -- SIEMPRE en la unidad base del ingrediente
    unidad_id                   INTEGER NOT NULL REFERENCES unidades_medida(id),
    precio_unitario             NUMERIC(12,2) NOT NULL,  -- precio de lista por unidad base, antes de descuento
    descuento_porcentaje        NUMERIC(5,2) NOT NULL DEFAULT 0,   -- "TASA DESCTO%"
    descuento_monto             NUMERIC(12,2) NOT NULL DEFAULT 0,  -- "MONTO DESCTO"
    flete                       NUMERIC(12,2) NOT NULL DEFAULT 0,  -- "FLETE" de esta línea
    impuesto_especifico         NUMERIC(12,2) NOT NULL DEFAULT 0,  -- "IMPTO ESPECIF." (ILA/IABA u otro impuesto adicional)
    subtotal_neto  NUMERIC(12,2) GENERATED ALWAYS AS ((cantidad * precio_unitario) - descuento_monto) STORED,
    total_linea    NUMERIC(12,2) GENERATED ALWAYS AS
                        ((cantidad * precio_unitario) - descuento_monto + flete + impuesto_especifico) STORED
);


-- ---------------------------------------------------------------------
-- 8. PRODUCTOS  (lo que se vende: sándwiches, cafés, pasteles, etc.)
-- ---------------------------------------------------------------------
CREATE TABLE productos (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(120) NOT NULL UNIQUE,   -- 'Sándwich de queso', 'Café con leche'
    categoria       VARCHAR(60),                     -- 'Sándwiches', 'Bebidas calientes', 'Pastelería'
    precio_venta    NUMERIC(12,2) NOT NULL,
    codigo_barras   VARCHAR(64) UNIQUE,   -- EAN/UPC físico del producto (para escaneo directo en el POS)
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMP NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------
-- 9. RECETAS (BOM: Bill of Materials) -- el corazón del descuento automático
--    Une un producto con los ingredientes (y cantidades) que necesita.
--    Es a nivel de catálogo: la misma receta aplica en todas las sucursales.
-- ---------------------------------------------------------------------
CREATE TABLE recetas (
    id                  SERIAL PRIMARY KEY,
    producto_id         INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    ingrediente_id      INTEGER NOT NULL REFERENCES ingredientes(id),
    cantidad_necesaria  NUMERIC(12,3) NOT NULL CHECK (cantidad_necesaria > 0),
    unidad_id           INTEGER NOT NULL REFERENCES unidades_medida(id),
    UNIQUE (producto_id, ingrediente_id)
);

-- Ejemplo de datos (ilustrativo, no se ejecuta automáticamente):
-- INSERT INTO productos (nombre, categoria, precio_venta) VALUES ('Sándwich de queso', 'Sándwiches', 3500);
-- INSERT INTO recetas (producto_id, ingrediente_id, cantidad_necesaria, unidad_id)
--   VALUES (<id_sandwich>, <id_pan>, 2, <id_unidad_un>),
--          (<id_sandwich>, <id_queso>, 30, <id_unidad_g>);


-- ---------------------------------------------------------------------
-- 10. USUARIOS (cajeros y administradores)
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
    id                      SERIAL PRIMARY KEY,
    nombre                  VARCHAR(120) NOT NULL,
    identificador_acceso    VARCHAR(120) NOT NULL UNIQUE,   -- usuario, RUT o email de login
    password_hash           TEXT NOT NULL,                   -- nunca texto plano (bcrypt/argon2, etc.)
    rol                     VARCHAR(20) NOT NULL CHECK (rol IN ('cajero','administrador')),
    sucursal_id             INTEGER REFERENCES sucursales(id),  -- local fijo del cajero; NULL permitido solo para administradores
    debe_cambiar_password   BOOLEAN NOT NULL DEFAULT TRUE,    -- fuerza cambio en primer login
    activo                  BOOLEAN NOT NULL DEFAULT TRUE,    -- deshabilitar = false, nunca borrar si tiene ventas
    creado_en               TIMESTAMP NOT NULL DEFAULT now(),
    actualizado_en          TIMESTAMP NOT NULL DEFAULT now(),
    CHECK (rol <> 'cajero' OR sucursal_id IS NOT NULL)  -- todo cajero debe tener una sucursal fija asignada
);

-- (Se eliminó usuario_sucursal: cada cajero trabaja en una única sucursal,
-- así que basta con el campo usuarios.sucursal_id — no hace falta una
-- relación muchos-a-muchos.)

-- Turnos: permite medir desempeño por turno y no solo por día calendario
CREATE TABLE turnos (
    id              SERIAL PRIMARY KEY,
    usuario_id      INTEGER NOT NULL REFERENCES usuarios(id),
    sucursal_id     INTEGER NOT NULL REFERENCES sucursales(id),
    hora_inicio     TIMESTAMP NOT NULL,
    hora_fin        TIMESTAMP,   -- NULL mientras el turno sigue abierto
    creado_en       TIMESTAMP NOT NULL DEFAULT now()
);

-- Auditoría: quién cambió qué campo de qué usuario, y cuándo
CREATE TABLE auditoria_usuarios (
    id                  SERIAL PRIMARY KEY,
    usuario_id          INTEGER NOT NULL REFERENCES usuarios(id),
    accion              VARCHAR(20) NOT NULL CHECK (accion IN ('creacion','edicion','deshabilitacion','reactivacion')),
    campo_modificado    VARCHAR(60),
    valor_anterior      TEXT,
    valor_nuevo         TEXT,
    realizado_por       INTEGER REFERENCES usuarios(id),   -- quién hizo el cambio (no puede ser el mismo usuario_id)
    creado_en           TIMESTAMP NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------
-- 11. PROMOCIONES
-- ---------------------------------------------------------------------
CREATE TABLE promociones (
    id                      SERIAL PRIMARY KEY,
    nombre                  VARCHAR(120) NOT NULL,          -- 'Happy hour café', 'Combo sándwich + café'
    tipo                    VARCHAR(20) NOT NULL
                                CHECK (tipo IN ('porcentaje','monto_fijo','precio_fijo','combo')),
    valor_descuento         NUMERIC(12,2),                   -- % si tipo='porcentaje', $ si 'monto_fijo'/'precio_fijo'
    fecha_inicio            DATE NOT NULL,
    fecha_fin               DATE NOT NULL,
    hora_inicio             TIME,                            -- NULL = aplica todo el día
    hora_fin                TIME,                            -- NULL = aplica todo el día
    dias_semana             INTEGER[],                       -- 0=domingo ... 6=sábado; NULL = todos los días
    prioridad               INTEGER NOT NULL DEFAULT 0,      -- mayor prioridad gana si dos promos aplican a la vez
    combinable_con_otras    BOOLEAN NOT NULL DEFAULT FALSE,
    activa                  BOOLEAN NOT NULL DEFAULT TRUE,   -- interruptor manual, además de la vigencia programada
    creado_por              INTEGER REFERENCES usuarios(id), -- solo administradores crean promociones (regla de aplicación)
    creado_en               TIMESTAMP NOT NULL DEFAULT now(),
    CHECK (fecha_fin >= fecha_inicio)
);

-- Productos a los que aplica la promoción (una promo puede cubrir varios productos, ej. un combo)
CREATE TABLE promocion_productos (
    promocion_id    INTEGER NOT NULL REFERENCES promociones(id) ON DELETE CASCADE,
    producto_id     INTEGER NOT NULL REFERENCES productos(id),
    PRIMARY KEY (promocion_id, producto_id)
);

-- Registro de alertas cuando una promoción deja el precio bajo el costo de receta (no bloquea, solo avisa)
CREATE TABLE alertas_margen (
    id              SERIAL PRIMARY KEY,
    promocion_id    INTEGER REFERENCES promociones(id),
    producto_id     INTEGER NOT NULL REFERENCES productos(id),
    costo_receta    NUMERIC(12,2) NOT NULL,
    precio_aplicado NUMERIC(12,2) NOT NULL,
    venta_id        INTEGER,
    creado_en       TIMESTAMP NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------
-- 12. VENTAS (cabecera del ticket/boleta)
-- ---------------------------------------------------------------------
CREATE TABLE ventas (
    id              SERIAL PRIMARY KEY,
    sucursal_id     INTEGER NOT NULL REFERENCES sucursales(id),
    cajero_id       INTEGER REFERENCES usuarios(id),   -- NULL = venta sin cajero atribuido (se reporta aparte)
    fecha_venta     TIMESTAMP NOT NULL DEFAULT now(),
    medio_pago      VARCHAR(30),        -- 'efectivo', 'debito', 'credito', 'transferencia'
    total           NUMERIC(12,2) NOT NULL DEFAULT 0,
    anulada         BOOLEAN NOT NULL DEFAULT FALSE,
    anulada_en      TIMESTAMP,
    anulada_por     INTEGER REFERENCES usuarios(id),
    creado_en       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_ventas_sucursal_fecha ON ventas(sucursal_id, fecha_venta);
CREATE INDEX idx_ventas_cajero_fecha ON ventas(cajero_id, fecha_venta);

CREATE TABLE detalle_venta (
    id              SERIAL PRIMARY KEY,
    venta_id        INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id     INTEGER NOT NULL REFERENCES productos(id),
    promocion_id    INTEGER REFERENCES promociones(id),   -- NULL = se vendió a precio de lista
    cantidad        NUMERIC(12,3) NOT NULL CHECK (cantidad > 0),
    precio_lista    NUMERIC(12,2) NOT NULL,   -- precio normal del producto al momento de la venta
    precio_unitario NUMERIC(12,2) NOT NULL,   -- precio realmente cobrado (con promoción aplicada, si corresponde)
    subtotal        NUMERIC(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED
);


-- ---------------------------------------------------------------------
-- 13. MOVIMIENTOS DE STOCK (kardex) -- historial de TODO cambio de inventario,
--     ahora también identificado por sucursal.
-- ---------------------------------------------------------------------
CREATE TABLE movimientos_stock (
    id                  SERIAL PRIMARY KEY,
    ingrediente_id      INTEGER NOT NULL REFERENCES ingredientes(id),
    sucursal_id         INTEGER NOT NULL REFERENCES sucursales(id),
    tipo_movimiento     VARCHAR(20) NOT NULL
                            CHECK (tipo_movimiento IN ('compra','venta','ajuste','merma')),
    cantidad            NUMERIC(12,3) NOT NULL,   -- positivo = entrada, negativo = salida
    stock_resultante    NUMERIC(12,3) NOT NULL,   -- stock del ingrediente en esa sucursal después del movimiento
    referencia_tipo     VARCHAR(30),               -- 'factura_compra', 'venta', 'ajuste_manual'
    referencia_id       INTEGER,                   -- id de la factura/venta/ajuste que originó el movimiento
    nota                TEXT,
    creado_en           TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_movimientos_ingrediente_sucursal ON movimientos_stock(ingrediente_id, sucursal_id, creado_en);


-- =====================================================================
-- TRIGGERS: automatizan el descuento/reposición de stock
-- =====================================================================

-- ---------------------------------------------------------------------
-- A) Al insertar una línea de FACTURA DE COMPRA -> sube stock del ingrediente
--    EN LA SUCURSAL de la factura, y recalcula costo promedio ponderado global.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_aplicar_compra() RETURNS TRIGGER AS $$
DECLARE
    v_sucursal_id    INTEGER;
    v_stock_previo   NUMERIC(12,3);
    v_costo_previo   NUMERIC(12,2);
    v_nuevo_stock    NUMERIC(12,3);
    v_nuevo_costo    NUMERIC(12,2);
    v_costo_real_linea NUMERIC(12,4);  -- costo real por unidad base de ESTA compra (con descuento, flete e impuesto)
BEGIN
    SELECT sucursal_id INTO v_sucursal_id FROM facturas_compra WHERE id = NEW.factura_id;

    -- Asegura que exista la fila de stock para ese ingrediente en esa sucursal
    INSERT INTO stock_sucursal (ingrediente_id, sucursal_id, stock_actual, stock_minimo)
    VALUES (NEW.ingrediente_id, v_sucursal_id, 0, 0)
    ON CONFLICT (ingrediente_id, sucursal_id) DO NOTHING;

    SELECT stock_actual INTO v_stock_previo
      FROM stock_sucursal
     WHERE ingrediente_id = NEW.ingrediente_id AND sucursal_id = v_sucursal_id
     FOR UPDATE;

    SELECT costo_unitario_promedio INTO v_costo_previo
      FROM ingredientes WHERE id = NEW.ingrediente_id
      FOR UPDATE;

    v_nuevo_stock := v_stock_previo + NEW.cantidad;

    -- Costo real por unidad de ESTA línea: precio de lista, menos descuento, más flete e
    -- impuesto específico prorrateados sobre la cantidad — lo que realmente costó cada unidad puesta en la sucursal.
    v_costo_real_linea := NEW.total_linea / NEW.cantidad;

    -- Costo promedio ponderado global: (stock_previo*costo_previo + compra*costo_real) / stock_nuevo
    IF v_nuevo_stock > 0 THEN
        v_nuevo_costo := ((v_stock_previo * v_costo_previo) + (NEW.cantidad * v_costo_real_linea)) / v_nuevo_stock;
    ELSE
        v_nuevo_costo := v_costo_real_linea;
    END IF;

    UPDATE stock_sucursal
       SET stock_actual = v_nuevo_stock,
           actualizado_en = now()
     WHERE ingrediente_id = NEW.ingrediente_id AND sucursal_id = v_sucursal_id;

    UPDATE ingredientes
       SET costo_unitario_promedio = v_nuevo_costo,
           actualizado_en = now()
     WHERE id = NEW.ingrediente_id;

    INSERT INTO movimientos_stock
        (ingrediente_id, sucursal_id, tipo_movimiento, cantidad, stock_resultante, referencia_tipo, referencia_id)
    VALUES
        (NEW.ingrediente_id, v_sucursal_id, 'compra', NEW.cantidad, v_nuevo_stock, 'factura_compra', NEW.factura_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_detalle_factura_compra_insert
AFTER INSERT ON detalle_factura_compra
FOR EACH ROW EXECUTE FUNCTION fn_aplicar_compra();


-- ---------------------------------------------------------------------
-- B) Al insertar una línea de VENTA -> descuenta stock de CADA ingrediente
--    de la receta del producto vendido, EN LA SUCURSAL de la venta.
--    Ventas anuladas (ventas.anulada = true) no llegan a esta lógica: el
--    descuento ocurre al insertar detalle_venta, así que anular una venta
--    debe manejarse como una reversión explícita (ver nota abajo).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_aplicar_venta() RETURNS TRIGGER AS $$
DECLARE
    v_sucursal_id  INTEGER;
    receta_row     RECORD;
    v_stock_previo NUMERIC(12,3);
    v_descuento    NUMERIC(12,3);
    v_nuevo_stock  NUMERIC(12,3);
    v_costo_receta NUMERIC(12,2);
BEGIN
    SELECT sucursal_id INTO v_sucursal_id FROM ventas WHERE id = NEW.venta_id;

    FOR receta_row IN
        SELECT ingrediente_id, cantidad_necesaria
          FROM recetas
         WHERE producto_id = NEW.producto_id
    LOOP
        v_descuento := receta_row.cantidad_necesaria * NEW.cantidad;

        INSERT INTO stock_sucursal (ingrediente_id, sucursal_id, stock_actual, stock_minimo)
        VALUES (receta_row.ingrediente_id, v_sucursal_id, 0, 0)
        ON CONFLICT (ingrediente_id, sucursal_id) DO NOTHING;

        SELECT stock_actual INTO v_stock_previo
          FROM stock_sucursal
         WHERE ingrediente_id = receta_row.ingrediente_id AND sucursal_id = v_sucursal_id
         FOR UPDATE;

        v_nuevo_stock := v_stock_previo - v_descuento;

        UPDATE stock_sucursal
           SET stock_actual = v_nuevo_stock,
               actualizado_en = now()
         WHERE ingrediente_id = receta_row.ingrediente_id AND sucursal_id = v_sucursal_id;

        INSERT INTO movimientos_stock
            (ingrediente_id, sucursal_id, tipo_movimiento, cantidad, stock_resultante, referencia_tipo, referencia_id)
        VALUES
            (receta_row.ingrediente_id, v_sucursal_id, 'venta', -v_descuento, v_nuevo_stock, 'venta', NEW.venta_id);
    END LOOP;

    -- Alerta de margen: si la línea trae promoción y el precio aplicado queda bajo el costo de receta, se registra (no bloquea)
    IF NEW.promocion_id IS NOT NULL THEN
        SELECT COALESCE(SUM(r.cantidad_necesaria * i.costo_unitario_promedio), 0)
          INTO v_costo_receta
          FROM recetas r JOIN ingredientes i ON i.id = r.ingrediente_id
         WHERE r.producto_id = NEW.producto_id;

        IF NEW.precio_unitario < v_costo_receta THEN
            INSERT INTO alertas_margen (promocion_id, producto_id, costo_receta, precio_aplicado, venta_id)
            VALUES (NEW.promocion_id, NEW.producto_id, v_costo_receta, NEW.precio_unitario, NEW.venta_id);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_detalle_venta_insert
AFTER INSERT ON detalle_venta
FOR EACH ROW EXECUTE FUNCTION fn_aplicar_venta();

-- NOTA sobre anulaciones: anular una venta (ventas.anulada = true) es un cambio
-- de estado, no un DELETE. Si el negocio requiere que anular una venta también
-- reponga el stock descontado, eso debe hacerse con una lógica explícita de
-- reversión (un movimiento_stock de signo contrario, tipo 'ajuste'), nunca
-- borrando la venta original, para no perder el rastro de qué pasó.


-- ---------------------------------------------------------------------
-- C) Mantener el total de la venta sincronizado
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_actualizar_total_venta() RETURNS TRIGGER AS $$
BEGIN
    UPDATE ventas
       SET total = (SELECT COALESCE(SUM(subtotal),0) FROM detalle_venta WHERE venta_id = NEW.venta_id)
     WHERE id = NEW.venta_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_total_venta
AFTER INSERT ON detalle_venta
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_total_venta();


-- =====================================================================
-- REGISTRO DE VENTAS SIN POS
-- =====================================================================
-- Mientras no exista un POS, cargar una venta a mano significa: insertar en
-- `ventas`, sacar el id con currval(), e insertar una fila en `detalle_venta`
-- POR CADA producto vendido — fácil de errar y lento de escribir todos los
-- días. `fn_registrar_venta` empaqueta eso en una sola llamada: recibe la
-- sucursal, el cajero, el medio de pago y una lista de productos por NOMBRE
-- (no por id), y hace todos los INSERT por dentro. Como sigue usando
-- `INSERT INTO detalle_venta`, los triggers de descuento de stock y de
-- alerta de margen se disparan exactamente igual que si se hubiera hecho a
-- mano. Esta función es el punto de entrada mínimo para vender "sin POS";
-- una futura pantalla o app solo tendría que armar el JSON y llamarla.
CREATE OR REPLACE FUNCTION fn_registrar_venta(
    p_sucursal_id   INTEGER,
    p_cajero_id     INTEGER,
    p_medio_pago    VARCHAR,
    p_items         JSONB   -- ej. '[{"producto":"Sándwich de queso","cantidad":2}]'
                            --      o con precio promocional:
                            --     '[{"producto":"Café con leche","cantidad":1,"precio_unitario":1500,"promocion_id":3}]'
) RETURNS INTEGER AS $$
DECLARE
    v_venta_id      INTEGER;
    item            JSONB;
    v_producto_id   INTEGER;
    v_precio_lista  NUMERIC(12,2);
    v_precio_final  NUMERIC(12,2);
    v_promocion_id  INTEGER;
    v_cantidad      NUMERIC(12,3);
BEGIN
    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'La venta no tiene productos';
    END IF;

    INSERT INTO ventas (sucursal_id, cajero_id, medio_pago)
    VALUES (p_sucursal_id, p_cajero_id, p_medio_pago)
    RETURNING id INTO v_venta_id;

    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT id, precio_venta INTO v_producto_id, v_precio_lista
          FROM productos
         WHERE nombre = item->>'producto' AND activo = TRUE;

        IF v_producto_id IS NULL THEN
            RAISE EXCEPTION 'Producto no encontrado o inactivo: %', item->>'producto';
        END IF;

        v_cantidad     := (item->>'cantidad')::NUMERIC;
        v_promocion_id := NULLIF(item->>'promocion_id', '')::INTEGER;
        v_precio_final := COALESCE((item->>'precio_unitario')::NUMERIC, v_precio_lista);

        INSERT INTO detalle_venta (venta_id, producto_id, promocion_id, cantidad, precio_lista, precio_unitario)
        VALUES (v_venta_id, v_producto_id, v_promocion_id, v_cantidad, v_precio_lista, v_precio_final);
    END LOOP;

    RETURN v_venta_id;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------
-- D) Auditoría de usuarios: registra cambios de rol, estado activo e
--    identificador de acceso cada vez que se edita un usuario.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_auditar_usuario() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.rol IS DISTINCT FROM OLD.rol THEN
        INSERT INTO auditoria_usuarios (usuario_id, accion, campo_modificado, valor_anterior, valor_nuevo)
        VALUES (NEW.id, 'edicion', 'rol', OLD.rol, NEW.rol);
    END IF;

    IF NEW.activo IS DISTINCT FROM OLD.activo THEN
        INSERT INTO auditoria_usuarios (usuario_id, accion, campo_modificado, valor_anterior, valor_nuevo)
        VALUES (NEW.id, CASE WHEN NEW.activo THEN 'reactivacion' ELSE 'deshabilitacion' END,
                'activo', OLD.activo::TEXT, NEW.activo::TEXT);
    END IF;

    IF NEW.identificador_acceso IS DISTINCT FROM OLD.identificador_acceso THEN
        INSERT INTO auditoria_usuarios (usuario_id, accion, campo_modificado, valor_anterior, valor_nuevo)
        VALUES (NEW.id, 'edicion', 'identificador_acceso', OLD.identificador_acceso, NEW.identificador_acceso);
    END IF;

    NEW.actualizado_en := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auditar_usuario
BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION fn_auditar_usuario();

-- NOTA: "un cajero no puede editar su propio perfil" y "eliminar está bloqueado
-- si tiene ventas asociadas" son reglas de permisos y de flujo de aplicación
-- (quién ejecuta el UPDATE/DELETE), no algo que la base de datos por sí sola
-- pueda saber sin una capa de autenticación. La base solo puede garantizar la
-- parte estructural: por ejemplo, `ventas.cajero_id` referencia a `usuarios(id)`
-- sin ON DELETE CASCADE, así que un intento de borrar un usuario con ventas
-- asociadas falla por restricción de llave foránea en vez de borrar en silencio.


-- =====================================================================
-- VISTAS ÚTILES
-- =====================================================================

-- Ingredientes bajo el mínimo, por sucursal -> lista de reposición local
CREATE VIEW v_ingredientes_bajo_stock AS
SELECT s.sucursal_id, suc.nombre AS sucursal, i.id AS ingrediente_id, i.nombre AS ingrediente,
       s.stock_actual, s.stock_minimo,
       (s.stock_minimo - s.stock_actual) AS cantidad_a_reponer
  FROM stock_sucursal s
  JOIN ingredientes i ON i.id = s.ingrediente_id
  JOIN sucursales suc ON suc.id = s.sucursal_id
 WHERE i.activo = TRUE
   AND s.stock_actual < s.stock_minimo;

-- Costo de receta de cada producto (para saber margen real) — global, no depende de sucursal
CREATE VIEW v_costo_producto AS
SELECT p.id AS producto_id, p.nombre AS producto,
       SUM(r.cantidad_necesaria * i.costo_unitario_promedio) AS costo_receta,
       p.precio_venta,
       p.precio_venta - SUM(r.cantidad_necesaria * i.costo_unitario_promedio) AS margen_estimado
  FROM productos p
  JOIN recetas r ON r.producto_id = p.id
  JOIN ingredientes i ON i.id = r.ingrediente_id
 GROUP BY p.id, p.nombre, p.precio_venta;

-- Ventas por sucursal (excluye ventas anuladas)
CREATE VIEW v_ventas_por_sucursal AS
SELECT v.sucursal_id, s.nombre AS sucursal,
       COUNT(DISTINCT v.id) AS tickets,
       SUM(v.total) AS total_vendido,
       ROUND(SUM(v.total) / NULLIF(COUNT(DISTINCT v.id), 0), 2) AS ticket_promedio
  FROM ventas v
  JOIN sucursales s ON s.id = v.sucursal_id
 WHERE v.anulada = FALSE
 GROUP BY v.sucursal_id, s.nombre;

-- Desempeño por cajero (excluye ventas anuladas y ventas sin cajero atribuido)
CREATE VIEW v_desempeno_cajero AS
SELECT v.cajero_id, u.nombre AS cajero,
       COUNT(DISTINCT v.id) AS tickets,
       SUM(v.total) AS total_vendido,
       ROUND(SUM(v.total) / NULLIF(COUNT(DISTINCT v.id), 0), 2) AS ticket_promedio
  FROM ventas v
  JOIN usuarios u ON u.id = v.cajero_id
 WHERE v.anulada = FALSE
   AND v.cajero_id IS NOT NULL
 GROUP BY v.cajero_id, u.nombre;
