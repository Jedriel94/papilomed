<?php
/**
 * Router SOLO para pruebas locales con el servidor embebido de PHP:
 *   php -S localhost:8080 router.php
 *
 * En Hostinger NO se usa este archivo: ahí Apache/LiteSpeed usa el .htaccess.
 */
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Peticiones a la API → front controller.
if (strpos($uri, '/api/') !== false) {
    // Si es un archivo real dentro de /api (p. ej. setup.php), déjalo pasar.
    $file = __DIR__ . $uri;
    if (is_file($file)) {
        return false;
    }
    require __DIR__ . '/api/index.php';
    return true;
}

// Archivos estáticos existentes (css, js, html) → servir directo.
$file = __DIR__ . $uri;
if ($uri !== '/' && is_file($file)) {
    return false;
}

// Raíz → login.
require __DIR__ . '/index.html';
return true;
