<?php
// Front controller de la API. El .htaccess reenvía todo /api/* aquí.

require __DIR__ . '/db.php';
require __DIR__ . '/jwt.php';
require __DIR__ . '/helpers.php';
require __DIR__ . '/controllers/auth.php';
require __DIR__ . '/controllers/users.php';
require __DIR__ . '/controllers/medicos.php';
require __DIR__ . '/controllers/solicitudes.php';

// Extrae la parte de la ruta después de "/api/".
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pos = strpos($uri, '/api/');
$route = $pos !== false ? substr($uri, $pos + 5) : '';
$parts = array_values(array_filter(explode('/', $route), fn($p) => $p !== ''));
$method = $_SERVER['REQUEST_METHOD'];

try {
    dispatch($parts, $method);
    send_json(['error' => 'No encontrado'], 404);
} catch (Throwable $e) {
    // No exponemos detalles internos al cliente.
    send_json(['error' => 'Error interno del servidor'], 500);
}

function dispatch($parts, $method)
{
    $r = $parts[0] ?? '';

    if ($r === 'health') {
        send_json(['ok' => true]);
    }

    if ($r === 'auth') {
        $a = $parts[1] ?? '';
        if ($a === 'login'  && $method === 'POST') auth_login();
        if ($a === 'logout' && $method === 'POST') auth_logout();
        if ($a === 'me'     && $method === 'GET')  auth_me();
        return;
    }

    if ($r === 'users') {
        if (!isset($parts[1])) {
            if ($method === 'GET')  users_listar();
            if ($method === 'POST') users_crear();
            return;
        }
        $id = (int) $parts[1];
        $sub = $parts[2] ?? '';
        if ($sub === 'password' && $method === 'PATCH')  users_password($id);
        if ($sub === ''         && $method === 'DELETE') users_eliminar($id);
        return;
    }

    if ($r === 'medicos') {
        if (!isset($parts[1])) {
            if ($method === 'GET')  medicos_listar();
            if ($method === 'POST') medicos_crear();
            return;
        }
        $id = (int) $parts[1];
        $sub = $parts[2] ?? '';
        if ($sub === ''        && $method === 'PUT')   medicos_actualizar($id);
        if ($sub === 'estatus' && $method === 'PATCH') medicos_estatus($id);
        return;
    }

    if ($r === 'solicitudes') {
        if (!isset($parts[1])) {
            if ($method === 'GET')  solicitudes_listar();
            if ($method === 'POST') solicitudes_crear();
            return;
        }
        $id = (int) $parts[1];
        $sub = $parts[2] ?? '';
        if ($sub === 'estatus'      && $method === 'PATCH') solicitudes_estatus($id);
        if ($sub === 'asignarme'    && $method === 'PATCH') solicitudes_asignarme($id);
        if ($sub === 'guia'         && $method === 'PATCH') solicitudes_guia($id);
        if ($sub === 'guia-archivo' && $method === 'POST')  solicitudes_guia_archivo_subir($id);
        if ($sub === 'guia-archivo' && $method === 'GET')   solicitudes_guia_archivo_ver($id);
        return;
    }
}
