const { v4: uuidv4 } = require('uuid');
const gcpService = require('../services/gcpService');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { PutCommand } = require('@aws-sdk/lib-dynamodb');

const docClient = new DynamoDBClient({ region: process.env.AWS_REGION });

/**
 * TAREA 102-104: Generar itinerario completo con IA
 * - Valida datos de entrada
 * - Llama a GCP para enriquecer datos y generar itinerario
 * - Guarda resultado en DynamoDB
 * - Retorna respuesta estructurada para frontend
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

    // ✅ VALIDAR PRESUPUESTO
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

    // ✅ PREPARAR DATOS PARA DYNAMODB
    const timestamp = Date.now();
    const tripId = result.itineraryId || `trip_${uuidv4()}`;
    const ttl = Math.floor((timestamp + 30 * 24 * 60 * 60 * 1000) / 1000); // 30 días TTL

    const dbItem = {
      tripId,
      userId,
      timestamp,
      ttl,
      status: 'completed',
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
      // Datos enriquecidos para frontend (mapas, reservas, etc.)
      enrichedData: {
        selectedHotel: itineraryData.selectedHotel,
        selectedRestaurants: itineraryData.selectedRestaurants,
        selectedAttractions: itineraryData.selectedAttractions,
        weather: itineraryData.weather,
        transport: itineraryData.transport,
        flights: itineraryData.flights
      },
      // Metadatos para analytics y debugging
      metadata: {
        generatedAt: new Date().toISOString(),
        generationDuration: result.totalDuration,
        enrichmentSummary: result.enrichmentSummary,
        model: 'gemini-2.5-flash',
        version: '1.0.0'
      }
    };

    // ✅ GUARDAR EN DYNAMODB
    console.log('💾 Saving to DynamoDB...', { requestId, tripId });
    
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
    // Solo enviar lo necesario, no todo el objeto de DB
    const responseData = {
      // Metadatos de la respuesta
      tripId,
      generatedAt: new Date().toISOString(),
      
      // Resumen del viaje (para cards, headers, etc.)
      summary: itineraryData.summary,
      
      // Itinerario día por día (para vista principal)
      dailyPlan: itineraryData.dailyPlan,
      
      // Presupuesto (para vista de costos)
      budgetBreakdown: itineraryData.budgetBreakdown,
      
      // Listas útiles (para secciones laterales)
      packingList: itineraryData.packingList,
      travelTips: itineraryData.travelTips,
      emergencyContacts: itineraryData.emergencyContacts,
      
      // Datos enriquecidos para funcionalidades avanzadas
      places: {
        hotel: itineraryData.selectedHotel,
        restaurants: itineraryData.selectedRestaurants?.slice(0, 10) || [],
        attractions: itineraryData.selectedAttractions?.slice(0, 15) || []
      },
      
      // Datos para mapas y navegación
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
      
      // Datos de vuelo y transporte
      travel: {
        flight: itineraryData.flights?.optimalFlight,
        transport: itineraryData.transport
      },
      
      // Clima (para notificaciones y recomendaciones)
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

    // ✅ MANEJO DE ERRORES ESPECÍFICOS
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

    // ✅ ERROR GENÉRICO
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
    // ✅ VALIDAR tripId
    if (!tripId || !tripId.startsWith('trip_')) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid tripId format'
      });
    }

    // ✅ CONSULTAR DYNAMODB
    const { GetCommand } = require('@aws-sdk/lib-dynamodb');
    
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

    // ✅ VALIDAR PERMISOS (opcional: solo el dueño puede ver)
    if (result.Item.userId !== userId && userId !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to view this itinerary'
      });
    }

    // ✅ RETORNAR ITINERARIO
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
    // ✅ CONSULTAR DYNAMODB CON QUERY
    const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
    
    const params = {
      TableName: process.env.DYNAMODB_TABLE_TRIPS,
      IndexName: 'userId-index', // Asegúrate de crear este GSI en DynamoDB
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      Limit: parseInt(limit),
      ScanIndexForward: false // Más recientes primero
    };

    if (lastKey) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(lastKey, 'base64').toString());
    }

    const result = await docClient.send(new QueryCommand(params));

    // ✅ TRANSFORMAR RESULTADOS
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

    // ✅ PREPARAR NEXT TOKEN PARA PAGINACIÓN
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
    // ✅ VALIDAR tripId
    if (!tripId || !tripId.startsWith('trip_')) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid tripId format'
      });
    }

    // ✅ CONSULTAR PRIMERO PARA VALIDAR PERMISOS
    const { GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
    
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

    // ✅ VALIDAR PERMISOS
    if (getResult.Item.userId !== userId && userId !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to delete this itinerary'
      });
    }

    // ✅ SOFT DELETE: Actualizar status en lugar de borrar
    await docClient.send(new UpdateCommand({
      TableName: process.env.DYNAMODB_TABLE_TRIPS,
      Key: { tripId },
      UpdateExpression: 'SET #status = :status, deletedAt = :deletedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
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