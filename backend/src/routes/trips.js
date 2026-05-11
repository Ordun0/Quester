// backend/src/routes/trips.js

const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { PutCommand, QueryCommand, GetCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/authMiddleware');

const docClient = new DynamoDBClient({ region: process.env.AWS_REGION });

/**
 * POST /api/trips
 * Guardar itinerario generado en la tabla quester-trips
 */
router.post('/', authMiddleware, async (req, res) => {
  // ✅ CORREGIDO: Obtener userId de la estructura correcta del middleware
  // authMiddleware adjunta: req.user = { userId: 'usr_xxx', email: '...', iat: ..., exp: ... }
  const userId = req.user?.userId || req.user?.id;
  
  const {
    tripData,
    travelers,
    budget,
    preferences,
    itinerary,
    sessionId
  } = req.body;

  console.log('💾 [Trips] Saving trip to DynamoDB', {
    userId,
    destination: tripData?.destination,
    itineraryId: itinerary?.id,
    reqUser: req.user  // ✅ Debug: ver estructura completa
  });

  // ✅ Validar que tenemos userId
  if (!userId) {
    console.error('❌ [Trips] Missing userId in request', {
      hasUser: !!req.user,
      userKeys: req.user ? Object.keys(req.user) : []
    });
    
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'User ID not found in token'
    });
  }

  try {
    const tripId = 'trip_' + uuidv4();
    const timestamp = Date.now();

    // ✅ Construir item para DynamoDB
    const tripItem = {
      userId: userId,  // ✅ Partition Key - AHORA DEFINIDO
      tripId: tripId,  // ✅ Sort Key
      
      // Datos del viaje
      destination: tripData?.destination,
      origin: tripData?.origin,
      startDate: tripData?.startDate,
      endDate: tripData?.endDate,
      duration: tripData?.duration,
      currency: budget?.currency || 'USD',
      totalBudget: budget?.total || 0,
      
      // Viajeros
      travelers: travelers || [],
      
      // Preferencias
      preferences: preferences || {},
      
      // Itinerario completo (serializado)
      itinerary: itinerary || {},
      
      // Metadatos
      status: 'completed',
      createdAt: timestamp,
      updatedAt: timestamp,
      sessionId: sessionId || null,
      
      // TTL: 30 días desde la creación (opcional)
      ttl: Math.floor(timestamp / 1000) + (30 * 24 * 60 * 60)
    };

    // ✅ Guardar en DynamoDB
    await docClient.send(new PutCommand({
      TableName: process.env.DYNAMODB_TABLE_TRIPS || 'quester-trips',
      Item: tripItem
    }));

    console.log('✅ [Trips] Trip saved successfully', { tripId, userId });

    res.status(201).json({
      success: true,
      message: 'Trip saved successfully',
      data: {
        tripId: tripId,
        itineraryId: itinerary?.id,
        createdAt: new Date(timestamp).toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [Trips] Error saving trip:', {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to save trip',
      debug: process.env.NODE_ENV === 'development' ? { error: error.message } : undefined
    });
  }
});

/**
 * GET /api/trips
 * Obtener lista de trips del usuario para el dashboard
 */
router.get('/', authMiddleware, async (req, res) => {
  // ✅ CORREGIDO: Obtener userId de la estructura correcta
  const userId = req.user?.userId || req.user?.id;

  console.log('📦 [Trips] Fetching trips for user', { userId });

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'User ID not found in token'
    });
  }

  try {
    const result = await docClient.send(new QueryCommand({
      TableName: process.env.DYNAMODB_TABLE_TRIPS || 'quester-trips',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      ScanIndexForward: false,  // Orden descendente por tripId (más recientes primero)
      Limit: 50  // Límite para paginación
    }));

    // ✅ Transformar items para el frontend
    const trips = result.Items?.map(item => ({
      tripId: item.tripId,
      destination: item.destination,
      origin: item.origin,
      startDate: item.startDate,
      endDate: item.endDate,
      duration: item.duration,
      totalBudget: item.totalBudget,
      currency: item.currency,
      travelers: item.travelers?.length || 0,
      status: item.status,
      createdAt: item.createdAt,
      // Mini-resumen del itinerario
      itinerarySummary: {
        title: item.itinerary?.summary?.title,
        dailyPlanCount: item.itinerary?.dailyPlan?.length || 0,
        totalActivities: item.itinerary?.dailyPlan?.reduce((sum, day) => 
          sum + (day?.activities?.length || 0), 0) || 0
      }
    })) || [];

    console.log('✅ [Trips] Fetched trips', { count: trips.length });

    res.status(200).json({
      success: true,
      data: { trips }
    });

  } catch (error) {
    console.error('❌ [Trips] Error fetching trips:', error.message);

    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch trips'
    });
  }
});

/**
 * GET /api/trips/:tripId
 * Obtener un trip específico por ID
 */
router.get('/:tripId', authMiddleware, async (req, res) => {
  // ✅ CORREGIDO: Obtener userId de la estructura correcta
  const userId = req.user?.userId || req.user?.id;
  const { tripId } = req.params;

  console.log('🔍 [Trips] Fetching trip', { userId, tripId });

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'User ID not found in token'
    });
  }

  try {
    const result = await docClient.send(new GetCommand({
      TableName: process.env.DYNAMODB_TABLE_TRIPS || 'quester-trips',
      Key: {
        userId: userId,
        tripId: tripId
      }
    }));

    if (!result.Item) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Trip not found'
      });
    }

    // ✅ Verificar que el trip pertenece al usuario
    if (result.Item.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Access denied'
      });
    }

    console.log('✅ [Trips] Trip fetched successfully');

    res.status(200).json({
      success: true,
      data: result.Item
    });

  } catch (error) {
    console.error('❌ [Trips] Error fetching trip:', error.message);

    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch trip'
    });
  }
});

/**
 * DELETE /api/trips/:tripId
 * Eliminar un trip (soft delete o hard delete)
 */
router.delete('/:tripId', authMiddleware, async (req, res) => {
  // ✅ CORREGIDO: Obtener userId de la estructura correcta
  const userId = req.user?.userId || req.user?.id;
  const { tripId } = req.params;

  console.log('🗑️ [Trips] Deleting trip', { userId, tripId });

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'User ID not found in token'
    });
  }

  try {
    // ✅ Primero verificar que el trip existe y pertenece al usuario
    const checkResult = await docClient.send(new GetCommand({
      TableName: process.env.DYNAMODB_TABLE_TRIPS || 'quester-trips',
      Key: { userId, tripId }
    }));

    if (!checkResult.Item || checkResult.Item.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Trip not found'
      });
    }

    // ✅ Eliminar el item
    await docClient.send(new DeleteCommand({
      TableName: process.env.DYNAMODB_TABLE_TRIPS || 'quester-trips',
      Key: { userId, tripId }
    }));

    console.log('✅ [Trips] Trip deleted successfully');

    res.status(200).json({
      success: true,
      message: 'Trip deleted successfully'
    });

  } catch (error) {
    console.error('❌ [Trips] Error deleting trip:', error.message);

    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to delete trip'
    });
  }
});

module.exports = router;