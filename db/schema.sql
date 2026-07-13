-- =====================================================================
-- Esquema de base de datos - Sistema de recolecciones Botikit / Papilomed
-- Se ejecuta automáticamente al arrancar el servidor (idempotente).
-- =====================================================================

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'cliente')),
  nombre        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS medicos (
  id            SERIAL PRIMARY KEY,
  nombre_medico TEXT NOT NULL,
  hospital      TEXT NOT NULL,
  direccion     TEXT,
  telefono      TEXT,
  estatus       TEXT NOT NULL DEFAULT 'pendiente'
                  CHECK (estatus IN ('pendiente', 'muestra_dejada')),
  notas         TEXT,
  cliente_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS solicitudes (
  id                SERIAL PRIMARY KEY,
  cliente_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  medico_id         INTEGER REFERENCES medicos(id) ON DELETE SET NULL,
  hospital          TEXT NOT NULL,
  direccion         TEXT NOT NULL,
  contacto          TEXT,
  telefono_contacto TEXT,
  fecha_solicitada  DATE,
  notas             TEXT,
  estatus           TEXT NOT NULL DEFAULT 'pendiente'
                      CHECK (estatus IN ('pendiente','asignada','en_proceso','completada','cancelada')),
  asignado_a        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_cliente ON solicitudes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estatus ON solicitudes(estatus);
CREATE INDEX IF NOT EXISTS idx_medicos_estatus     ON medicos(estatus);
