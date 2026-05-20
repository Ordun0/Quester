// backend/src/routes/itinerary.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const itineraryController = require('../controllers/itineraryController');

console.log('📍 Itinerary routes loaded');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// ✅ TAREA 95: Generar itinerario completo
router.post('/generate', itineraryController.generateItinerary);
console.log('✅ Route registered: POST /generate');

router.post('/regenerate', itineraryController.regenerateItinerary);
console.log('✅ Route registered: POST /regenerate');

module.exports = router;