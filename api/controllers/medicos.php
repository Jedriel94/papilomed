<?php
// Médicos / control de muestras. Lista compartida (admin y cliente).
// Cada médico pertenece a un hospital (hospital_id) y tiene una ubicación interna
// (torre/piso/consultorio). La dirección de calle vive en el hospital.

const MEDICO_ESTATUS = ['pendiente', 'muestra_dejada'];

function normaliza_muestras($valor)
{
    if ($valor === null || $valor === '') {
        return null;
    }
    $n = (int) $valor;
    return $n < 0 ? 0 : $n;
}

// Devuelve el médico con el nombre y dirección ACTUALES de su hospital.
function medico_por_id($id)
{
    $stmt = db()->prepare(
        'SELECT m.id, m.nombre_medico, m.hospital_id, m.ubicacion, m.telefono, m.muestras,
                m.estatus, m.notas, m.cliente_id, m.created_at, m.updated_at,
                h.nombre AS hospital, h.direccion AS direccion
         FROM medicos m
         LEFT JOIN hospitales h ON h.id = m.hospital_id
         WHERE m.id = ?'
    );
    $stmt->execute([$id]);
    return $stmt->fetch();
}

// Resuelve el hospital a partir del body: id existente o alta de uno nuevo.
// Devuelve [hospital_id, hospital_nombre] o manda error 400.
function resolver_hospital($b, $user)
{
    if (!empty($b['hospital_id'])) {
        $h = hospital_por_id((int) $b['hospital_id']);
        if (!$h) {
            send_json(['error' => 'El hospital elegido no existe'], 400);
        }
        return [(int) $h['id'], $h['nombre']];
    }
    // Hospital nuevo
    $nombre = trim($b['hospital_nombre'] ?? '');
    $direccion = trim($b['hospital_direccion'] ?? '');
    if ($nombre === '' || $direccion === '') {
        send_json(['error' => 'Elige un hospital o escribe el nombre y la dirección del nuevo'], 400);
    }
    $stmt = db()->prepare('INSERT INTO hospitales (nombre, direccion, cliente_id) VALUES (?, ?, ?)');
    $stmt->execute([$nombre, $direccion, $user['id']]);
    return [(int) db()->lastInsertId(), $nombre];
}

function medicos_listar()
{
    require_role('admin', 'cliente');
    $estatus = $_GET['estatus'] ?? '';
    $sql = 'SELECT m.id, m.nombre_medico, m.hospital_id, m.ubicacion, m.telefono, m.muestras,
                   m.estatus, m.notas, m.cliente_id,
                   h.nombre AS hospital, h.direccion AS direccion
            FROM medicos m
            LEFT JOIN hospitales h ON h.id = m.hospital_id';
    $params = [];
    if ($estatus !== '' && in_array($estatus, MEDICO_ESTATUS, true)) {
        $sql .= ' WHERE m.estatus = ?';
        $params[] = $estatus;
    }
    $sql .= ' ORDER BY h.nombre, m.nombre_medico';
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    send_json($stmt->fetchAll());
}

function medicos_crear()
{
    $user = require_role('admin', 'cliente');
    $b = json_body();
    $nombre = trim($b['nombre_medico'] ?? '');
    if ($nombre === '') {
        send_json(['error' => 'El nombre del médico es requerido'], 400);
    }
    [$hospital_id, $hospital_nombre] = resolver_hospital($b, $user);

    $estatus = in_array($b['estatus'] ?? '', MEDICO_ESTATUS, true) ? $b['estatus'] : 'pendiente';
    $muestras = normaliza_muestras($b['muestras'] ?? null);
    $ubicacion = trim($b['ubicacion'] ?? '');

    $stmt = db()->prepare(
        'INSERT INTO medicos (nombre_medico, hospital, hospital_id, ubicacion, telefono, muestras, notas, estatus, cliente_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $nombre,
        $hospital_nombre,
        $hospital_id,
        $ubicacion !== '' ? $ubicacion : null,
        $b['telefono'] ?? null,
        $muestras,
        $b['notas'] ?? null,
        $estatus,
        $user['id'],
    ]);
    send_json(medico_por_id(db()->lastInsertId()), 201);
}

function medicos_actualizar($id)
{
    $user = require_role('admin', 'cliente');
    $actual = medico_por_id($id);
    if (!$actual) {
        send_json(['error' => 'Médico no encontrado'], 404);
    }
    $b = json_body();
    if (isset($b['estatus']) && !in_array($b['estatus'], MEDICO_ESTATUS, true)) {
        send_json(['error' => 'estatus inválido'], 400);
    }

    // Hospital: solo se cambia si mandan hospital_id o datos de hospital nuevo.
    $hospital_id = (int) $actual['hospital_id'];
    $hospital_nombre = $actual['hospital'];
    if (!empty($b['hospital_id']) || !empty($b['hospital_nombre'])) {
        [$hospital_id, $hospital_nombre] = resolver_hospital($b, $user);
    }

    $nuevo = [
        'nombre_medico' => $b['nombre_medico'] ?? $actual['nombre_medico'],
        'ubicacion'     => array_key_exists('ubicacion', $b) ? (trim($b['ubicacion']) ?: null) : $actual['ubicacion'],
        'telefono'      => $b['telefono'] ?? $actual['telefono'],
        'muestras'      => array_key_exists('muestras', $b) ? normaliza_muestras($b['muestras']) : $actual['muestras'],
        'notas'         => $b['notas'] ?? $actual['notas'],
        'estatus'       => $b['estatus'] ?? $actual['estatus'],
    ];

    $stmt = db()->prepare(
        'UPDATE medicos SET nombre_medico = ?, hospital = ?, hospital_id = ?, ubicacion = ?,
                            telefono = ?, muestras = ?, notas = ?, estatus = ?
         WHERE id = ?'
    );
    $stmt->execute([
        $nuevo['nombre_medico'], $hospital_nombre, $hospital_id, $nuevo['ubicacion'],
        $nuevo['telefono'], $nuevo['muestras'], $nuevo['notas'], $nuevo['estatus'], $id,
    ]);
    send_json(medico_por_id($id));
}

// Cambio rápido de estatus de la muestra (cliente o admin).
function medicos_estatus($id)
{
    require_role('admin', 'cliente');
    $b = json_body();
    if (!in_array($b['estatus'] ?? '', MEDICO_ESTATUS, true)) {
        send_json(['error' => 'estatus inválido'], 400);
    }
    if (!medico_por_id($id)) {
        send_json(['error' => 'Médico no encontrado'], 404);
    }
    $stmt = db()->prepare('UPDATE medicos SET estatus = ? WHERE id = ?');
    $stmt->execute([$b['estatus'], $id]);
    send_json(medico_por_id($id));
}
