// backend/src/routes/profile.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const authController = require('../controllers/authController');

// Debug logs
console.log('📍 Profile routes loaded');
console.log('📍 authMiddleware:', typeof authMiddleware);
console.log('📍 authController.getProfile:', typeof authController.getProfile);

// Todas las rutas de perfil requieren autenticación
router.use(authMiddleware);

// Obtener perfil
router.get('/', authController.getProfile);
console.log('✅ Route registered: GET /');

// Actualizar perfil
router.put('/', authController.updateProfile);
console.log('✅ Route registered: PUT /');

// ✅ CAMBIAR CONTRASEÑA (RF-04.03)
router.post('/change-password', authController.changePassword);
console.log('✅ Route registered: POST /change-password');

// Eliminar cuenta
router.delete('/', authController.deleteAccount);
console.log('✅ Route registered: DELETE /');

module.exports = router;