const express = require('express');
const { requireAuth, requireRole } = require('../auth/middleware');
const h = require('../utils/asyncHandler');
const ctrl = require('../controllers/solicitudes.controller');

const router = express.Router();

// Cliente y admin listan (el controller filtra por rol).
router.get('/', requireAuth, requireRole('admin', 'cliente'), h(ctrl.listar));

// Solo el cliente crea solicitudes.
router.post('/', requireAuth, requireRole('cliente'), h(ctrl.crear));

// Solo admin cambia estatus / se asigna.
router.patch('/:id/estatus', requireAuth, requireRole('admin'), h(ctrl.cambiarEstatus));
router.patch('/:id/asignarme', requireAuth, requireRole('admin'), h(ctrl.asignarme));

module.exports = router;
