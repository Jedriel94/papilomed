const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken } = require('../auth/jwt');

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
};

async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son requeridos' });
  }

  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [
    email.trim().toLowerCase(),
  ]);
  const user = rows[0];
  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = signToken({
    id: user.id,
    email: user.email,
    role: user.role,
    nombre: user.nombre,
  });

  res.cookie('token', token, COOKIE_OPTS);
  res.json({ id: user.id, email: user.email, role: user.role, nombre: user.nombre });
}

function logout(req, res) {
  res.clearCookie('token', { ...COOKIE_OPTS, maxAge: undefined });
  res.json({ ok: true });
}

function me(req, res) {
  res.json(req.user);
}

module.exports = { login, logout, me };
