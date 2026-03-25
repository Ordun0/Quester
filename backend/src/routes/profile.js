// backend/src/routes/profile.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const profileController = require('../controllers/profileController');

// Todas las rutas de perfil requieren autenticación
router.use(authMiddleware);

// Obtener perfil del usuario autenticado
router.get('/', profileController.getProfile);

// Actualizar perfil del usuario
router.put('/', profileController.updateProfile);

// Eliminar cuenta del usuario
router.delete('/', profileController.deleteAccount);

module.exports = router;