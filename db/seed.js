require('dotenv').config();

const bcrypt = require('bcryptjs');
const db = require('../src/db');

async function upsertUser({ email, password, role, nombre }) {
  if (!email || !password) {
    console.warn(`Saltando usuario ${role}: faltan credenciales en el .env`);
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  await db.query(
    `INSERT INTO users (email, password_hash, role, nombre)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           role          = EXCLUDED.role,
           nombre        = EXCLUDED.nombre`,
    [email.trim().toLowerCase(), hash, role, nombre || null]
  );
  console.log(`Usuario ${role} listo: ${email}`);
}

async function main() {
  await db.initSchema();

  await upsertUser({
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
    role: 'admin',
    nombre: process.env.SEED_ADMIN_NOMBRE || 'Administrador Botikit',
  });

  await upsertUser({
    email: process.env.SEED_CLIENTE_EMAIL,
    password: process.env.SEED_CLIENTE_PASSWORD,
    role: 'cliente',
    nombre: process.env.SEED_CLIENTE_NOMBRE || 'Papilomed',
  });

  console.log('Seed completado.');
  await db.pool.end();
}

main().catch((err) => {
  console.error('Error en el seed:', err);
  process.exit(1);
});
