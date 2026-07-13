<?php
// Solicitudes de recolección.

const SOLICITUD_ESTATUS = ['pendiente', 'asignada', 'en_proceso', 'completada', 'cancelada'];

function solicitud_por_id($id)
{
    $stmt = db()->prepare(
        'SELECT s.*, m.nombre_medico AS medico_nombre, c.nombre AS cliente_nombre, a.nombre AS asignado_nombre
         FROM solicitudes s
         LEFT JOIN medicos m ON m.id = s.medico_id
         LEFT JOIN users   c ON c.id = s.cliente_id
         LEFT JOIN users   a ON a.id = s.asignado_a
         WHERE s.id = ?'
    );
    $stmt->execute([$id]);
    return $stmt->fetch();
}

// Admin ve todas; cliente ve solo las suyas. Filtro opcional ?estatus=
function solicitudes_listar()
{
    $user = require_role('admin', 'cliente');
    $where = [];
    $params = [];

    if ($user['role'] === 'cliente') {
        $where[] = 's.cliente_id = ?';
        $params[] = $user['id'];
    }
    if (!empty($_GET['estatus']) && in_array($_GET['estatus'], SOLICITUD_ESTATUS, true)) {
        $where[] = 's.estatus = ?';
        $params[] = $_GET['estatus'];
    }

    $sql = 'SELECT s.*, m.nombre_medico AS medico_nombre, c.nombre AS cliente_nombre, a.nombre AS asignado_nombre
            FROM solicitudes s
            LEFT JOIN medicos m ON m.id = s.medico_id
            LEFT JOIN users   c ON c.id = s.cliente_id
            LEFT JOIN users   a ON a.id = s.asignado_a';
    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY s.created_at DESC, s.id DESC';

    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    send_json($stmt->fetchAll());
}

// Solo el cliente crea solicitudes.
function solicitudes_crear()
{
    $user = require_role('cliente');
    $b = json_body();
    $hospital = trim($b['hospital'] ?? '');
    $direccion = trim($b['direccion'] ?? '');
    if ($hospital === '' || $direccion === '') {
        send_json(['error' => 'hospital y direccion son requeridos'], 400);
    }

    $medico_id = !empty($b['medico_id']) ? (int) $b['medico_id'] : null;
    $fecha = !empty($b['fecha_solicitada']) ? $b['fecha_solicitada'] : null;

    $stmt = db()->prepare(
        'INSERT INTO solicitudes
           (cliente_id, medico_id, hospital, direccion, contacto, telefono_contacto, fecha_solicitada, notas)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $user['id'],
        $medico_id,
        $hospital,
        $direccion,
        $b['contacto'] ?? null,
        $b['telefono_contacto'] ?? null,
        $fecha,
        $b['notas'] ?? null,
    ]);
    send_json(solicitud_por_id(db()->lastInsertId()), 201);
}

// Solo admin: cambia el estatus.
function solicitudes_estatus($id)
{
    require_role('admin');
    $b = json_body();
    if (!in_array($b['estatus'] ?? '', SOLICITUD_ESTATUS, true)) {
        send_json(['error' => 'estatus inválido'], 400);
    }
    if (!solicitud_por_id($id)) {
        send_json(['error' => 'Solicitud no encontrada'], 404);
    }
    $stmt = db()->prepare('UPDATE solicitudes SET estatus = ? WHERE id = ?');
    $stmt->execute([$b['estatus'], $id]);
    send_json(solicitud_por_id($id));
}

// Solo admin: se asigna la solicitud (pasa a 'asignada' si estaba pendiente).
function solicitudes_asignarme($id)
{
    $user = require_role('admin');
    if (!solicitud_por_id($id)) {
        send_json(['error' => 'Solicitud no encontrada'], 404);
    }
    $stmt = db()->prepare(
        "UPDATE solicitudes
            SET asignado_a = ?,
                estatus = CASE WHEN estatus = 'pendiente' THEN 'asignada' ELSE estatus END
          WHERE id = ?"
    );
    $stmt->execute([$user['id'], $id]);
    send_json(solicitud_por_id($id));
}
