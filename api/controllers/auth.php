<?php
// Autenticación: login, logout, usuario actual.

function auth_login()
{
    $body = json_body();
    $email = isset($body['email']) ? strtolower(trim($body['email'])) : '';
    $password = $body['password'] ?? '';

    if ($email === '' || $password === '') {
        send_json(['error' => 'Email y password son requeridos'], 400);
    }

    $stmt = db()->prepare('SELECT * FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        send_json(['error' => 'Credenciales inválidas'], 401);
    }

    $cfg = config();
    $token = jwt_sign([
        'id'     => (int) $user['id'],
        'email'  => $user['email'],
        'role'   => $user['role'],
        'nombre' => $user['nombre'],
        'iat'    => time(),
        'exp'    => time() + $cfg['jwt_expires_days'] * 86400,
    ], $cfg['jwt_secret']);

    set_auth_cookie($token);

    send_json([
        'id'     => (int) $user['id'],
        'email'  => $user['email'],
        'role'   => $user['role'],
        'nombre' => $user['nombre'],
    ]);
}

function auth_logout()
{
    clear_auth_cookie();
    send_json(['ok' => true]);
}

function auth_me()
{
    $user = require_auth();
    send_json([
        'id'     => $user['id'],
        'email'  => $user['email'],
        'role'   => $user['role'],
        'nombre' => $user['nombre'],
    ]);
}
