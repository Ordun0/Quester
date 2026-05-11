// backend/src/routes/trip.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const tripController = require('../controllers/tripController');

// Debug logs
console.log('📍 Trip routes loaded');

// Todas las rutas de trip requieren autenticación
router.use(authMiddleware);

// ✅ Tarea 55: Endpoint Paso 1 - Destino y Fechas
router.post('/step1', tripController.saveStep1);
console.log('✅ Route registered: POST /step1');

// ✅ Tarea 69: Endpoint Paso 2 - Viajeros, Intereses, Presupuesto (placeholder)
router.post('/step2', tripController.saveStep2);
console.log('✅ Route registered: POST /step2');

// ✅ Tarea 80: Endpoint Paso 3 - Preferencias (placeholder)
router.post('/step3', tripController.saveStep3);
console.log('✅ Route registered: POST /step3');

module.exports = router;