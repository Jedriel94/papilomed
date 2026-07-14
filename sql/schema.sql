-- =====================================================================
-- Esquema MySQL / MariaDB - Sistema de recolecciones Botikit / Papilomed
-- Se ejecuta desde api/setup.php (idempotente).
-- =====================================================================

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin','cliente') NOT NULL,
  nombre        VARCHAR(255) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Hospitales: un lugar con su dirección de calle. Se da de alta una vez y se reutiliza.
CREATE TABLE IF NOT EXISTS hospitales (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(255) NOT NULL,
  direccion  VARCHAR(500) NOT NULL,
  cliente_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_hospitales_cliente FOREIGN KEY (cliente_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_hospitales_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS medicos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre_medico VARCHAR(255) NOT NULL,
  hospital      VARCHAR(255) NOT NULL,          -- nombre del hospital (copia para mostrar)
  hospital_id   INT NULL,                       -- referencia al hospital
  ubicacion     VARCHAR(255) NULL,              -- torre / piso / consultorio dentro del hospital
  direccion     VARCHAR(500) NULL,              -- heredado (la dirección real vive en hospitales)
  telefono      VARCHAR(50)  NULL,
  muestras      INT NULL,
  estatus       ENUM('pendiente','muestra_dejada') NOT NULL DEFAULT 'pendiente',
  notas         TEXT NULL,
  cliente_id    INT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_medicos_cliente  FOREIGN KEY (cliente_id)  REFERENCES users(id)      ON DELETE SET NULL,
  CONSTRAINT fk_medicos_hospital FOREIGN KEY (hospital_id) REFERENCES hospitales(id) ON DELETE SET NULL,
  INDEX idx_medicos_estatus (estatus)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS solicitudes (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id        INT NOT NULL,
  medico_id         INT NULL,
  hospital          VARCHAR(255) NOT NULL,
  direccion         VARCHAR(500) NOT NULL,
  contacto          VARCHAR(255) NULL,
  telefono_contacto VARCHAR(50)  NULL,
  fecha_solicitada  DATE NULL,
  notas             TEXT NULL,
  estatus           ENUM('pendiente','asignada','en_proceso','completada','cancelada') NOT NULL DEFAULT 'pendiente',
  paqueteria        VARCHAR(50)  NULL,
  guia_rastreo      VARCHAR(100) NULL,
  guia_archivo      VARCHAR(255) NULL,
  asignado_a        INT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sol_cliente  FOREIGN KEY (cliente_id) REFERENCES users(id)   ON DELETE CASCADE,
  CONSTRAINT fk_sol_medico   FOREIGN KEY (medico_id)  REFERENCES medicos(id) ON DELETE SET NULL,
  CONSTRAINT fk_sol_asignado FOREIGN KEY (asignado_a) REFERENCES users(id)   ON DELETE SET NULL,
  INDEX idx_sol_cliente (cliente_id),
  INDEX idx_sol_estatus (estatus)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
