const express = require('express');
const router = express.Router();

const controller = require('../Controller/login');
const { verifyJWT } = require('../services/verifyJWTUpd');
const { verifyCSRF } = require('../utils/csrf');

router.post('/', controller.login);
router.post('/verificar-2fa', controller.verificar2FA);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);

router.get('/me', verifyJWT, controller.me);

router.post('/2fa/totp/setup', verifyJWT, verifyCSRF, controller.setupTOTP);
router.post('/2fa/totp/confirmar', verifyJWT, verifyCSRF, controller.confirmarTOTP);
router.post('/2fa/totp/desactivar', verifyJWT, verifyCSRF, controller.desactivarTOTP);

module.exports = router;