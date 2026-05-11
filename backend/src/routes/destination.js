// backend/src/routes/destination.js

const express = require('express');
const router = express.Router();
const destinationController = require('../controllers/destinationController');

console.log('📍 Destination routes loaded');

// ✅ Buscar destinos (Google Maps)
router.get('/search', destinationController.searchDestinations);
console.log('✅ Route registered: GET /search');

// ✅ NUEVO: Buscar vuelos (Google Flights)
router.get('/flights', destinationController.searchFlights);
console.log('✅ Route registered: GET /flights');

// ✅ Obtener detalles de destino
router.get('/:placeId', destinationController.getDestinationDetails);
console.log('✅ Route registered: GET /:placeId');

module.exports = router;