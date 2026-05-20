const { v4: uuidv4 } = require('uuid');
const gcpService = require('../services/gcpService');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { PutCommand, GetCommand, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const docClient = new DynamoDBClient({ region: process.env.AWS_REGION });

// ✅ Función helper para calcular costo total REAL incluyendo vuelos y hoteles
const calculateEstimatedTotal = (itineraryData, selectedFlights, selectedHotel) => {
  const breakdown = itineraryData?.budgetBreakdown || {};
  let total = 0;
  
  // ✅ VUELOS: Sumar ida y vuelta desde selectedFlights (estructura { outbound, return })
  if (selectedFlights?.outbound?.price?.amount) {
    total += selectedFlights.outbound.price.amount;
  }
  if (selectedFlights?.return?.price?.amount) {
    total += selectedFlights.return.price.amount;
  }
  
  // ✅ HOTEL: Usar totalPrice desde selectedHotel
  if (selectedHotel?.totalPrice?.amount) {
    total += selectedHotel.totalPrice.amount;
  }
  
  // ✅ CATEGORÍAS DEL BREAKDOWN: food, activities, transport (de Gemini)
  total += breakdown.food || 0;
  total += breakdown.activities || 0;
  total += breakdown.transport || 0;
  
  return total;
};

/**
 * TAREA 102-104: Generar itinerario completo con IA
 */
exports.generateItinerary = async (req, res) => {
  const requestId = `req_${uuidv4()}`;
  const userId = req.user?.userId || 'anonymous';
  const { tripData, travelers, budget, preferences } = req.body;

  console.log('=== 🚀 Generate Itinerary Request ===', {
    requestId,
    userId,
    timestamp: new Date().toISOString(),
    tripData: {
      origin: tripData?.origin,
      destination: tripData?.destination,
      startDate: tripData?.startDate,
      endDate: tripData?.endDate,
      duration: tripData?.duration
    },
    travelersCount: travelers?.length,
    budget: budget?.total,
    preferences: {
      hotelClass: preferences?.hotelClass,
      flightClass: preferences?.flightClass
    }
  });

  try {
    // ✅ VALIDACIÓN DE DATOS REQUERIDOS
    if (!tripData?.destination || !tripData?.startDate || !tripData?.endDate) {
      console.warn('⚠️ Validation failed: Missing required fields', { requestId });
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'tripData.destination, startDate, and endDate are required',
        requestId
      });
    }

    // ✅ VALIDAR FECHAS LÓGICAS
    const startDate = new Date(tripData.startDate);
    const endDate = new Date(tripData.endDate);
    const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    if (endDate < startDate) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'endDate must be after startDate',
        requestId
      });
    }

    if (duration > 30) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Maximum trip duration is 30 days',
        requestId
      });
    }

    // ✅ VALIDAR PRESUPUESTO MÍNIMO
    if (budget?.total && budget.total < 100) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Minimum budget is $100',
        requestId
      });
    }

    console.log('✅ Validation passed, calling GCP services...', { requestId });

    // ✅ LLAMAR A GCP PARA GENERAR ITINERARIO COMPLETO
    const startTime = Date.now();
    
    const result = await gcpService.generateFullItinerary(
      { ...tripData, duration },
      travelers,
      budget,
      preferences
    );

    const durationMs = Date.now() - startTime;
    console.log('✅ GCP services completed', {
      requestId,
      duration: `${durationMs}ms`,
      success: result.success,
      itineraryId: result.itineraryId
    });

    // ✅ MANEJAR ERROR DE GCP
    if (!result.success) {
      console.error('❌ GCP service failed', { requestId, error: result.error });
      return res.status(500).json({
        success: false,
        error: 'GCP_ERROR',
        message: result.message || 'Failed to generate itinerary from GCP services',
        requestId,
        debug: process.env.NODE_ENV === 'development' ? { details: result } : undefined
      });
    }

    const itineraryData = result.data;

    // ✅ Calcular estimatedTotal REAL incluyendo vuelos y hoteles
    const userBudget = budget?.total || 0;
    const estimatedTotal = calculateEstimatedTotal(
      itineraryData, 
      itineraryData.flights, 
      itineraryData.selectedHotel
    );
    const currency = budget?.currency || 'USD';

    // ✅ Validar si excede presupuesto (RF-04.04 + RF-04.05 + RF-08.02)
    if (userBudget > 0 && estimatedTotal > userBudget) {
      console.warn('⚠️ [BudgetValidation] Itinerary exceeds user budget', {
        requestId,
        userBudget,
        estimatedTotal,
        difference: estimatedTotal - userBudget,
        currency
      });
      
      return res.status(400).json({
        success: false,
        error: 'BUDGET_EXCEEDED',
        message: 'Sorry, I cannot create an itinerary with this budget. Please increase it.',
        requestId,
        data: {
          userBudget,
          estimatedTotal,
          currency,
          difference: estimatedTotal - userBudget,
          breakdown: {
            flights: (itineraryData.flights?.optimalFlight?.price?.amount || 0) + 
                     (itineraryData.flights?.returnFlight?.price?.amount || 0),
            hotels: itineraryData.selectedHotel?.totalPrice?.amount || 0,
            food: itineraryData.budgetBreakdown?.food || 0,
            activities: itineraryData.budgetBreakdown?.activities || 0,
            transport: itineraryData.budgetBreakdown?.transport || 0
          }
        }
      });
    }

    console.log('✅ [BudgetValidation] Itinerary is within budget, proceeding to save');

    // ✅ PREPARAR DATOS PARA DYNAMODB
    const timestamp = Date.now();
    const tripId = result.itineraryId || `trip_${uuidv4()}`;
    const ttl = Math.floor((timestamp + 30 * 24 * 60 * 60 * 1000) / 1000); // 30 días TTL

    // ✅ Calcular spent SIN contingency (solo las 5 categorías principales)
    const budgetBreakdown = itineraryData.budgetBreakdown || {};
    const spentWithoutContingency = 
      (budgetBreakdown.flights || 0) +
      (budgetBreakdown.hotels || 0) +
      (budgetBreakdown.food || 0) +
      (budgetBreakdown.activities || 0) +
      (budgetBreakdown.transport || 0);

    const dbItem = {
      tripId,
      userId,
      timestamp,
      ttl,
      status: 'completed',
      spent: spentWithoutContingency,
      
      // Datos originales del request
      tripData: {
        origin: tripData.origin,
        destination: tripData.destination,
        startDate: tripData.startDate,
        endDate: tripData.endDate,
        duration
      },
      travelers: travelers || [],
      budget: budget || {},
      preferences: preferences || {},
      
      // Itinerario generado por Gemini
      itinerary: {
        summary: itineraryData.summary,
        dailyPlan: itineraryData.dailyPlan,
        budgetBreakdown: itineraryData.budgetBreakdown,
        packingList: itineraryData.packingList,
        travelTips: itineraryData.travelTips,
        emergencyContacts: itineraryData.emergencyContacts
      },
      
      // Datos enriquecidos para frontend
      enrichedData: {
        selectedHotel: itineraryData.selectedHotel,
        selectedRestaurants: itineraryData.selectedRestaurants,
        selectedAttractions: itineraryData.selectedAttractions,
        weather: itineraryData.weather,
        transport: itineraryData.transport,
        flights: itineraryData.flights
      },
      
      // Metadatos
      metadata: {
        generatedAt: new Date().toISOString(),
        generationDuration: result.totalDuration,
        enrichmentSummary: result.enrichmentSummary,
        model: 'gemini-2.5-flash',
        version: '1.0.0'
      }
    };

    // ✅ GUARDAR EN DYNAMODB
    console.log('💾 Saving to DynamoDB...', { requestId, tripId, spent: spentWithoutContingency });
    
    await docClient.send(new PutCommand({
      TableName: process.env.DYNAMODB_TABLE_TRIPS,
      Item: dbItem
    }));

    console.log('✅ [Audit] Itinerary saved to DynamoDB', { 
      requestId, 
      tripId, 
      userId,
      duration: `${Date.now() - startTime}ms`
    });

    // ✅ PREPARAR RESPUESTA PARA FRONTEND
    const responseData = {
      tripId,
      generatedAt: new Date().toISOString(),
      summary: itineraryData.summary,
      dailyPlan: itineraryData.dailyPlan,
      budgetBreakdown: itineraryData.budgetBreakdown,
      packingList: itineraryData.packingList,
      travelTips: itineraryData.travelTips,
      emergencyContacts: itineraryData.emergencyContacts,
      places: {
        hotel: itineraryData.selectedHotel,
        restaurants: itineraryData.selectedRestaurants?.slice(0, 10) || [],
        attractions: itineraryData.selectedAttractions?.slice(0, 15) || []
      },
      coordinates: {
        hotel: itineraryData.selectedHotel?.gps || null,
        restaurants: itineraryData.selectedRestaurants?.map(r => ({
          name: r.name,
          gps: r.gps
        })) || [],
        attractions: itineraryData.selectedAttractions?.map(a => ({
          name: a.name,
          gps: a.gps
        })) || []
      },
      travel: {
        flight: itineraryData.flights?.optimalFlight,
        transport: itineraryData.transport
      },
      weather: itineraryData.weather
    };

    // ✅ RETORNAR RESPUESTA EXITOSA
    res.status(200).json({
      success: true,
      message: 'Itinerary generated successfully',
      requestId,
      data: responseData
    });

  } catch (error) {
    console.error('❌ generateItinerary error:', {
      requestId,
      error: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    if (error.message?.includes('UNAUTHORIZED')) {
      return res.status(401).json({
        success: false,
        error: 'GCP_AUTH_ERROR',
        message: 'Failed to authenticate with GCP services',
        requestId
      });
    }

    if (error.message?.includes('TIMEOUT') || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return res.status(504).json({
        success: false,
        error: 'TIMEOUT',
        message: 'Request to GCP services timed out. Please try again.',
        requestId,
        retryAfter: 30
      });
    }

    if (error.message?.includes('RATE_LIMIT')) {
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'GCP API rate limit exceeded. Please try again in a few minutes.',
        requestId,
        retryAfter: 60
      });
    }

    if (error.message?.includes('VALIDATION_ERROR') || error.message?.includes('schema')) {
      return res.status(400).json({
        success: false,
        error: 'GCP_VALIDATION_ERROR',
        message: 'Invalid data format from GCP services',
        requestId,
        debug: process.env.NODE_ENV === 'development' ? { error: error.message } : undefined
      });
    }

    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to generate itinerary. Please try again later.',
      requestId,
      debug: process.env.NODE_ENV === 'development' ? { 
        error: error.message,
        code: error.code 
      } : undefined
    });
  }
};

/**
 * TAREA 103: Obtener itinerario existente por tripId
 */
exports.getItinerary = async (req, res) => {
  const { tripId } = req.params;
  const userId = req.user?.userId || 'anonymous';

  console.log('=== 📥 Get Itinerary Request ===', { tripId, userId });

  try {
    if (!tripId || !tripId.startsWith('trip_')) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid tripId format'
      });
    }

    const result = await docClient.send(new GetCommand({
      TableName: process.env.DYNAMODB_TABLE_TRIPS,
      Key: { tripId }
    }));

    if (!result.Item) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Itinerary not found'
      });
    }

    if (result.Item.userId !== userId && userId !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to view this itinerary'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        tripId: result.Item.tripId,
        summary: result.Item.itinerary?.summary,
        dailyPlan: result.Item.itinerary?.dailyPlan,
        budgetBreakdown: result.Item.itinerary?.budgetBreakdown,
        packingList: result.Item.itinerary?.packingList,
        travelTips: result.Item.itinerary?.travelTips,
        places: {
          hotel: result.Item.enrichedData?.selectedHotel,
          restaurants: result.Item.enrichedData?.selectedRestaurants,
          attractions: result.Item.enrichedData?.selectedAttractions
        }
      }
    });

  } catch (error) {
    console.error('❌ getItinerary error:', error.message);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve itinerary'
    });
  }
};

/**
 * TAREA 104: Listar itinerarios del usuario
 */
exports.listItineraries = async (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const { limit = 10, lastKey } = req.query;

  console.log('=== 📋 List Itineraries Request ===', { userId, limit });

  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_TRIPS,
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      Limit: parseInt(limit),
      ScanIndexForward: false
    };

    if (lastKey) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(lastKey, 'base64').toString());
    }

    const result = await docClient.send(new QueryCommand(params));

    const itineraries = result.Items?.map(item => ({
      tripId: item.tripId,
      destination: item.tripData?.destination,
      startDate: item.tripData?.startDate,
      endDate: item.tripData?.endDate,
      duration: item.tripData?.duration,
      summary: item.itinerary?.summary?.title,
      status: item.status,
      createdAt: new Date(item.timestamp).toISOString()
    })) || [];

    let nextToken = null;
    if (result.LastEvaluatedKey) {
      nextToken = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
    }

    res.status(200).json({
      success: true,
      data: {
        itineraries,
        pagination: {
          count: itineraries.length,
          nextToken,
          hasMore: !!result.LastEvaluatedKey
        }
      }
    });

  } catch (error) {
    console.error('❌ listItineraries error:', error.message);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to list itineraries'
    });
  }
};

/**
 * TAREA 104: Eliminar itinerario (soft delete)
 */
exports.deleteItinerary = async (req, res) => {
  const { tripId } = req.params;
  const userId = req.user?.userId || 'anonymous';

  console.log('=== 🗑️ Delete Itinerary Request ===', { tripId, userId });

  try {
    if (!tripId || !tripId.startsWith('trip_')) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid tripId format'
      });
    }

    const getResult = await docClient.send(new GetCommand({
      TableName: process.env.DYNAMODB_TABLE_TRIPS,
      Key: { tripId }
    }));

    if (!getResult.Item) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Itinerary not found'
      });
    }

    if (getResult.Item.userId !== userId && userId !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to delete this itinerary'
      });
    }

    await docClient.send(new UpdateCommand({
      TableName: process.env.DYNAMODB_TABLE_TRIPS,
      Key: { tripId },
      UpdateExpression: 'SET #status = :status, deletedAt = :deletedAt',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': 'deleted',
        ':deletedAt': Date.now()
      }
    }));

    console.log('✅ Itinerary soft-deleted', { tripId, userId });

    res.status(200).json({
      success: true,
      message: 'Itinerary deleted successfully',
      data: { tripId }
    });

  } catch (error) {
    console.error('❌ deleteItinerary error:', error.message);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to delete itinerary'
    });
  }
};

/**
 * ✅ REGENERAR ITINERARIO CON COMENTARIOS DEL USUARIO (RF-05.08)
 * POST /api/itinerary/regenerate
 * Body: { tripId, originalRequest?, userComments }
 * 
 * ✅ Simplificado: Permite tripId=null si originalRequest está presente
 */
exports.regenerateItinerary = async (req, res) => {
  const requestId = `req_${uuidv4()}`;
  const userId = req.user?.userId || 'anonymous';
  const { tripId, originalRequest, userComments } = req.body;

  console.log('=== 🔄 Regenerate Itinerary Request ===', {
    requestId,
    userId,
    tripId,
    hasOriginalRequest: !!originalRequest,
    userComments: userComments?.substring(0, 100) + (userComments?.length > 100 ? '...' : '')
  });

  try {
    // ✅ VALIDAR ENTRADA
    if (!userComments || userComments.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'User comments are required for regeneration',
        requestId
      });
    }

    // ✅ VALIDAR: Se requiere tripId O originalRequest (no ambos)
    if (!tripId && !originalRequest) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Either tripId or originalRequest is required',
        requestId
      });
    }

    let tripData, travelers, budget, preferences;
    let originalTrip = null;
    let regenerationCount = 0;

    // ✅ CASO 1: Usar originalRequest si está disponible (itinerario no guardado aún)
    if (originalRequest) {
      console.log('🔄 [Regenerate] Using originalRequest from frontend');
      tripData = originalRequest.tripData || {};
      travelers = originalRequest.travelers || [];
      budget = originalRequest.budget || {};
      preferences = originalRequest.preferences || {};
      
      // ✅ Cuando usamos originalRequest, no hay historial en DB → permitir regeneración
      // El límite de 2 regeneraciones aplica solo a itinerarios guardados
      regenerationCount = 0;
    }
    // ✅ CASO 2: Fallback - buscar en DynamoDB si hay tripId pero no originalRequest
    else if (tripId) {
      console.log('🔄 [Regenerate] Fallback: fetching from DynamoDB');
      const { GetCommand } = require('@aws-sdk/lib-dynamodb');
      
      const getResult = await docClient.send(new GetCommand({
        TableName: process.env.DYNAMODB_TABLE_TRIPS,
        Key: { tripId }
      }));

      if (!getResult.Item) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Itinerary not found',
          requestId
        });
      }

      if (getResult.Item.userId !== userId && userId !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'You do not have permission to regenerate this itinerary',
          requestId
        });
      }

      // ✅ EXTRAER DATOS ORIGINALES del viaje guardado
      originalTrip = getResult.Item;
      tripData = originalTrip.tripData || {};
      travelers = originalTrip.travelers || [];
      budget = originalTrip.budget || {};
      preferences = originalTrip.preferences || {};
      
      // ✅ Obtener contador de regeneraciones desde metadata (solo si está guardado)
      const metadata = originalTrip.metadata || {};
      regenerationCount = metadata.regenerationCount || 0;
      
      // ✅ RF-05.08.01-03: Validar límite de regeneraciones (solo para itinerarios guardados)
      if (regenerationCount >= 2) {
        console.warn('⚠️ [Regenerate] Regeneration limit reached', {
          requestId,
          tripId,
          regenerationCount
        });
        
        return res.status(400).json({
          success: false,
          error: 'REGENERATION_LIMIT',
          message: 'Regeneration limit reached',
          requestId
        });
      }
    }

    // ✅ VALIDAR DATOS REQUERIDOS
    if (!tripData?.destination || !tripData?.startDate || !tripData?.endDate) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_DATA',
        message: 'Missing required trip data for regeneration',
        requestId
      });
    }

    // ✅ RECICLAR customNotes para agregar comentarios de regeneración con formato de auditoría
    const regenerationNotes = userComments.trim();
    const originalCustomNotes = preferences?.customNotes || '';
    
    // ✅ Agregar comentarios con formato: [REGENERATION N - timestamp]: comentarios
    preferences.customNotes = `${originalCustomNotes}
[REGENERATION ${regenerationCount + 1} - ${new Date().toISOString()}]: ${regenerationNotes}`.trim();
    
    console.log('🔄 [Regenerate] Updated customNotes with regeneration comment', {
      regenerationCount: regenerationCount + 1,
      customNotes: preferences.customNotes.substring(0, 200) + '...'
    });

    // ✅ LLAMAR A GCP PARA REGENERAR CON PROMPT ESPECIAL + customNotes actualizado
    const startTime = Date.now();
    
    const result = await gcpService.regenerateItineraryWithFeedback(
      tripData,
      travelers,
      budget,
      preferences,
      regenerationNotes,
      tripId  // ← Puede ser null si no está guardado
    );

    const durationMs = Date.now() - startTime;
    console.log('✅ [Regenerate] GCP regeneration completed', {
      requestId,
      duration: `${durationMs}ms`,
      success: result.success
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'REGENERATION_ERROR',
        message: result.message || 'Failed to regenerate itinerary',
        requestId
      });
    }

    const itineraryData = result.data;

    // ✅ VALIDAR estructura mínima del itinerario regenerado
    if (!itineraryData?.summary || !Array.isArray(itineraryData?.dailyPlan)) {
      console.error('❌ [Regenerate] Invalid itinerary structure:', {
        hasSummary: !!itineraryData?.summary,
        hasDailyPlan: Array.isArray(itineraryData?.dailyPlan),
        keys: itineraryData ? Object.keys(itineraryData) : []
      });
      return res.status(500).json({
        success: false,
        error: 'INVALID_ITINERARY_STRUCTURE',
        message: 'Regenerated itinerary has invalid structure',
        requestId
      });
    }

    // ✅ VALIDACIÓN DE PRESUPUESTO para itinerario regenerado
    const userBudget = budget?.total || 0;
    const estimatedTotal = calculateEstimatedTotal(
      itineraryData, 
      itineraryData.flights, 
      itineraryData.selectedHotel
    );
    const currency = budget?.currency || 'USD';

    if (userBudget > 0 && estimatedTotal > userBudget) {
      console.warn('⚠️ [BudgetValidation - Regenerate] Itinerary exceeds user budget', {
        requestId,
        userBudget,
        estimatedTotal,
        difference: estimatedTotal - userBudget
      });
      
      return res.status(400).json({
        success: false,
        error: 'BUDGET_EXCEEDED',
        message: 'Sorry, I cannot create an itinerary with this budget. Please increase it.',
        requestId,
        data: {
          userBudget,
          estimatedTotal,
          currency,
          difference: estimatedTotal - userBudget
        }
      });
    }

    // ✅ Guardar itinerario regenerado en DynamoDB con NUEVO tripId
    const newTripId = `trip_${uuidv4()}`;
    const timestamp = Date.now();
    const ttl = Math.floor((timestamp + 30 * 24 * 60 * 60 * 1000) / 1000);

    const budgetBreakdown = itineraryData.budgetBreakdown || {};
    const spentWithoutContingency = 
      (budgetBreakdown.flights || 0) +
      (budgetBreakdown.hotels || 0) +
      (budgetBreakdown.food || 0) +
      (budgetBreakdown.activities || 0) +
      (budgetBreakdown.transport || 0);

    const dbItem = {
      tripId: newTripId,
      userId,
      timestamp,
      ttl,
      status: 'completed',
      spent: spentWithoutContingency,
      
      // Datos originales del request
      tripData,
      travelers,
      budget,
      preferences,  // ✅ Incluye customNotes actualizado
      
      // Itinerario regenerado por Gemini
      itinerary: {
        summary: itineraryData.summary,
        dailyPlan: itineraryData.dailyPlan,
        budgetBreakdown: itineraryData.budgetBreakdown,
        packingList: itineraryData.packingList,
        travelTips: itineraryData.travelTips,
        emergencyContacts: itineraryData.emergencyContacts
      },
      
      // Datos enriquecidos para frontend
      enrichedData: {
        selectedHotel: itineraryData.selectedHotel,
        selectedRestaurants: itineraryData.selectedRestaurants,
        selectedAttractions: itineraryData.selectedAttractions,
        weather: itineraryData.weather,
        transport: itineraryData.transport,
        flights: itineraryData.flights
      },
      
      // Metadatos para regeneración
      metadata: {
        generatedAt: new Date().toISOString(),
        regeneratedFrom: tripId,  // ← Referencia al itinerario original (puede ser null)
        regenerationCount: regenerationCount + 1,  // ✅ Incrementar contador
        regenerationComments: regenerationNotes,
        generationDuration: `${durationMs}ms`,
        model: 'gemini-2.5-flash',
        version: '1.0.0'
      }
    };

    console.log('💾 [Regenerate] Saving regenerated itinerary to DynamoDB...', { 
      requestId, 
      newTripId, 
      userId,
      regenerationCount: regenerationCount + 1
    });
    
    await docClient.send(new PutCommand({
      TableName: process.env.DYNAMODB_TABLE_TRIPS,
      Item: dbItem
    }));

    console.log('✅ [Regenerate] Regenerated itinerary saved to DynamoDB', { 
      requestId, 
      newTripId,
      regeneratedFrom: tripId,
      regenerationCount: regenerationCount + 1
    });

    // ✅ PREPARAR RESPUESTA PARA FRONTEND
    const responseData = {
      tripId: newTripId,
      regeneratedFrom: tripId,
      generatedAt: new Date().toISOString(),
      summary: itineraryData.summary,
      dailyPlan: itineraryData.dailyPlan,
      budgetBreakdown: itineraryData.budgetBreakdown,
      packingList: itineraryData.packingList,
      travelTips: itineraryData.travelTips,
      emergencyContacts: itineraryData.emergencyContacts,
      places: {
        hotel: itineraryData.selectedHotel,
        restaurants: itineraryData.selectedRestaurants?.slice(0, 10) || [],
        attractions: itineraryData.selectedAttractions?.slice(0, 15) || []
      },
      coordinates: {
        hotel: itineraryData.selectedHotel?.gps || null,
        restaurants: itineraryData.selectedRestaurants?.map(r => ({ name: r.name, gps: r.gps })) || [],
        attractions: itineraryData.selectedAttractions?.map(a => ({ name: a.name, gps: a.gps })) || []
      },
      travel: {
        flight: itineraryData.flights?.optimalFlight,
        transport: itineraryData.transport
      },
      weather: itineraryData.weather,
      recommendations: itineraryData.recommendations
    };
	
	console.log('🔍 [Regenerate] Response data structure:', {
      tripId: newTripId,
      hasSummary: !!itineraryData.summary,
      hasDailyPlan: Array.isArray(itineraryData.dailyPlan),
      hasBudgetBreakdown: !!itineraryData.budgetBreakdown,
      hasSelectedFlights: !!itineraryData.flights?.optimalFlight,
      hasSelectedHotel: !!itineraryData.selectedHotel,
      summary: itineraryData.summary,
      budgetBreakdown: itineraryData.budgetBreakdown,
      flightsOptimal: itineraryData.flights?.optimalFlight?.price?.amount,
      flightsReturn: itineraryData.flights?.returnFlight?.price?.amount,
      hotelTotal: itineraryData.selectedHotel?.totalPrice?.amount
    });

    // ✅ RETORNAR RESPUESTA EXITOSA
    res.status(200).json({
      success: true,
      message: 'Itinerary regenerated successfully',
      requestId,
      data: responseData
	  
    });

  } catch (error) {
    console.error('❌ regenerateItinerary error:', {
      requestId,
      error: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    if (error.message?.includes('UNAUTHORIZED')) {
      return res.status(401).json({
        success: false,
        error: 'GCP_AUTH_ERROR',
        message: 'Failed to authenticate with GCP services',
        requestId
      });
    }

    if (error.message?.includes('TIMEOUT') || error.code === 'ECONNABORTED') {
      return res.status(504).json({
        success: false,
        error: 'TIMEOUT',
        message: 'Regeneration request timed out. Please try again.',
        requestId,
        retryAfter: 30
      });
    }

    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to regenerate itinerary',
      requestId,
      debug: process.env.NODE_ENV === 'development' ? { error: error.message } : undefined
    });
  }
};