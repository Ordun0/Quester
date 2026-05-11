// Agregar al archivo de rutas existente:

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); // Si usas auth

// Controllers
const itineraryController = require('../controllers/itineraryController');
const testController = require('../controllers/testController'); // ← Nuevo

// Rutas existentes
router.post('/itinerary', authMiddleware, itineraryController.generateItinerary);
router.get('/itinerary/:tripId', authMiddleware, itineraryController.getItinerary);
router.get('/itineraries', authMiddleware, itineraryController.listItineraries);
router.delete('/itinerary/:tripId', authMiddleware, itineraryController.deleteItinerary);

// ✅ NUEVAS RUTAS DE PRUEBA (sin auth para facilitar testing)
router.post('/test/consolidate', testController.testConsolidateData);
router.get('/test/gcp-connection', testController.testGCPConnection);

module.exports = router;