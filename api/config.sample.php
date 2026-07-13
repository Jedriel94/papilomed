<?php
/**
 * Copia este archivo a "config.php" y ajusta los valores.
 * config.php NO se sube a git (está en .gitignore).
 *
 * En Hostinger: crea una base de datos MySQL desde hPanel y usa
 * los datos que te da (host suele ser "localhost").
 */
return [
    'db' => [
        'host'    => 'localhost',
        'name'    => 'papilomed',      // en Hostinger: algo como u123456_papilomed
        'user'    => 'root',           // en Hostinger: algo como u123456_botikit
        'pass'    => '',               // la contraseña de esa base
        'charset' => 'utf8mb4',
    ],

    // Cadena larga y aleatoria para firmar la sesión (JWT).
    // Genera una con: openssl rand -hex 32
    'jwt_secret'       => 'cambia-esto-por-una-cadena-larga-y-aleatoria',
    'jwt_expires_days' => 7,

    // true cuando el sitio use HTTPS (en Hostinger con SSL: true).
    'cookie_secure'    => false,

    // Llave temporal para poder correr api/setup.php (crea tablas + usuarios).
    // Tras usarla, déjala vacía ('') o borra el archivo setup.php.
    'setup_key'        => 'cambia-esta-llave-de-instalacion',

    // Usuarios que crea setup.php la primera vez.
    'seed' => [
        'admin_email'      => 'admin@botikit.com',
        'admin_password'   => 'admin123',
        'admin_nombre'     => 'Administrador Botikit',
        'cliente_email'    => 'cliente@papilomed.com',
        'cliente_password' => 'cliente123',
        'cliente_nombre'   => 'Papilomed',
    ],
];
