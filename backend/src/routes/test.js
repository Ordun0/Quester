// backend/src/routes/test.js

const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');

/**
 * Rutas de prueba para debugging y validación
 * Sin autenticación para facilitar testing local
 */

// ✅ Prueba de consolidación de datos GCP (sin IA)
router.post('/consolidate', testController.testConsolidateData);

// ✅ Prueba simple de conexión a GCP
router.get('/gcp-connection', testController.testGCPConnection);

module.exports = router;