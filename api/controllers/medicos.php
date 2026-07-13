<?php
// Médicos / control de muestras. Lista compartida (admin y cliente).

const MEDICO_ESTATUS = ['pendiente', 'muestra_dejada'];

function medico_por_id($id)
{
    $stmt = db()->prepare('SELECT * FROM medicos WHERE id = ?');
    $stmt->execute([$id]);
    return $stmt->fetch();
}

function medicos_listar()
{
    require_role('admin', 'cliente');
    $estatus = $_GET['estatus'] ?? '';
    if ($estatus !== '' && in_array($estatus, MEDICO_ESTATUS, true)) {
        $stmt = db()->prepare('SELECT * FROM medicos WHERE estatus = ? ORDER BY hospital, nombre_medico');
        $stmt->execute([$estatus]);
    } else {
        $stmt = db()->query('SELECT * FROM medicos ORDER BY hospital, nombre_medico');
    }
    send_json($stmt->fetchAll());
}

function medicos_crear()
{
    $user = require_role('admin', 'cliente');
    $b = json_body();
    $nombre = trim($b['nombre_medico'] ?? '');
    $hospital = trim($b['hospital'] ?? '');
    if ($nombre === '' || $hospital === '') {
        send_json(['error' => 'nombre_medico y hospital son requeridos'], 400);
    }
    $estatus = in_array($b['estatus'] ?? '', MEDICO_ESTATUS, true) ? $b['estatus'] : 'pendiente';

    $stmt = db()->prepare(
        'INSERT INTO medicos (nombre_medico, hospital, direccion, telefono, notas, estatus, cliente_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $nombre,
        $hospital,
        $b['direccion'] ?? null,
        $b['telefono'] ?? null,
        $b['notas'] ?? null,
        $estatus,
        $user['id'],
    ]);
    send_json(medico_por_id(db()->lastInsertId()), 201);
}

function medicos_actualizar($id)
{
    require_role('admin', 'cliente');
    $actual = medico_por_id($id);
    if (!$actual) {
        send_json(['error' => 'Médico no encontrado'], 404);
    }
    $b = json_body();
    if (isset($b['estatus']) && !in_array($b['estatus'], MEDICO_ESTATUS, true)) {
        send_json(['error' => 'estatus inválido'], 400);
    }

    $nuevo = [
        'nombre_medico' => $b['nombre_medico'] ?? $actual['nombre_medico'],
        'hospital'      => $b['hospital']      ?? $actual['hospital'],
        'direccion'     => $b['direccion']     ?? $actual['direccion'],
        'telefono'      => $b['telefono']      ?? $actual['telefono'],
        'notas'         => $b['notas']         ?? $actual['notas'],
        'estatus'       => $b['estatus']       ?? $actual['estatus'],
    ];

    $stmt = db()->prepare(
        'UPDATE medicos SET nombre_medico = ?, hospital = ?, direccion = ?, telefono = ?, notas = ?, estatus = ?
         WHERE id = ?'
    );
    $stmt->execute([
        $nuevo['nombre_medico'], $nuevo['hospital'], $nuevo['direccion'],
        $nuevo['telefono'], $nuevo['notas'], $nuevo['estatus'], $id,
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
