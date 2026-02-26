-- AlterEnum: añadir FISCAL al enum RolNombre
-- Nota: debe ejecutarse en transacción separada; el INSERT va en la siguiente migración
ALTER TYPE "RolNombre" ADD VALUE IF NOT EXISTS 'FISCAL';
