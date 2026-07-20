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

// Cualquier usuario (admin o cliente) cambia su PROPIO correo y/o contraseña.
// Requiere la contraseña actual para confirmar.
function auth_actualizar_perfil()
{
    $user = require_auth();
    $b = json_body();

    $stmt = db()->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([$user['id']]);
    $row = $stmt->fetch();
    if (!$row) {
        send_json(['error' => 'Usuario no encontrado'], 404);
    }

    // La contraseña actual es obligatoria para confirmar cualquier cambio.
    $actual = $b['password_actual'] ?? '';
    if ($actual === '' || !password_verify($actual, $row['password_hash'])) {
        send_json(['error' => 'Tu contraseña actual es incorrecta'], 400);
    }

    $nuevoEmail = isset($b['email']) ? strtolower(trim($b['email'])) : $row['email'];
    if ($nuevoEmail === '' || !filter_var($nuevoEmail, FILTER_VALIDATE_EMAIL)) {
        send_json(['error' => 'Correo inválido'], 400);
    }
    if ($nuevoEmail !== $row['email']) {
        $chk = db()->prepare('SELECT id FROM users WHERE email = ? AND id <> ?');
        $chk->execute([$nuevoEmail, $user['id']]);
        if ($chk->fetch()) {
            send_json(['error' => 'Ya existe un usuario con ese correo'], 409);
        }
    }

    $nuevaPass = $b['password'] ?? '';
    if ($nuevaPass !== '') {
        if (strlen($nuevaPass) < 6) {
            send_json(['error' => 'La nueva contraseña debe tener al menos 6 caracteres'], 400);
        }
        $hash = password_hash($nuevaPass, PASSWORD_BCRYPT);
        $up = db()->prepare('UPDATE users SET email = ?, password_hash = ? WHERE id = ?');
        $up->execute([$nuevoEmail, $hash, $user['id']]);
    } else {
        $up = db()->prepare('UPDATE users SET email = ? WHERE id = ?');
        $up->execute([$nuevoEmail, $user['id']]);
    }

    // Re-emitir el token con el correo actualizado para mantener la sesión al día.
    $cfg = config();
    $token = jwt_sign([
        'id'     => (int) $row['id'],
        'email'  => $nuevoEmail,
        'role'   => $row['role'],
        'nombre' => $row['nombre'],
        'iat'    => time(),
        'exp'    => time() + $cfg['jwt_expires_days'] * 86400,
    ], $cfg['jwt_secret']);
    set_auth_cookie($token);

    send_json([
        'id'     => (int) $row['id'],
        'email'  => $nuevoEmail,
        'role'   => $row['role'],
        'nombre' => $row['nombre'],
    ]);
}
