<?php
// Utilidades compartidas: respuestas JSON, lectura de body y autenticación.

function json_body()
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function send_json($data, $code = 200)
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function set_auth_cookie($token)
{
    $cfg = config();
    setcookie('token', $token, [
        'expires'  => time() + $cfg['jwt_expires_days'] * 86400,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure'   => (bool) $cfg['cookie_secure'],
    ]);
}

function clear_auth_cookie()
{
    $cfg = config();
    setcookie('token', '', [
        'expires'  => time() - 3600,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure'   => (bool) $cfg['cookie_secure'],
    ]);
}

// Devuelve el payload del usuario en sesión, o null.
function current_user()
{
    static $user = false;
    if ($user !== false) {
        return $user;
    }
    $user = null;
    if (!empty($_COOKIE['token'])) {
        $payload = jwt_verify($_COOKIE['token'], config()['jwt_secret']);
        if ($payload) {
            $user = $payload;
        }
    }
    return $user;
}

function require_auth()
{
    $user = current_user();
    if (!$user) {
        send_json(['error' => 'No autenticado'], 401);
    }
    return $user;
}

function require_role(...$roles)
{
    $user = require_auth();
    if (!in_array($user['role'], $roles, true)) {
        send_json(['error' => 'No autorizado'], 403);
    }
    return $user;
}
