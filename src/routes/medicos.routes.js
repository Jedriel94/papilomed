const express = require('express');
const { requireAuth, requireRole } = require('../auth/middleware');
const h = require('../utils/asyncHandler');
const ctrl = require('../controllers/medicos.controller');

const router = express.Router();

// Lista compartida: admin y cliente ven/agregan/actualizan.
router.get('/', requireAuth, requireRole('admin', 'cliente'), h(ctrl.listar));
router.post('/', requireAuth, requireRole('admin', 'cliente'), h(ctrl.crear));
router.put('/:id', requireAuth, requireRole('admin', 'cliente'), h(ctrl.actualizar));
router.patch('/:id/estatus', requireAuth, requireRole('admin', 'cliente'), h(ctrl.cambiarEstatus));

module.exports = router;
