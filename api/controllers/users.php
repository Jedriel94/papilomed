<?php
// Gestión de usuarios (solo admin).

const USER_ROLES = ['admin', 'cliente'];

function users_listar()
{
    require_role('admin');
    $stmt = db()->query('SELECT id, email, role, nombre, created_at FROM users ORDER BY role, nombre, email');
    send_json($stmt->fetchAll());
}

function users_crear()
{
    require_role('admin');
    $b = json_body();
    $email = strtolower(trim($b['email'] ?? ''));
    $password = $b['password'] ?? '';
    $role = $b['role'] ?? '';
    $nombre = trim($b['nombre'] ?? '');

    if ($email === '' || $password === '' || $role === '') {
        send_json(['error' => 'Correo, contraseña y rol son requeridos'], 400);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        send_json(['error' => 'Correo inválido'], 400);
    }
    if (strlen($password) < 6) {
        send_json(['error' => 'La contraseña debe tener al menos 6 caracteres'], 400);
    }
    if (!in_array($role, USER_ROLES, true)) {
        send_json(['error' => 'Rol inválido'], 400);
    }

    $chk = db()->prepare('SELECT id FROM users WHERE email = ?');
    $chk->execute([$email]);
    if ($chk->fetch()) {
        send_json(['error' => 'Ya existe un usuario con ese correo'], 409);
    }

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = db()->prepare('INSERT INTO users (email, password_hash, role, nombre) VALUES (?, ?, ?, ?)');
    $stmt->execute([$email, $hash, $role, $nombre !== '' ? $nombre : null]);

    $g = db()->prepare('SELECT id, email, role, nombre, created_at FROM users WHERE id = ?');
    $g->execute([db()->lastInsertId()]);
    send_json($g->fetch(), 201);
}

// Restablecer la contraseña de un usuario.
function users_password($id)
{
    require_role('admin');
    $b = json_body();
    $password = $b['password'] ?? '';
    if (strlen($password) < 6) {
        send_json(['error' => 'La contraseña debe tener al menos 6 caracteres'], 400);
    }
    $chk = db()->prepare('SELECT id FROM users WHERE id = ?');
    $chk->execute([$id]);
    if (!$chk->fetch()) {
        send_json(['error' => 'Usuario no encontrado'], 404);
    }
    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    $stmt->execute([$hash, $id]);
    send_json(['ok' => true]);
}

function users_eliminar($id)
{
    $me = require_role('admin');
    if ((int) $id === (int) $me['id']) {
        send_json(['error' => 'No puedes eliminar tu propio usuario'], 400);
    }
    $chk = db()->prepare('SELECT id, role FROM users WHERE id = ?');
    $chk->execute([$id]);
    $u = $chk->fetch();
    if (!$u) {
        send_json(['error' => 'Usuario no encontrado'], 404);
    }
    // No dejar el sistema sin administradores.
    if ($u['role'] === 'admin') {
        $count = (int) db()->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
        if ($count <= 1) {
            send_json(['error' => 'No puedes eliminar el último administrador'], 400);
        }
    }
    $stmt = db()->prepare('DELETE FROM users WHERE id = ?');
    $stmt->execute([$id]);
    send_json(['ok' => true]);
}
