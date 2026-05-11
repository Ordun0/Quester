// backend/src/controllers/extractionController.js

const gcpService = require('../services/gcpService');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { GetCommand } = require('@aws-sdk/lib-dynamodb');

const docClient = new DynamoDBClient({ region: process.env.AWS_REGION });

/**
 * Controller para extracción de datos y generación de itinerarios con IA
 */

/**
 * POST /api/extraction
 * Extrae datos de SerpAPI + genera itinerario con Gemini
 */
exports.extractAndGenerate = async (req, res) => {
  const userId = req.user?.userId || req.user?.id;  // ✅ Soportar ambas estructuras
  const { tripData, travelers, budget, preferences, sessionId } = req.body;

  console.log('🚀 [Extraction] Starting extraction + Gemini generation', {
    userId,
    sessionId,
    destination: tripData?.destination,
    origin: tripData?.origin,  // ✅ Loguear origin recibido
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

    // ✅ RECUPERAR origin desde sesión si no viene en tripData
    // (El frontend a veces no envía origin, pero está guardado en DynamoDB desde Step 1)
    var origin = tripData?.origin;
    
    if (!origin && sessionId && userId) {
      try {
        console.log('🔄 [Extraction] Origin missing, attempting to recover from session...', { sessionId, userId });
        
        const sessionResult = await docClient.send(new GetCommand({
          TableName: process.env.DYNAMODB_TABLE_SESSIONS || 'quester-sessions',
          Key: {
            userId: userId,
            sessionId: sessionId
          }
        }));
        
        if (sessionResult.Item?.origin) {
          origin = sessionResult.Item.origin;
          console.log('✅ [Extraction] Recovered origin from session:', origin);
        } else {
          console.warn('⚠️ [Extraction] Session found but no origin field');
        }
      } catch (sessionError) {
        console.warn('⚠️ [Extraction] Could not recover origin from session:', sessionError.message);
      }
    }
    
    // ✅ Fallback seguro si aún no tenemos origin
    if (!origin) {
      console.warn('⚠️ [Extraction] Using fallback origin: New York, USA');
      origin = 'New York, USA';
    }
    
    // ✅ Asegurar que tripData tenga origin definido
    const tripDataWithOrigin = { ...tripData, origin };

    // ✅ DEBUG: Log final antes de llamar a gcpService
    console.log('📤 [Extraction] Calling GCP extraction with:', {
      origin: tripDataWithOrigin.origin,
      destination: tripDataWithOrigin.destination,
      startDate: tripDataWithOrigin.startDate,
      endDate: tripDataWithOrigin.endDate
    });

    // ✅ Paso 1: Extraer y consolidar datos de SerpAPI
    console.log('📤 [Extraction] Calling GCP extraction functions...');
    
    const extractionResult = await gcpService.extractAndConsolidate(
      tripDataWithOrigin,  // ✅ Pasar con origin garantizado
      travelers,
      budget,
      preferences
    );

    // ✅ VALIDACIÓN CRÍTICA: Verificar que extractionResult es válido antes de usar .data
    if (!extractionResult || !extractionResult.success || !extractionResult.data) {
      console.error('❌ [Extraction] Invalid extraction result:', {
        hasResult: !!extractionResult,
        success: extractionResult?.success,
        hasData: !!extractionResult?.data,
        error: extractionResult?.error
      });
      
      return res.status(500).json({
        success: false,
        error: 'EXTRACTION_FAILED',
        message: 'Failed to extract travel data',
        debug: extractionResult?.error
      });
    }

    console.log('✅ [Extraction] Data extraction completed', {
      origin: extractionResult.data.tripData?.origin,  // ✅ Loguear origin en resultado
      destination: extractionResult.data.tripData?.destination,
      flights: extractionResult.data.flights?.outboundFlights?.length || 0,
      hotels: extractionResult.data.hotels?.optimalHotels?.length || 0,
      restaurants: extractionResult.data.restaurants?.length || 0,
      attractions: extractionResult.data.attractions?.length || 0
    });

    // ✅ Paso 2: Generar itinerario con Gemini
    console.log('🤖 [Extraction] Calling Gemini itinerary function...');
    
    // ✅ VALIDACIÓN: Usar safe access para todos los campos al construir payload
    const itineraryPayload = {
      tripData: extractionResult.data?.tripData || {},
      travelers: extractionResult.data?.travelers || [],
      budget: extractionResult.data?.budget || {},
      preferences: extractionResult.data?.preferences || {},
      flights: extractionResult.data?.flights || null,
      hotels: extractionResult.data?.hotels || null,
      restaurants: extractionResult.data?.restaurants || [],
      attractions: extractionResult.data?.attractions || [],
      weather: extractionResult.data?.weather || null,
      transport: extractionResult.data?.transport || null
    };

    const itineraryResult = await gcpService.generateItineraryWithGemini(itineraryPayload);

    // ✅ LOG: Verificar qué recibe el controller de gcpService
    console.log('📥 [Extraction] Recibiendo resultado de gcpService:', {
      success: itineraryResult?.success,
      itineraryId: itineraryResult?.itineraryId,
      hasSummaryDirect: !!itineraryResult?.summary,
      hasDailyPlanDirect: Array.isArray(itineraryResult?.dailyPlan),
      hasData: !!itineraryResult?.data,
      dataKeys: itineraryResult?.data ? Object.keys(itineraryResult.data) : [],
      hasSummary: !!itineraryResult?.data?.summary,
      hasDailyPlan: Array.isArray(itineraryResult?.data?.dailyPlan),
      dailyPlanLength: itineraryResult?.data?.dailyPlan?.length
    });

    if (!itineraryResult || !itineraryResult.success) {
      return res.status(500).json({
        success: false,
        error: 'GEMINI_GENERATION_FAILED',
        message: 'Failed to generate itinerary with AI',
        debug: itineraryResult?.error
      });
    }

    // ✅ Construir respuesta para frontend usando el formato disponible
    // Soporta tanto campos directos como data anidado para compatibilidad
    var itineraryForFrontend = {
      id: itineraryResult.itineraryId,
      // ✅ Usar campos directos si existen, sino fallback a data.anidado
      summary: itineraryResult.summary || itineraryResult.data?.summary,
      dailyPlan: itineraryResult.dailyPlan || itineraryResult.data?.dailyPlan,
      budgetBreakdown: itineraryResult.budgetBreakdown || itineraryResult.data?.budgetBreakdown,
      recommendations: itineraryResult.recommendations || itineraryResult.data?.recommendations,
      
      // ✅ AGREGAR: Detalles completos de vuelos seleccionados
      selectedFlights: {
        outbound: extractionResult.data.flights?.outboundFlights?.[0] || null,
        return: extractionResult.data.flights?.returnFlights?.[0] || null
      },
      
      // ✅ AGREGAR: Detalles completos del hotel seleccionado
      selectedHotel: extractionResult.data.hotels?.optimalHotels?.[0] || null,
      
      // ✅ AGREGAR: Información del clima
      weather: extractionResult.data.weather || null,
      
      // ✅ AGREGAR: Información de transporte
      transport: extractionResult.data.transport || null
    };

    // ✅ Validar que tenemos datos válidos
    if (!itineraryForFrontend.dailyPlan || !Array.isArray(itineraryForFrontend.dailyPlan)) {
      console.error('❌ [Extraction] Invalid itinerary data received:', {
        hasDailyPlanDirect: Array.isArray(itineraryResult?.dailyPlan),
        hasDailyPlanData: Array.isArray(itineraryResult?.data?.dailyPlan),
        dailyPlanDirectLength: itineraryResult?.dailyPlan?.length,
        dailyPlanDataLength: itineraryResult?.data?.dailyPlan?.length
      });
      return res.status(500).json({
        success: false,
        error: 'INVALID_ITINERARY',
        message: 'Received invalid itinerary data from Gemini'
      });
    }

    console.log('✅ [Extraction] Itinerary generated successfully', {
      origin: itineraryForFrontend.summary?.origin || extractionResult.data.tripData?.origin,
      destination: itineraryForFrontend.summary?.destination,
      days: itineraryForFrontend.dailyPlan?.length,
      activities: itineraryForFrontend.dailyPlan?.reduce(function(sum, day) { 
        return sum + (day?.activities?.length || 0); 
      }, 0),
      hasSelectedFlights: !!itineraryForFrontend.selectedFlights?.outbound,
      hasSelectedHotel: !!itineraryForFrontend.selectedHotel
    });

    // ✅ Retornar respuesta completa al frontend
    res.status(200).json({
      success: true,
      message: 'Itinerary generated successfully',
      data: {
        extraction: {
          summary: extractionResult.data.summary,
          duration: extractionResult.duration
        },
        itinerary: itineraryForFrontend
      }
    });

  } catch (error) {
    console.error('❌ [Extraction] Error:', {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to generate itinerary',
      debug: process.env.NODE_ENV === 'development' ? { error: error.message } : undefined
    });
  }
};

/**
 * POST /api/extraction/data-only
 * Solo extrae datos de SerpAPI (sin Gemini) - útil para debugging
 */
exports.extractDataOnly = async (req, res) => {
  const { tripData, travelers, budget, preferences, sessionId } = req.body;
  const userId = req.user?.userId || req.user?.id;

  console.log('🧪 [Extraction] Data-only extraction requested', {
    destination: tripData?.destination,
    origin: tripData?.origin
  });

  try {
    // ✅ Recuperar origin desde sesión si no viene en tripData
    var origin = tripData?.origin;
    if (!origin && sessionId && userId) {
      try {
        const sessionResult = await docClient.send(new GetCommand({
          TableName: process.env.DYNAMODB_TABLE_SESSIONS || 'quester-sessions',
          Key: { userId, sessionId }
        }));
        if (sessionResult.Item?.origin) {
          origin = sessionResult.Item.origin;
        }
      } catch (e) {
        console.warn('⚠️ Could not recover origin from session:', e.message);
      }
    }
    
    const tripDataWithOrigin = { ...tripData, origin: origin || 'New York, USA' };

    const result = await gcpService.extractAndConsolidate(
      tripDataWithOrigin,
      travelers,
      budget,
      preferences
    );

    res.status(200).json({
      success: result.success,
      message: result.success ? 'Data extracted successfully' : 'Extraction completed with warnings',
      data: result.data,
      duration: result.duration
    });

  } catch (error) {
    console.error('❌ [Extraction] Data-only error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to extract data',
      debug: process.env.NODE_ENV === 'development' ? { error: error.message } : undefined
    });
  }
};