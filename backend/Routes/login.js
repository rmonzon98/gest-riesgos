const express = require('express');
const router = express.Router();
const controller = require('../Controller/login')

router.post('/', controller.login)

module.exports = router;