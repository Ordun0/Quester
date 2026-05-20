// backend/src/routes/extraction.js

const express = require('express');
const router = express.Router();
const extractionController = require('../controllers/extractionController');

/**
 * Rutas para extracción y generación de itinerarios
 * Requiere autenticación (middleware auth)
 */

// ✅ Endpoint principal: Extraer datos + generar itinerario con Gemini
router.post('/', extractionController.extractAndGenerate);

// ✅ Endpoint solo para extracción (sin Gemini) - útil para debugging
router.post('/data-only', extractionController.extractDataOnly);

router.post('/regenerate', extractionController.regenerateWithFeedback);
console.log('✅ Route registered: POST /regenerate');

module.exports = router;