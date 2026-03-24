const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Ruta de registro
router.post('/register', authController.register);

// Ruta de login (la haremos en la Tarea 22)
router.post('/login', authController.login);

module.exports = router;