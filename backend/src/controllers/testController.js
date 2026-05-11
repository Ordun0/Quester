// backend/src/controllers/testController.js

const gcpService = require('../services/gcpService');

/**
 * Controller para pruebas de consolidación de datos GCP
 * Sin IA, solo validación de flujo de datos
 */
exports.testConsolidateData = async (req, res) => {
  const { tripData, travelers, budget, preferences } = req.body;

  console.log('=== 🧪 TEST: Consolidate Data ===', {
    destination: tripData?.destination,
    startDate: tripData?.startDate,
    endDate: tripData?.endDate
  });

  try {
    // ✅ Validar datos requeridos
    if (!tripData?.destination || !tripData?.startDate || !tripData?.endDate) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'tripData.destination, startDate, and endDate are required'
      });
    }

    // ✅ Llamar función de prueba
    const result = await gcpService.testConsolidateData(
      tripData,
      travelers,
      budget,
      preferences
    );

    // ✅ Retornar respuesta de prueba
    res.status(200).json({
      success: true,
      message: 'Test consolidation completed',
      data: result.data
    });

  } catch (error) {
    console.error('❌ testConsolidateData error:', error);
    
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to consolidate test data',
      debug: process.env.NODE_ENV === 'development' ? { error: error.message } : undefined
    });
  }
};

/**
 * Endpoint simple para verificar conectividad con GCP
 */
exports.testGCPConnection = async (req, res) => {
  console.log('=== 🧪 TEST: GCP Connection ===');

  try {
    // ✅ Probar una función simple (weather es la más ligera)
    const weatherResult = await gcpService.getWeather('Tokyo, Japan', '2026-06-15', '2026-06-22');
    
    res.status(200).json({
      success: true,
      message: 'GCP connection test successful',
      data: {
        weather: weatherResult.success ? '✅ Connected' : '❌ Failed',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ testGCPConnection error:', error);
    
    res.status(500).json({
      success: false,
      error: 'CONNECTION_ERROR',
      message: 'Failed to connect to GCP services',
      debug: process.env.NODE_ENV === 'development' ? { error: error.message } : undefined
    });
  }
};