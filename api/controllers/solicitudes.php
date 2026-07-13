<?php
// Solicitudes de recolección.

const SOLICITUD_ESTATUS = ['pendiente', 'asignada', 'en_proceso', 'completada', 'cancelada'];
const PAQUETERIAS = ['DHL', 'FedEx', 'Estafeta', 'UPS', 'Redpack', 'Otro'];

// Extensiones permitidas para el archivo de la guía y su tipo MIME.
const GUIA_TIPOS = [
    'pdf'  => 'application/pdf',
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png'  => 'image/png',
];
const GUIA_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

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

// Solo admin: registra/actualiza el número de guía y la paquetería.
function solicitudes_guia($id)
{
    require_role('admin');
    if (!solicitud_por_id($id)) {
        send_json(['error' => 'Solicitud no encontrada'], 404);
    }
    $b = json_body();
    $paqueteria = trim($b['paqueteria'] ?? '');
    $guia = trim($b['guia_rastreo'] ?? '');

    if ($paqueteria !== '' && !in_array($paqueteria, PAQUETERIAS, true)) {
        send_json(['error' => 'Paquetería inválida'], 400);
    }

    $stmt = db()->prepare('UPDATE solicitudes SET paqueteria = ?, guia_rastreo = ? WHERE id = ?');
    $stmt->execute([$paqueteria !== '' ? $paqueteria : null, $guia !== '' ? $guia : null, $id]);
    send_json(solicitud_por_id($id));
}

// Solo admin: sube (o reemplaza) el archivo de la guía. Multipart, campo "archivo".
function solicitudes_guia_archivo_subir($id)
{
    require_role('admin');
    $sol = solicitud_por_id($id);
    if (!$sol) {
        send_json(['error' => 'Solicitud no encontrada'], 404);
    }
    if (empty($_FILES['archivo']) || $_FILES['archivo']['error'] !== UPLOAD_ERR_OK) {
        send_json(['error' => 'No se recibió el archivo'], 400);
    }
    $file = $_FILES['archivo'];
    if ($file['size'] > GUIA_MAX_BYTES) {
        send_json(['error' => 'El archivo supera el máximo de 5 MB'], 400);
    }
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!isset(GUIA_TIPOS[$ext])) {
        send_json(['error' => 'Formato no permitido (usa PDF, JPG o PNG)'], 400);
    }

    $dir = __DIR__ . '/../../uploads';
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    $nombre = 'guia_' . $id . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
    $destino = $dir . '/' . $nombre;

    if (!move_uploaded_file($file['tmp_name'], $destino)) {
        send_json(['error' => 'No se pudo guardar el archivo'], 500);
    }

    // Borra el archivo anterior si existía.
    if (!empty($sol['guia_archivo'])) {
        $viejo = $dir . '/' . basename($sol['guia_archivo']);
        if (is_file($viejo)) {
            @unlink($viejo);
        }
    }

    $stmt = db()->prepare('UPDATE solicitudes SET guia_archivo = ? WHERE id = ?');
    $stmt->execute([$nombre, $id]);
    send_json(solicitud_por_id($id));
}

// Descarga/visualiza el archivo de la guía. Admin, o el cliente dueño de la solicitud.
function solicitudes_guia_archivo_ver($id)
{
    $user = require_role('admin', 'cliente');
    $sol = solicitud_por_id($id);
    if (!$sol || empty($sol['guia_archivo'])) {
        send_json(['error' => 'Sin archivo de guía'], 404);
    }
    if ($user['role'] === 'cliente' && (int) $sol['cliente_id'] !== (int) $user['id']) {
        send_json(['error' => 'No autorizado'], 403);
    }

    $ruta = __DIR__ . '/../../uploads/' . basename($sol['guia_archivo']);
    if (!is_file($ruta)) {
        send_json(['error' => 'Archivo no encontrado'], 404);
    }
    $ext = strtolower(pathinfo($ruta, PATHINFO_EXTENSION));
    $mime = GUIA_TIPOS[$ext] ?? 'application/octet-stream';

    header('Content-Type: ' . $mime);
    header('Content-Disposition: inline; filename="guia-' . $id . '.' . $ext . '"');
    header('Content-Length: ' . filesize($ruta));
    readfile($ruta);
    exit;
}
