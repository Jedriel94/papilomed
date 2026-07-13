# Botikit · Sistema de Recolecciones (Papilomed)

Sistema web para **solicitar y controlar recolecciones** de muestras médicas.
Botikit (logística) recoge las muestras que Papilomed (laboratorio de VPH por PCR)
deja en hospitales.

- **Admin (Botikit):** ve todas las solicitudes, cambia su estatus, se las asigna y administra la lista de médicos/hospitales.
- **Cliente (Papilomed):** crea solicitudes, ve el estatus de las suyas, y ve/agrega médicos marcándolos como *pendiente* / *muestra dejada*.

Colores de marca: azul `#285098`, naranja `#D06828`.

## Stack

- **Backend:** PHP (sin dependencias / sin Composer) con PDO
- **DB:** MySQL / MariaDB
- **Auth:** JWT en cookie `httpOnly` + `password_hash` (bcrypt)
- **Frontend:** HTML/CSS/JS vanilla

Pensado para **hosting compartido tipo Hostinger** (PHP + MySQL), y para vivir en
una subcarpeta como `https://www.botikit.com/muestras`.

## Estructura

```
index.html              Login
dashboard.html          Panel (se adapta según rol)
css/styles.css          Estilos (marca Botikit)
js/                     api.js, auth.js, solicitudes.js, medicos.js
sql/schema.sql          Tablas MySQL
api/
  .htaccess             Reenvía /api/* al front controller
  index.php             Router de la API
  config.sample.php     Plantilla de configuración (copiar a config.php)
  db.php                Conexión PDO + config
  jwt.php               Firma/verificación de JWT
  helpers.php           Respuestas JSON y autenticación
  setup.php             Instalador de una sola vez (crea tablas + usuarios)
  controllers/          auth.php, medicos.php, solicitudes.php
router.php              Solo para pruebas locales con `php -S`
```

### Modelo de datos

- **users** — `id, email, password_hash, role (admin|cliente), nombre`
- **medicos** — `id, nombre_medico, hospital, direccion, telefono, estatus (pendiente|muestra_dejada), notas, cliente_id`
- **solicitudes** — `id, cliente_id, medico_id?, hospital, direccion, contacto, telefono_contacto, fecha_solicitada, notas, estatus (pendiente|asignada|en_proceso|completada|cancelada), asignado_a`

## Desplegar en Hostinger (subcarpeta /muestras)

1. **Crear la base de datos MySQL** en hPanel → *Bases de datos MySQL*.
   Anota: nombre de la base, usuario, contraseña y host (suele ser `localhost`).

2. **Configurar credenciales:** copia `api/config.sample.php` a `api/config.php`
   y llena los datos de la base, un `jwt_secret` largo, `cookie_secure => true`
   (si tu sitio usa HTTPS) y una `setup_key` temporal. Ajusta las contraseñas
   de los usuarios semilla (admin y cliente).

3. **Subir los archivos** a `public_html/muestras/` (por *Administrador de archivos*
   de hPanel o por FTP). Debe quedar así: `public_html/muestras/index.html`,
   `public_html/muestras/api/...`, etc.

4. **Instalar (crear tablas + usuarios):** abre en el navegador
   `https://www.botikit.com/muestras/api/setup.php?key=TU_SETUP_KEY`.
   Debe responder "Instalación completada".

5. **Cerrar el instalador:** edita `api/config.php` y deja `setup_key => ''`
   (o borra `api/setup.php`).

6. Entra a `https://www.botikit.com/muestras/` con el usuario admin o cliente.

> El sistema calcula solo la ruta base, así que funciona igual en `/muestras`,
> en otra subcarpeta o en la raíz del dominio.

## Probar en local (opcional, requiere PHP y MySQL/MariaDB)

```bash
# 1) Crear la base y el usuario en tu MySQL local
#    (ej.: CREATE DATABASE papilomed;)
# 2) Copiar y ajustar la config
cp api/config.sample.php api/config.php   # edita host/usuario/clave

# 3) Levantar el servidor de pruebas de PHP
php -S localhost:8080 router.php

# 4) Instalar (crea tablas + usuarios)
#    Abre: http://localhost:8080/api/setup.php?key=TU_SETUP_KEY

# 5) Entrar: http://localhost:8080/
```

## Reglas de negocio (referencia)

Se muestran en la pestaña **Tarifas y horarios** (solo informativo):

- **Tarifas (IVA incluido):** 1–5 recolecciones `$350 MXN` · 6–14 `$320 MXN` · 15+ cotización especial.
- **Horario:** lunes a viernes, 11:00 am – 4:00 pm.
- **Atención:** solicitudes antes de las 2:00 pm → mismo día hábil; después → siguiente día hábil.

## Endpoints de la API

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `api/auth/login` | público | Inicia sesión (cookie httpOnly) |
| POST | `api/auth/logout` | auth | Cierra sesión |
| GET | `api/auth/me` | auth | Usuario en sesión |
| GET | `api/solicitudes` | admin/cliente | Lista (cliente ve solo las suyas) |
| POST | `api/solicitudes` | cliente | Crea solicitud |
| PATCH | `api/solicitudes/:id/estatus` | admin | Cambia estatus |
| PATCH | `api/solicitudes/:id/asignarme` | admin | Se asigna la solicitud |
| GET | `api/medicos` | admin/cliente | Lista (filtro `?estatus=`) |
| POST | `api/medicos` | admin/cliente | Agrega médico |
| PUT | `api/medicos/:id` | admin/cliente | Actualiza médico |
| PATCH | `api/medicos/:id/estatus` | admin/cliente | Cambia estatus de muestra |
