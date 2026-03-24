const express = require('express');
const router = express.Router();

// Importar rutas (se agregarán después)
// const authRoutes = require('./auth');
// const tripRoutes = require('./trips');

// Rutas base
router.get('/', (req, res) => {
  res.json({ 
    message: 'Quester API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      trips: '/api/trips'
    }
  });
});

// Exportar rutas
module.exports = router;
