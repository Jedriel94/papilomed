require('dotenv').config();

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const db = require('./db');
const authRoutes = require('./routes/auth.routes');
const medicosRoutes = require('./routes/medicos.routes');
const solicitudesRoutes = require('./routes/solicitudes.routes');

const app = express();

app.use(express.json());
app.use(cookieParser());

// --- API ---
app.use('/api/auth', authRoutes);
app.use('/api/medicos', medicosRoutes);
app.use('/api/solicitudes', solicitudesRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// --- Frontend estático ---
app.use(express.static(path.join(__dirname, '..', 'public')));

// Manejo de errores async no capturados en controllers.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;

db.initSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`Servidor escuchando en http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('No se pudo inicializar la base de datos:', err);
    process.exit(1);
  });
