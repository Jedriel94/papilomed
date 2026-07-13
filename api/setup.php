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

    // 1b) Migraciones idempotentes (agregan columnas si faltan en bases previas).
    ensure_column($pdo, 'medicos',     'muestras',     'INT NULL AFTER telefono');
    ensure_column($pdo, 'solicitudes', 'paqueteria',   "VARCHAR(50) NULL AFTER estatus");
    ensure_column($pdo, 'solicitudes', 'guia_rastreo', "VARCHAR(100) NULL AFTER paqueteria");
    ensure_column($pdo, 'solicitudes', 'guia_archivo', "VARCHAR(255) NULL AFTER guia_rastreo");
    echo "Columnas verificadas.\n";

    // 1c) Carpeta protegida para archivos de guías.
    $uploads = __DIR__ . '/../uploads';
    if (!is_dir($uploads)) {
        @mkdir($uploads, 0755, true);
    }
    $ht = $uploads . '/.htaccess';
    if (is_dir($uploads) && !file_exists($ht)) {
        file_put_contents(
            $ht,
            "<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n" .
            "<IfModule !mod_authz_core.c>\n  Order deny,allow\n  Deny from all\n</IfModule>\n"
        );
    }
    echo "Carpeta de archivos lista.\n";

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

// Agrega una columna solo si aún no existe (compatible con MySQL y MariaDB).
function ensure_column($pdo, $table, $column, $definition)
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?'
    );
    $stmt->execute([$table, $column]);
    if ((int) $stmt->fetchColumn() === 0) {
        $pdo->exec("ALTER TABLE `$table` ADD COLUMN `$column` $definition");
    }
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
