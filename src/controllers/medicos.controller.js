const db = require('../db');

const ESTATUS_VALIDOS = ['pendiente', 'muestra_dejada'];

// Lista compartida: tanto admin como cliente ven la misma lista.
// Filtro opcional por estatus: ?estatus=pendiente
async function listar(req, res) {
  const { estatus } = req.query;
  let sql = 'SELECT * FROM medicos';
  const params = [];
  if (estatus && ESTATUS_VALIDOS.includes(estatus)) {
    params.push(estatus);
    sql += ` WHERE estatus = $${params.length}`;
  }
  sql += ' ORDER BY hospital, nombre_medico';
  const { rows } = await db.query(sql, params);
  res.json(rows);
}

async function crear(req, res) {
  const { nombre_medico, hospital, direccion, telefono, notas, estatus } = req.body || {};
  if (!nombre_medico || !hospital) {
    return res.status(400).json({ error: 'nombre_medico y hospital son requeridos' });
  }
  const est = ESTATUS_VALIDOS.includes(estatus) ? estatus : 'pendiente';
  const { rows } = await db.query(
    `INSERT INTO medicos (nombre_medico, hospital, direccion, telefono, notas, estatus, cliente_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [nombre_medico, hospital, direccion || null, telefono || null, notas || null, est, req.user.id]
  );
  res.status(201).json(rows[0]);
}

// Actualiza campos generales del médico (admin y cliente).
async function actualizar(req, res) {
  const { id } = req.params;
  const { nombre_medico, hospital, direccion, telefono, notas, estatus } = req.body || {};
  if (estatus && !ESTATUS_VALIDOS.includes(estatus)) {
    return res.status(400).json({ error: 'estatus inválido' });
  }
  const { rows } = await db.query(
    `UPDATE medicos SET
       nombre_medico = COALESCE($1, nombre_medico),
       hospital      = COALESCE($2, hospital),
       direccion     = COALESCE($3, direccion),
       telefono      = COALESCE($4, telefono),
       notas         = COALESCE($5, notas),
       estatus       = COALESCE($6, estatus),
       updated_at    = now()
     WHERE id = $7 RETURNING *`,
    [nombre_medico, hospital, direccion, telefono, notas, estatus, id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Médico no encontrado' });
  res.json(rows[0]);
}

// Cambio rápido de estatus de la muestra (lo puede hacer cliente o admin).
async function cambiarEstatus(req, res) {
  const { id } = req.params;
  const { estatus } = req.body || {};
  if (!ESTATUS_VALIDOS.includes(estatus)) {
    return res.status(400).json({ error: 'estatus inválido' });
  }
  const { rows } = await db.query(
    'UPDATE medicos SET estatus = $1, updated_at = now() WHERE id = $2 RETURNING *',
    [estatus, id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Médico no encontrado' });
  res.json(rows[0]);
}

module.exports = { listar, crear, actualizar, cambiarEstatus };
