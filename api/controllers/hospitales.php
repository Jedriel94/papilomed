<?php
// Hospitales (lugares con su dirección). Lista compartida admin/cliente.

function hospital_por_id($id)
{
    $stmt = db()->prepare('SELECT * FROM hospitales WHERE id = ?');
    $stmt->execute([$id]);
    return $stmt->fetch();
}

function hospitales_listar()
{
    require_role('admin', 'cliente');
    $stmt = db()->query('SELECT * FROM hospitales ORDER BY nombre');
    send_json($stmt->fetchAll());
}

function hospitales_crear()
{
    $user = require_role('admin', 'cliente');
    $b = json_body();
    $nombre = trim($b['nombre'] ?? '');
    $direccion = trim($b['direccion'] ?? '');
    if ($nombre === '' || $direccion === '') {
        send_json(['error' => 'Nombre y dirección del hospital son requeridos'], 400);
    }
    $stmt = db()->prepare('INSERT INTO hospitales (nombre, direccion, cliente_id) VALUES (?, ?, ?)');
    $stmt->execute([$nombre, $direccion, $user['id']]);
    send_json(hospital_por_id(db()->lastInsertId()), 201);
}

function hospitales_actualizar($id)
{
    require_role('admin', 'cliente');
    $actual = hospital_por_id($id);
    if (!$actual) {
        send_json(['error' => 'Hospital no encontrado'], 404);
    }
    $b = json_body();
    $nombre = trim($b['nombre'] ?? $actual['nombre']);
    $direccion = trim($b['direccion'] ?? $actual['direccion']);
    if ($nombre === '' || $direccion === '') {
        send_json(['error' => 'Nombre y dirección son requeridos'], 400);
    }
    $stmt = db()->prepare('UPDATE hospitales SET nombre = ?, direccion = ? WHERE id = ?');
    $stmt->execute([$nombre, $direccion, $id]);
    // Mantener el nombre denormalizado en médicos al día.
    $up = db()->prepare('UPDATE medicos SET hospital = ? WHERE hospital_id = ?');
    $up->execute([$nombre, $id]);
    send_json(hospital_por_id($id));
}
