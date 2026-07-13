const express = require('express');
const { requireAuth } = require('../auth/middleware');
const h = require('../utils/asyncHandler');
const ctrl = require('../controllers/auth.controller');

const router = express.Router();

router.post('/login', h(ctrl.login));
router.post('/logout', h(ctrl.logout));
router.get('/me', requireAuth, h(ctrl.me));

module.exports = router;
