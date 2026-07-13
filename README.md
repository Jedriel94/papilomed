# Botikit · Sistema de Recolecciones (Papilomed)

Sistema web para **solicitar y controlar recolecciones** de muestras médicas.
Botikit (logística) recoge las muestras que Papilomed (laboratorio de VPH por PCR)
deja en hospitales.

- **Admin (Botikit):** ve todas las solicitudes, cambia su estatus, se las asigna y administra la lista de médicos/hospitales.
- **Cliente (Papilomed):** crea solicitudes, ve el estatus de las suyas, y ve/agrega médicos marcándolos como *pendiente* / *muestra dejada*.

Colores de marca: azul `#285098`, naranja `#D06828`.

## Stack

- **Backend:** Node.js + Express
- **DB:** PostgreSQL con `pg` (SQL directo, sin ORM)
- **Auth:** JWT en cookie `httpOnly` + `bcrypt`
- **Frontend:** HTML/CSS/JS vanilla servido por Express (sin build step)

## Estructura

```
db/schema.sql        Definición de tablas (se ejecuta al arrancar, idempotente)
db/seed.js           Crea usuario admin y cliente desde variables de entorno
src/server.js        Arranque de Express
src/db.js            Pool de PostgreSQL (usa DATABASE_URL)
src/auth/            JWT y middlewares (requireAuth, requireRole)
src/routes/          Rutas de la API
src/controllers/     Lógica de auth, médicos y solicitudes
public/              Frontend (login + dashboard)
```

### Modelo de datos

- **users** — `id, email, password_hash, role (admin|cliente), nombre`
- **medicos** — `id, nombre_medico, hospital, direccion, telefono, estatus (pendiente|muestra_dejada), notas, cliente_id`
- **solicitudes** — `id, cliente_id, medico_id?, hospital, direccion, contacto, telefono_contacto, fecha_solicitada, notas, estatus (pendiente|asignada|en_proceso|completada|cancelada), asignado_a`

## Correr en local

**Requisitos:** Node.js 18+ y un PostgreSQL accesible.

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Crear el archivo `.env` a partir del ejemplo y ajustar valores:
   ```bash
   cp .env.example .env
   # edita DATABASE_URL, JWT_SECRET y las credenciales de seed
   ```

   Genera un `JWT_SECRET` seguro con:
   ```bash
   openssl rand -hex 32
   ```

3. Crear los usuarios admin y cliente (también crea las tablas):
   ```bash
   npm run seed
   ```

4. Levantar el servidor:
   ```bash
   npm start        # o: npm run dev  (recarga automática)
   ```

5. Abrir <http://localhost:3000> e iniciar sesión con las credenciales del `.env`.

> El esquema se crea automáticamente al arrancar el servidor o correr el seed
> (usa `CREATE TABLE IF NOT EXISTS`), así que no hay migraciones manuales.

## Desplegar en Railway

1. Crea un proyecto en Railway y agrega el plugin **PostgreSQL**.
   Railway inyecta automáticamente la variable `DATABASE_URL`.

2. Conecta este repositorio (o haz deploy con `railway up`).

3. En **Variables** del servicio, define:

   | Variable | Valor |
   |---|---|
   | `JWT_SECRET` | cadena larga aleatoria (`openssl rand -hex 32`) |
   | `JWT_EXPIRES_IN` | `7d` |
   | `NODE_ENV` | `production` |
   | `SEED_ADMIN_EMAIL` | correo del admin |
   | `SEED_ADMIN_PASSWORD` | contraseña del admin |
   | `SEED_ADMIN_NOMBRE` | `Administrador Botikit` |
   | `SEED_CLIENTE_EMAIL` | correo de Papilomed |
   | `SEED_CLIENTE_PASSWORD` | contraseña de Papilomed |
   | `SEED_CLIENTE_NOMBRE` | `Papilomed` |
   | `PGSSL` | `false` (usando la `DATABASE_URL` interna de Railway) |

   > `DATABASE_URL` la provee el plugin de PostgreSQL; no la definas a mano.
   > `PORT` también la inyecta Railway.

4. El primer deploy crea las tablas al arrancar. Para crear los usuarios,
   ejecuta el seed una vez desde la pestaña de comandos o localmente apuntando
   a la base de Railway:
   ```bash
   railway run npm run seed
   ```

5. Abre la URL pública del servicio e inicia sesión.

## Reglas de negocio (referencia)

Se muestran como información en la pestaña **Tarifas y horarios**:

- **Tarifas (IVA incluido):** 1–5 recolecciones `$350 MXN` · 6–14 `$320 MXN` · 15+ cotización especial.
- **Horario:** lunes a viernes, 11:00 am – 4:00 pm.
- **Atención:** solicitudes antes de las 2:00 pm → mismo día hábil; después → siguiente día hábil.

## Endpoints principales

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | público | Inicia sesión (setea cookie) |
| POST | `/api/auth/logout` | auth | Cierra sesión |
| GET | `/api/auth/me` | auth | Datos del usuario en sesión |
| GET | `/api/solicitudes` | admin/cliente | Lista (cliente ve solo las suyas) |
| POST | `/api/solicitudes` | cliente | Crea solicitud |
| PATCH | `/api/solicitudes/:id/estatus` | admin | Cambia estatus |
| PATCH | `/api/solicitudes/:id/asignarme` | admin | Se asigna la solicitud |
| GET | `/api/medicos` | admin/cliente | Lista (filtro `?estatus=`) |
| POST | `/api/medicos` | admin/cliente | Agrega médico |
| PUT | `/api/medicos/:id` | admin/cliente | Actualiza médico |
| PATCH | `/api/medicos/:id/estatus` | admin/cliente | Cambia estatus de muestra |
