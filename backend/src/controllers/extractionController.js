const gcpService = require('../services/gcpService');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { GetCommand } = require('@aws-sdk/lib-dynamodb');

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

// ✅ NUEVO: Parsear customNotes para extraer lugares/actividades específicas solicitadas por el usuario
const parseCustomNotesForPlaces = (customNotes) => {
  if (!customNotes || customNotes.trim() === '') return [];
  
  // ✅ Patrones comunes para detectar lugares específicos
  const patterns = [
    /(?:go to|visit|see|want to (?:go to|visit|see)|include|add)\s+([A-Z][a-zA-Z\s&,.'-]+?)(?:\s+(?:stadium|arena|park|museum|church|temple|beach|restaurant|cafe|bar|club|market|mall|square|plaza|street|avenue|boulevard|bridge|tower|castle|palace|fort|ruins|garden|zoo|aquarium|theater|cinema|gallery|library|university|school|hospital|airport|station|port|harbor|marina|pier|dock|wharf|lighthouse|monument|memorial|statue|fountain|park|garden|reserve|sanctuary|refuge|preserve|wildlife|nature|scenic|viewpoint|lookout|summit|peak|mountain|hill|valley|canyon|gorge|cliff|cave|waterfall|river|lake|pond|stream|creek|bay|gulf|sea|ocean|island|peninsula|cape|point|headland|coast|shore|beach|sand|rock|stone|cliff|cave|tunnel|bridge|road|highway|freeway|expressway|motorway|street|avenue|boulevard|lane|drive|court|place|way|circle|loop|spur|bypass|ring|belt|parkway|parkway|drive|lane|court|place|way|circle|loop|spur|bypass|ring|belt))?/gi,
    /(?:stadium|arena|park|museum|church|temple|beach|restaurant|cafe|bar|club|market|mall|square|plaza|street|avenue|boulevard)\s+([A-Z][a-zA-Z\s&,.'-]+)/gi,
    /["']([^"']+(?:stadium|arena|park|museum|church|temple|beach|restaurant|cafe|bar|club|market|mall))["']/gi
  ];
  
  const places = [];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(customNotes)) !== null) {
      const place = match[1]?.trim();
      if (place && place.length > 3 && place.length < 100) {
        // ✅ Evitar duplicados y lugares genéricos
        const normalized = place.toLowerCase().replace(/[^\w\s]/g, '');
        if (!['stadium', 'park', 'museum', 'beach', 'restaurant'].includes(normalized) && 
            !places.some(p => p.toLowerCase().replace(/[^\w\s]/g, '') === normalized)) {
          places.push(place);
        }
      }
    }
  }
  
  console.log('🔍 [CustomNotes] Extracted user-requested places:', places);
  return places;
};

// ✅ NUEVO: Agregar lugares solicitados por el usuario al payload de atracciones
const injectUserRequestedPlaces = (attractions, userRequestedPlaces, destination) => {
  if (!userRequestedPlaces || userRequestedPlaces.length === 0) return attractions;
  
  const existingNames = (attractions || []).map(a => a?.name?.toLowerCase() || '');
  
  const injected = userRequestedPlaces
    .filter(place => !existingNames.some(name => name.includes(place.toLowerCase()) || place.toLowerCase().includes(name)))
    .map((place, index) => ({
      name: place,
      type: 'user-requested',
      rating: 4.0, // Rating por defecto para lugares solicitados
      openingHours: 'Varies - verify before visiting',
      gps: null, // GPS desconocido, Gemini debe inferir
      description: `User specifically requested to visit ${place}. Include this in the itinerary if feasible for the destination ${destination}.`,
      price: { amount: 0, currency: 'USD', formatted: '$0' }, // Precio desconocido
      userRequested: true // ✅ Flag para que Gemini sepa que es requisito del usuario
    }));
  
  console.log('📥 [CustomNotes] Injected user-requested places into attractions:', injected.map(p => p.name));
  
  // ✅ Combinar atracciones originales + lugares solicitados por el usuario
  return [...(attractions || []), ...injected];
};

// ✅ Agregar esta función helper al inicio del archivo (fuera de los exports):

/**
 * ✅ Helper: Validar y actualizar contador de regeneraciones
 */
const validateAndIncrementRegeneration = async (userId, originalTripId) => {
  if (!originalTripId || !userId) return { valid: true, count: 0 };
  
  try {
    const { GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
    const docClient = new (require('@aws-sdk/client-dynamodb').DynamoDBClient)({ 
      region: process.env.AWS_REGION 
    });
    
    // ✅ Obtener trip actual
    const tripResult = await docClient.send(new GetCommand({
      TableName: process.env.DYNAMODB_TABLE_TRIPS || 'quester-trips',
      Key: { userId, tripId: originalTripId }
    }));
    
    if (!tripResult.Item) {
      console.warn('⚠️ [Regeneration] Original trip not found:', originalTripId);
      return { valid: true, count: 0 };  // No bloquear si no se encuentra
    }
    
    const metadata = tripResult.Item.metadata || {};
    const regenerationCount = metadata.regenerationCount || 0;
    
    // ✅ Validar límite
    if (regenerationCount >= 2) {
      console.warn('⚠️ [Regeneration] Limit reached for trip:', originalTripId);
      return { valid: false, count: regenerationCount };
    }
    
    // ✅ Incrementar contador
    await docClient.send(new UpdateCommand({
      TableName: process.env.DYNAMODB_TABLE_TRIPS,
      Key: { userId, tripId: originalTripId },
      UpdateExpression: 'SET metadata.regenerationCount = :count, metadata.lastRegenerated = :now',
      ExpressionAttributeValues: {
        ':count': regenerationCount + 1,
        ':now': new Date().toISOString()
      }
    }));
    
    console.log('✅ [Regeneration] Count incremented:', regenerationCount + 1);
    return { valid: true, count: regenerationCount + 1 };
    
  } catch (e) {
    console.warn('⚠️ [Regeneration] Could not validate/increment count:', e.message);
    return { valid: true, count: 0 };  // No bloquear por errores de DB
  }
};

/**
 * POST /api/extraction
 * Extrae datos de SerpAPI + genera itinerario con Gemini
 * ✅ AHORA: Envía MÁS opciones a Gemini + maneja customNotes + retry de budget
 */
exports.extractAndGenerate = async (req, res) => {
  const userId = req.user?.userId || req.user?.id;
  const { 
    tripData, travelers, budget, preferences, sessionId,
    userComments, isRegeneration, originalTripId  // ✅ Nuevos campos para regeneración
  } = req.body;

  console.log('🚀 [Extraction] Starting extraction + Gemini generation', {
    userId,
    sessionId,
    destination: tripData?.destination,
    origin: tripData?.origin,
    startDate: tripData?.startDate,
    endDate: tripData?.endDate,
    budget: budget?.total,
    isRegeneration: !!isRegeneration,
    originalTripId,
    hasUserComments: !!userComments
  });

  try {
    // ✅ VALIDAR LÍMITE DE REGENERACIONES (si aplica)
    if (isRegeneration && originalTripId) {
      const validation = await validateAndIncrementRegeneration(userId, originalTripId);
      
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'REGENERATION_LIMIT',
          message: 'Regeneration limit reached (max 2 per trip)',
          data: { regenerationCount: validation.count }
        });
      }
    }

    // ✅ Validar datos requeridos
    if (!tripData?.destination || !tripData?.startDate || !tripData?.endDate) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'tripData.destination, startDate, and endDate are required'
      });
    }

    // ✅ RECUPERAR origin desde sesión si no viene en tripData
    var origin = tripData?.origin;
    
    if (!origin && sessionId && userId) {
      try {
        const sessionResult = await docClient.send(new GetCommand({
          TableName: process.env.DYNAMODB_TABLE_SESSIONS || 'quester-sessions',
          Key: { userId: userId, sessionId: sessionId }
        }));
        
        if (sessionResult.Item?.origin) {
          origin = sessionResult.Item.origin;
        }
      } catch (sessionError) {
        console.warn('⚠️ [Extraction] Could not recover origin from session:', sessionError.message);
      }
    }
    
    if (!origin) {
      origin = 'New York, USA';
    }
    
    const tripDataWithOrigin = { ...tripData, origin };

    // ✅ Paso 1: Extraer y consolidar datos de SerpAPI
    const extractionResult = await gcpService.extractAndConsolidate(
      tripDataWithOrigin,
      travelers,
      budget,
      preferences
    );

    if (!extractionResult || !extractionResult.success || !extractionResult.data) {
      return res.status(500).json({
        success: false,
        error: 'EXTRACTION_FAILED',
        message: 'Failed to extract travel data',
        debug: extractionResult?.error
      });
    }

    // ✅ NUEVO: Parsear customNotes para extraer lugares específicos solicitados por el usuario
    const userRequestedPlaces = parseCustomNotesForPlaces(preferences?.customNotes);
    
    // ✅ NUEVO: Inyectar lugares solicitados por el usuario en las atracciones
    let attractions = extractionResult.data?.attractions || [];
    if (userRequestedPlaces.length > 0) {
      attractions = injectUserRequestedPlaces(
        attractions, 
        userRequestedPlaces, 
        tripData?.destination
      );
    }

    // ✅ NUEVO: Preparar payload con MÁS opciones para Gemini (ya no hay límite de tokens)
    const itineraryPayload = {
      tripData: extractionResult.data?.tripData || {},
      travelers: extractionResult.data?.travelers || [],
      budget: extractionResult.data?.budget || {},
      preferences: extractionResult.data?.preferences || {},
      // ✅ ENVIAR MÁS OPCIONES: 10 vuelos, 10 hoteles, 20 restaurantes, 25 atracciones
      flights: extractionResult.data?.flights ? {
        outboundFlights: (extractionResult.data.flights.outboundFlights || []).slice(0, 10),
        returnFlights: (extractionResult.data.flights.returnFlights || []).slice(0, 10)
      } : null,
      hotels: extractionResult.data?.hotels ? {
        optimalHotels: (extractionResult.data.hotels.optimalHotels || []).slice(0, 10)
      } : null,
      restaurants: (extractionResult.data?.restaurants || []).slice(0, 20),
      attractions: attractions.slice(0, 25), // ✅ Incluye lugares inyectados de customNotes
      weather: extractionResult.data?.weather || null,
      transport: extractionResult.data?.transport || null
    };

    console.log('📤 [Extraction] Payload sent to Gemini:', {
      flightsOutbound: itineraryPayload.flights?.outboundFlights?.length || 0,
      flightsReturn: itineraryPayload.flights?.returnFlights?.length || 0,
      hotels: itineraryPayload.hotels?.optimalHotels?.length || 0,
      restaurants: itineraryPayload.restaurants?.length || 0,
      attractions: itineraryPayload.attractions?.length || 0,
      userRequestedPlacesInjected: userRequestedPlaces.length
    });

    // ✅ NUEVO: Intentar generar itinerario con retry si excede presupuesto (máx 2 reintentos)
    let itineraryResult;
    let attempt = 0;
    const maxAttempts = 3; // 1 intento inicial + 2 reintentos si excede budget
    const userBudget = budget?.total || 0;
    const currency = budget?.currency || 'USD';
    
    while (attempt < maxAttempts) {
      // ✅ PASAR userComments a Gemini (para regeneración con feedback)
      itineraryResult = await gcpService.generateItineraryWithGemini(
        itineraryPayload,
        userComments?.trim() || null  // ✅ Comentarios para ajustar el itinerario
      );

      if (!itineraryResult || !itineraryResult.success) {
        return res.status(500).json({
          success: false,
          error: 'GEMINI_GENERATION_FAILED',
          message: 'Failed to generate itinerary with AI',
          debug: itineraryResult?.error
        });
      }

      // ✅ Construir itinerario para frontend
      var itineraryForFrontend = {
        id: itineraryResult.itineraryId,
        summary: itineraryResult.summary || itineraryResult.data?.summary,
        dailyPlan: itineraryResult.dailyPlan || itineraryResult.data?.dailyPlan,
        budgetBreakdown: itineraryResult.budgetBreakdown || itineraryResult.data?.budgetBreakdown,
        recommendations: itineraryResult.recommendations || itineraryResult.data?.recommendations,
        selectedFlights: {
          outbound: extractionResult.data.flights?.outboundFlights?.[0] || null,
          return: extractionResult.data.flights?.returnFlights?.[0] || null
        },
        selectedHotel: extractionResult.data.hotels?.optimalHotels?.[0] || null,
        weather: extractionResult.data.weather || null,
        transport: extractionResult.data.transport || null
      };

      // ✅ Validar estructura mínima
      if (!itineraryForFrontend.dailyPlan || !Array.isArray(itineraryForFrontend.dailyPlan)) {
        return res.status(500).json({
          success: false,
          error: 'INVALID_ITINERARY',
          message: 'Received invalid itinerary data from Gemini'
        });
      }

      // ✅ VALIDACIÓN DE PRESUPUESTO
      const estimatedTotal = calculateEstimatedTotal(
        itineraryResult.data || itineraryResult,
        itineraryForFrontend.selectedFlights,
        itineraryForFrontend.selectedHotel
      );

      // ✅ Si está dentro del budget o es el último intento, salir del loop
      if (userBudget <= 0 || estimatedTotal <= userBudget || attempt === maxAttempts - 1) {
        console.log(`✅ [BudgetValidation] Itinerary ${attempt === 0 ? 'initial' : `retry #${attempt}`} is ${estimatedTotal <= userBudget ? 'within' : 'over'} budget`, {
          userBudget,
          estimatedTotal,
          currency,
          attempt: attempt + 1
        });
        break;
      }

      // ✅ Si excede budget y hay más intentos: reducir opciones a las más económicas y reintentar
      console.log(`⚠️ [BudgetValidation] Itinerary attempt #${attempt + 1} exceeds budget (${currency}${estimatedTotal} > ${currency}${userBudget}), retrying with economical options...`);
      
      // ✅ Reducir payload a opciones más económicas para el siguiente intento
      itineraryPayload.flights = extractionResult.data?.flights ? {
        // ✅ Ordenar por precio y tomar las 3 más baratas
        outboundFlights: (extractionResult.data.flights.outboundFlights || [])
          .sort((a, b) => (a?.price?.amount || 0) - (b?.price?.amount || 0))
          .slice(0, 3),
        returnFlights: (extractionResult.data.flights.returnFlights || [])
          .sort((a, b) => (a?.price?.amount || 0) - (b?.price?.amount || 0))
          .slice(0, 3)
      } : null;
      
      itineraryPayload.hotels = extractionResult.data?.hotels ? {
        // ✅ Ordenar por precio total y tomar los 3 más baratos
        optimalHotels: (extractionResult.data.hotels.optimalHotels || [])
          .sort((a, b) => (a?.totalPrice?.amount || 0) - (b?.totalPrice?.amount || 0))
          .slice(0, 3)
      } : null;
      
      // ✅ Para restaurantes y atracciones, filtrar por precio bajo
      itineraryPayload.restaurants = (extractionResult.data?.restaurants || [])
        .filter(r => (r?.pricePerPerson?.amount || 0) <= 50) // ✅ Solo restaurantes ≤ $50/persona
        .slice(0, 15);
      
      itineraryPayload.attractions = attractions
        .filter(a => (a?.price?.amount || 0) <= 30 && !a?.userRequested) // ✅ Solo actividades ≤ $30, pero mantener user-requested
        .slice(0, 20);
      
      // ✅ Agregar flag al prompt para que Gemini priorice opciones económicas
      itineraryPayload.preferences = {
        ...itineraryPayload.preferences,
        prioritizeBudget: true,
        budgetRetryAttempt: attempt + 1
      };
      
      attempt++;
    }

    // ✅ Si después de todos los intentos aún excede budget, retornar error
    const finalEstimatedTotal = calculateEstimatedTotal(
      itineraryResult.data || itineraryResult,
      itineraryForFrontend.selectedFlights,
      itineraryForFrontend.selectedHotel
    );
    
    if (userBudget > 0 && finalEstimatedTotal > userBudget) {
      console.warn('⚠️ [BudgetValidation - Final] Itinerary still exceeds budget after all retries', {
        userBudget,
        finalEstimatedTotal,
        difference: finalEstimatedTotal - userBudget,
        currency,
        attempts: attempt + 1
      });
      
      return res.status(400).json({
        success: false,
        error: 'BUDGET_EXCEEDED',
        message: 'Sorry, I cannot create an itinerary with this budget. Please increase it.',
        data: {
          userBudget,
          estimatedTotal: finalEstimatedTotal,
          currency,
          difference: finalEstimatedTotal - userBudget,
          breakdown: {
            flights: (itineraryForFrontend.selectedFlights?.outbound?.price?.amount || 0) + 
                     (itineraryForFrontend.selectedFlights?.return?.price?.amount || 0),
            hotels: itineraryForFrontend.selectedHotel?.totalPrice?.amount || 0,
            food: itineraryResult.data?.budgetBreakdown?.food || 0,
            activities: itineraryResult.data?.budgetBreakdown?.activities || 0,
            transport: itineraryResult.data?.budgetBreakdown?.transport || 0
          }
        }
      });
    }

    console.log('✅ [Extraction] Itinerary generated successfully', {
      destination: itineraryForFrontend.summary?.destination,
      days: itineraryForFrontend.dailyPlan?.length,
      hasSelectedFlights: !!itineraryForFrontend.selectedFlights?.outbound,
      hasSelectedHotel: !!itineraryForFrontend.selectedHotel,
      budgetStatus: `${currency}${finalEstimatedTotal} / ${currency}${userBudget}`,
      attempts: attempt + 1,
      isRegeneration: !!isRegeneration
    });

    // ✅ Retornar respuesta completa al frontend
    res.status(200).json({
      success: true,
      message: isRegeneration ? 'Itinerary regenerated successfully' : 'Itinerary generated successfully',
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
 * ✅ NUEVO: POST /api/extraction/regenerate
 * Regenera itinerario con comentarios del usuario usando el mismo flujo que extractAndGenerate
 * Body: { tripData, travelers, budget, preferences, userComments, sessionId? }
 */
exports.regenerateWithFeedback = async (req, res) => {
  const userId = req.user?.userId || req.user?.id;
  
  // ✅ EXTRAER DATOS: Soportar tanto formato aplanado como anidado en originalRequest
  let { tripData, travelers, budget, preferences, userComments, sessionId } = req.body;
  
  // ✅ Logging para debuggear estructura recibida
  console.log('🔍 [Regenerate] Data extraction logic:', {
    hasTripDataInRoot: !!req.body.tripData,
    hasOriginalRequest: !!req.body.originalRequest,
    tripDataFromOriginalRequest: req.body.originalRequest?.tripData,
    bodyKeys: Object.keys(req.body || {})
  });
  
  // ✅ Si tripData no está en la raíz, intentar extraer de originalRequest
  if (!tripData && req.body.originalRequest) {
    console.log('🔄 [Regenerate] Extracting data from originalRequest');
    tripData = req.body.originalRequest.tripData;
    travelers = req.body.originalRequest.travelers;
    budget = req.body.originalRequest.budget;
    preferences = req.body.originalRequest.preferences;
    sessionId = req.body.originalRequest.sessionId;
  }
  
  // ✅ Logging final para confirmar extracción
  console.log('🔍 [Regenerate] Final extracted data:', {
    hasTripData: !!tripData,
    destination: tripData?.destination,
    startDate: tripData?.startDate,
    endDate: tripData?.endDate,
    hasTravelers: !!travelers,
    hasBudget: !!budget,
    hasPreferences: !!preferences
  });

  console.log('🔄 [Extraction] Starting regeneration with feedback', {
    userId,
    sessionId,
    destination: tripData?.destination,
    origin: tripData?.origin,
    userComments: userComments?.substring(0, 100) + (userComments?.length > 100 ? '...' : '')
  });

  try {
    // ✅ VALIDAR ENTRADA
    if (!userComments || userComments.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'User comments are required for regeneration',
      });
    }

    if (!tripData?.destination || !tripData?.startDate || !tripData?.endDate) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'tripData.destination, startDate, and endDate are required'
      });
    }

    // ✅ RECUPERAR origin desde sesión si no viene en tripData
    var origin = tripData?.origin;
    
    if (!origin && sessionId && userId) {
      try {
        const sessionResult = await docClient.send(new GetCommand({
          TableName: process.env.DYNAMODB_TABLE_SESSIONS || 'quester-sessions',
          Key: { userId: userId, sessionId: sessionId }
        }));
        
        if (sessionResult.Item?.origin) {
          origin = sessionResult.Item.origin;
        }
      } catch (sessionError) {
        console.warn('⚠️ [Extraction] Could not recover origin from session:', sessionError.message);
      }
    }
    
    if (!origin) {
      origin = 'New York, USA';
    }
    
    const tripDataWithOrigin = { ...tripData, origin };

    // ✅ Paso 1: Extraer y consolidar datos de SerpAPI (DATOS FRESCOS)
    console.log('📤 [Regenerate] Calling GCP extraction functions for fresh data...');
    const extractionResult = await gcpService.extractAndConsolidate(
      tripDataWithOrigin,
      travelers,
      budget,
      preferences
    );

    if (!extractionResult || !extractionResult.success || !extractionResult.data) {
      return res.status(500).json({
        success: false,
        error: 'EXTRACTION_FAILED',
        message: 'Failed to extract travel data for regeneration',
        debug: extractionResult?.error
      });
    }

    // ✅ NUEVO: Parsear customNotes para extraer lugares específicos solicitados por el usuario
    const userRequestedPlaces = parseCustomNotesForPlaces(preferences?.customNotes);
    
    // ✅ NUEVO: Inyectar lugares solicitados por el usuario en las atracciones
    let attractions = extractionResult.data?.attractions || [];
    if (userRequestedPlaces.length > 0) {
      attractions = injectUserRequestedPlaces(
        attractions, 
        userRequestedPlaces, 
        tripData?.destination
      );
    }

    // ✅ NUEVO: Preparar payload con MÁS opciones para Gemini
    const itineraryPayload = {
      tripData: extractionResult.data?.tripData || {},
      travelers: extractionResult.data?.travelers || [],
      budget: extractionResult.data?.budget || {},
      preferences: {
        ...extractionResult.data?.preferences,
        userFeedback: userComments.trim() // ✅ Agregar feedback al payload para Gemini
      },
      // ✅ ENVIAR MÁS OPCIONES: 10 vuelos, 10 hoteles, 20 restaurantes, 25 atracciones
      flights: extractionResult.data?.flights ? {
        outboundFlights: (extractionResult.data.flights.outboundFlights || []).slice(0, 10),
        returnFlights: (extractionResult.data.flights.returnFlights || []).slice(0, 10)
      } : null,
      hotels: extractionResult.data?.hotels ? {
        optimalHotels: (extractionResult.data.hotels.optimalHotels || []).slice(0, 10)
      } : null,
      restaurants: (extractionResult.data?.restaurants || []).slice(0, 20),
      attractions: attractions.slice(0, 25), // ✅ Incluye lugares inyectados de customNotes
      weather: extractionResult.data?.weather || null,
      transport: extractionResult.data?.transport || null
    };

    console.log('📤 [Regenerate] Payload sent to Gemini:', {
      flightsOutbound: itineraryPayload.flights?.outboundFlights?.length || 0,
      flightsReturn: itineraryPayload.flights?.returnFlights?.length || 0,
      hotels: itineraryPayload.hotels?.optimalHotels?.length || 0,
      restaurants: itineraryPayload.restaurants?.length || 0,
      attractions: itineraryPayload.attractions?.length || 0,
      userRequestedPlacesInjected: userRequestedPlaces.length,
      userFeedback: userComments?.substring(0, 50)
    });

    // ✅ NUEVO: Intentar generar itinerario con retry si excede presupuesto (máx 2 reintentos)
    let itineraryResult;
    let attempt = 0;
    const maxAttempts = 3;
    const userBudget = budget?.total || 0;
    const currency = budget?.currency || 'USD';
    
    while (attempt < maxAttempts) {
      // ✅ PASAR userComments al servicio de Gemini para regeneración
      itineraryResult = await gcpService.generateItineraryWithGemini(
        itineraryPayload,
        userComments.trim()  // ← Comentarios para regeneración
      );

      if (!itineraryResult || !itineraryResult.success) {
        return res.status(500).json({
          success: false,
          error: 'GEMINI_GENERATION_FAILED',
          message: 'Failed to regenerate itinerary with AI',
          debug: itineraryResult?.error
        });
      }

      // ✅ Construir itinerario para frontend
      var itineraryForFrontend = {
        id: itineraryResult.itineraryId,
        summary: itineraryResult.summary || itineraryResult.data?.summary,
        dailyPlan: itineraryResult.dailyPlan || itineraryResult.data?.dailyPlan,
        budgetBreakdown: itineraryResult.budgetBreakdown || itineraryResult.data?.budgetBreakdown,
        recommendations: itineraryResult.recommendations || itineraryResult.data?.recommendations,
        selectedFlights: {
          outbound: extractionResult.data.flights?.outboundFlights?.[0] || null,
          return: extractionResult.data.flights?.returnFlights?.[0] || null
        },
        selectedHotel: extractionResult.data.hotels?.optimalHotels?.[0] || null,
        weather: extractionResult.data.weather || null,
        transport: extractionResult.data.transport || null
      };

      // ✅ Validar estructura mínima
      if (!itineraryForFrontend.dailyPlan || !Array.isArray(itineraryForFrontend.dailyPlan)) {
        return res.status(500).json({
          success: false,
          error: 'INVALID_ITINERARY',
          message: 'Received invalid regenerated itinerary data from Gemini'
        });
      }

      // ✅ VALIDACIÓN DE PRESUPUESTO
      const estimatedTotal = calculateEstimatedTotal(
        itineraryResult.data || itineraryResult,
        itineraryForFrontend.selectedFlights,
        itineraryForFrontend.selectedHotel
      );

      // ✅ Si está dentro del budget o es el último intento, salir del loop
      if (userBudget <= 0 || estimatedTotal <= userBudget || attempt === maxAttempts - 1) {
        console.log(`✅ [BudgetValidation - Regenerate] Itinerary ${attempt === 0 ? 'initial' : `retry #${attempt}`} is ${estimatedTotal <= userBudget ? 'within' : 'over'} budget`, {
          userBudget,
          estimatedTotal,
          currency,
          attempt: attempt + 1
        });
        break;
      }

      // ✅ Si excede budget y hay más intentos: reducir opciones a las más económicas y reintentar
      console.log(`⚠️ [BudgetValidation - Regenerate] Itinerary attempt #${attempt + 1} exceeds budget, retrying with economical options...`);
      
      // ✅ Reducir payload a opciones más económicas para el siguiente intento
      itineraryPayload.flights = extractionResult.data?.flights ? {
        outboundFlights: (extractionResult.data.flights.outboundFlights || [])
          .sort((a, b) => (a?.price?.amount || 0) - (b?.price?.amount || 0))
          .slice(0, 3),
        returnFlights: (extractionResult.data.flights.returnFlights || [])
          .sort((a, b) => (a?.price?.amount || 0) - (b?.price?.amount || 0))
          .slice(0, 3)
      } : null;
      
      itineraryPayload.hotels = extractionResult.data?.hotels ? {
        optimalHotels: (extractionResult.data.hotels.optimalHotels || [])
          .sort((a, b) => (a?.totalPrice?.amount || 0) - (b?.totalPrice?.amount || 0))
          .slice(0, 3)
      } : null;
      
      itineraryPayload.restaurants = (extractionResult.data?.restaurants || [])
        .filter(r => (r?.pricePerPerson?.amount || 0) <= 50)
        .slice(0, 15);
      
      itineraryPayload.attractions = attractions
        .filter(a => (a?.price?.amount || 0) <= 30 && !a?.userRequested)
        .slice(0, 20);
      
      itineraryPayload.preferences = {
        ...itineraryPayload.preferences,
        prioritizeBudget: true,
        budgetRetryAttempt: attempt + 1
      };
      
      attempt++;
    }

    // ✅ Si después de todos los intentos aún excede budget, retornar error
    const finalEstimatedTotal = calculateEstimatedTotal(
      itineraryResult.data || itineraryResult,
      itineraryForFrontend.selectedFlights,
      itineraryForFrontend.selectedHotel
    );
    
    if (userBudget > 0 && finalEstimatedTotal > userBudget) {
      console.warn('⚠️ [BudgetValidation - Regenerate - Final] Itinerary still exceeds budget after all retries', {
        userBudget,
        finalEstimatedTotal,
        difference: finalEstimatedTotal - userBudget,
        currency,
        attempts: attempt + 1
      });
      
      return res.status(400).json({
        success: false,
        error: 'BUDGET_EXCEEDED',
        message: 'Sorry, I cannot create an itinerary with this budget. Please increase it.',
        data: {
          userBudget,
          estimatedTotal: finalEstimatedTotal,
          currency,
          difference: finalEstimatedTotal - userBudget,
          breakdown: {
            flights: (itineraryForFrontend.selectedFlights?.outbound?.price?.amount || 0) + 
                     (itineraryForFrontend.selectedFlights?.return?.price?.amount || 0),
            hotels: itineraryForFrontend.selectedHotel?.totalPrice?.amount || 0,
            food: itineraryResult.data?.budgetBreakdown?.food || 0,
            activities: itineraryResult.data?.budgetBreakdown?.activities || 0,
            transport: itineraryResult.data?.budgetBreakdown?.transport || 0
          }
        }
      });
    }
    
    console.log('✅ [BudgetValidation - Regenerate] Itinerary is within budget', {
      userBudget,
      finalEstimatedTotal,
      currency
    });

    console.log('✅ [Regenerate] Itinerary regenerated successfully', {
      destination: itineraryForFrontend.summary?.destination,
      days: itineraryForFrontend.dailyPlan?.length,
      hasSelectedFlights: !!itineraryForFrontend.selectedFlights?.outbound,
      hasSelectedHotel: !!itineraryForFrontend.selectedHotel,
      budgetStatus: `${currency}${finalEstimatedTotal} / ${currency}${userBudget}`,
      attempts: attempt + 1
    });

    // ✅ Retornar respuesta (MISMA ESTRUCTURA QUE extractAndGenerate)
    res.status(200).json({
      success: true,
      message: 'Itinerary regenerated successfully',
      data: {
        extraction: {
          summary: extractionResult.data.summary,
          duration: extractionResult.duration
        },
        itinerary: itineraryForFrontend
      }
    });

  } catch (error) {
    console.error('❌ [Regenerate] Error:', {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to regenerate itinerary',
      debug: process.env.NODE_ENV === 'development' ? { error: error.message } : undefined
    });
  }
};

exports.extractDataOnly = async (req, res) => {
  const { tripData, travelers, budget, preferences, sessionId } = req.body;
  const userId = req.user?.userId || req.user?.id;

  console.log('🧪 [Extraction] Data-only extraction requested', {
    destination: tripData?.destination,
    origin: tripData?.origin
  });

  try {
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