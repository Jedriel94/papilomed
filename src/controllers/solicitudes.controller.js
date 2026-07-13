const db = require('../db');

const ESTATUS_VALIDOS = ['pendiente', 'asignada', 'en_proceso', 'completada', 'cancelada'];

// Admin ve todas; cliente ve solo las suyas. Filtro opcional ?estatus=...
async function listar(req, res) {
  const params = [];
  const where = [];

  if (req.user.role === 'cliente') {
    params.push(req.user.id);
    where.push(`s.cliente_id = $${params.length}`);
  }
  if (req.query.estatus && ESTATUS_VALIDOS.includes(req.query.estatus)) {
    params.push(req.query.estatus);
    where.push(`s.estatus = $${params.length}`);
  }

  let sql = `
    SELECT s.*,
           m.nombre_medico AS medico_nombre,
           c.nombre        AS cliente_nombre,
           a.nombre        AS asignado_nombre
    FROM solicitudes s
    LEFT JOIN medicos m ON m.id = s.medico_id
    LEFT JOIN users   c ON c.id = s.cliente_id
    LEFT JOIN users   a ON a.id = s.asignado_a`;
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY s.created_at DESC';

  const { rows } = await db.query(sql, params);
  res.json(rows);
}

// Solo el cliente crea solicitudes.
async function crear(req, res) {
  const {
    hospital, medico_id, direccion, contacto,
    telefono_contacto, fecha_solicitada, notas,
  } = req.body || {};

  if (!hospital || !direccion) {
    return res.status(400).json({ error: 'hospital y direccion son requeridos' });
  }

  const { rows } = await db.query(
    `INSERT INTO solicitudes
       (cliente_id, medico_id, hospital, direccion, contacto, telefono_contacto, fecha_solicitada, notas)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      req.user.id,
      medico_id || null,
      hospital,
      direccion,
      contacto || null,
      telefono_contacto || null,
      fecha_solicitada || null,
      notas || null,
    ]
  );
  res.status(201).json(rows[0]);
}

// Solo admin: cambia el estatus de la solicitud.
async function cambiarEstatus(req, res) {
  const { id } = req.params;
  const { estatus } = req.body || {};
  if (!ESTATUS_VALIDOS.includes(estatus)) {
    return res.status(400).json({ error: 'estatus inválido' });
  }
  const { rows } = await db.query(
    'UPDATE solicitudes SET estatus = $1, updated_at = now() WHERE id = $2 RETURNING *',
    [estatus, id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Solicitud no encontrada' });
  res.json(rows[0]);
}

// Solo admin: se asigna la solicitud (pasa a 'asignada' si estaba pendiente).
async function asignarme(req, res) {
  const { id } = req.params;
  const { rows } = await db.query(
    `UPDATE solicitudes
       SET asignado_a = $1,
           estatus    = CASE WHEN estatus = 'pendiente' THEN 'asignada' ELSE estatus END,
           updated_at = now()
     WHERE id = $2 RETURNING *`,
    [req.user.id, id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Solicitud no encontrada' });
  res.json(rows[0]);
}

module.exports = { listar, crear, cambiarEstatus, asignarme };
