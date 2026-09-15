-- =====================================================================
-- Migración: agrega venta.turno_id
--
-- Por qué: para calcular la cuadratura de caja de un turno hace falta
-- saber, sin ambigüedad, qué ventas pertenecen a ese turno. Hoy
-- `venta` no tiene esa relación (ver src/app/core/models/venta.model.ts
-- y usuario.model.ts, generados a partir del esquema real). Inferirlo
-- por cajero_id + rango de horas es frágil (turnos que cruzan
-- medianoche, mismo cajero con dos turnos el mismo día, etc.).
--
-- Revisar antes de aplicar: los tipos y nombres exactos deben calzar
-- con nury_schema.sql (no está en este repo, solo en la máquina de
-- Nelson). Ajustar el tipo de la FK si `turno.id` no es `integer`.
-- =====================================================================

ALTER TABLE venta
    ADD COLUMN IF NOT EXISTS turno_id integer REFERENCES turno (id);

CREATE INDEX IF NOT EXISTS idx_venta_turno_id ON venta (turno_id);

COMMENT ON COLUMN venta.turno_id IS
    'Turno de caja en el que se registró la venta. Nulo solo para datos históricos previos a esta migración.';
