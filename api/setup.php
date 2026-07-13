<?php
/**
 * Instalador de una sola vez.
 * Crea las tablas y los usuarios admin/cliente definidos en config.php.
 *
 * Uso: abre en el navegador
 *   https://www.botikit.com/muestras/api/setup.php?key=TU_SETUP_KEY
 *
 * IMPORTANTE: al terminar, vacía 'setup_key' en config.php o borra este archivo.
 */

require __DIR__ . '/db.php';

header('Content-Type: text/plain; charset=utf-8');

$cfg = config();
$key = $_GET['key'] ?? '';

if (empty($cfg['setup_key']) || !hash_equals((string) $cfg['setup_key'], (string) $key)) {
    http_response_code(403);
    echo "Instalador deshabilitado o llave incorrecta.\n";
    echo "Define 'setup_key' en config.php y llama a setup.php?key=ESA_LLAVE";
    exit;
}

try {
    $pdo = db();

    // 1) Crear tablas (ejecuta cada sentencia del schema).
    $schema = file_get_contents(__DIR__ . '/../sql/schema.sql');
    foreach (array_filter(array_map('trim', explode(';', $schema))) as $stmt) {
        if ($stmt !== '') {
            $pdo->exec($stmt);
        }
    }
    echo "Tablas verificadas/creadas.\n";

    // 2) Crear/actualizar usuarios semilla.
    $seed = $cfg['seed'];
    upsert_user($pdo, $seed['admin_email'],   $seed['admin_password'],   'admin',   $seed['admin_nombre']);
    upsert_user($pdo, $seed['cliente_email'], $seed['cliente_password'], 'cliente', $seed['cliente_nombre']);
    echo "Usuario admin listo:   {$seed['admin_email']}\n";
    echo "Usuario cliente listo: {$seed['cliente_email']}\n";

    echo "\nInstalación completada.\n";
    echo "AHORA: vacía 'setup_key' en config.php (déjalo como '') o borra api/setup.php.\n";
} catch (Throwable $e) {
    http_response_code(500);
    echo "Error durante la instalación:\n" . $e->getMessage();
}

function upsert_user($pdo, $email, $password, $role, $nombre)
{
    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare(
        'INSERT INTO users (email, password_hash, role, nombre)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash),
                                 role = VALUES(role),
                                 nombre = VALUES(nombre)'
    );
    $stmt->execute([strtolower(trim($email)), $hash, $role, $nombre]);
}
