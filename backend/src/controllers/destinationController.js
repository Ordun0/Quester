// backend/src/controllers/destinationController.js

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

// Configurar cliente de DynamoDB
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

const docClient = DynamoDBDocumentClient.from(client);

// ===========================================
// TAREA 85-86: BUSCAR DESTINOS CON SERPAPI (Google Maps)
// ===========================================
exports.searchDestinations = async (req, res) => {
  try {
    const { query, location, limit = 5 } = req.query;

    console.log('=== DEBUG searchDestinations ===');
    console.log('query:', query);
    console.log('location:', location);
    console.log('limit:', limit);
    console.log('========================');

    // Validar parámetros requeridos
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Search query must be at least 2 characters'
      });
    }

    // Buscar en caché primero
    const cacheKey = `dest_${query.toLowerCase().replace(/\s+/g, '_')}`;
    
    try {
      const cachedResult = await docClient.send(new QueryCommand({
        TableName: process.env.DYNAMODB_TABLE_CACHE,
        IndexName: 'cacheKey-index',
        KeyConditionExpression: 'cacheKey = :cacheKey',
        ExpressionAttributeValues: {
          ':cacheKey': cacheKey
        },
        Limit: 1
      }));

      if (cachedResult.Items && cachedResult.Items.length > 0) {
        const cached = cachedResult.Items[0];
        const cacheAge = Date.now() - parseInt(cached.createdAt);
        const cacheTTL = 24 * 60 * 60 * 1000; // 24 horas

        if (cacheAge < cacheTTL) {
          console.log('✅ Cache hit:', cacheKey);
          return res.status(200).json({
            success: true,
            message: 'Results from cache',
            data: JSON.parse(cached.data),
            fromCache: true
          });
        }
      }
    } catch (cacheError) {
      console.log('⚠️ Cache not available, continuing with SerpAPI...');
    }

    // Llamar a SerpAPI Google Maps
    const serpApiKey = process.env.SERPAPI_API_KEY;
    
    if (!serpApiKey) {
      console.error('❌ SERPAPI_API_KEY not configured');
      return res.status(500).json({
        success: false,
        error: 'CONFIG_ERROR',
        message: 'SerpAPI key not configured'
      });
    }

    const serpApiUrl = 'https://serpapi.com/search';
    const params = {
      engine: 'google_maps',
      type: 'search',
      q: query,
      api_key: serpApiKey
    };

    if (location) {
      params.location = location;
    }

    console.log('📤 Calling SerpAPI Google Maps:', params);

    const response = await axios.get(serpApiUrl, {
      params: params,
      timeout: 10000
    });

    console.log('✅ SerpAPI response status:', response.status);

    // Formatear resultados
    const destinations = formatSerpApiResults(response.data, limit);

    if (destinations.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'NO_RESULTS',
        message: 'No destinations found for your search'
      });
    }

    // Guardar en caché
    try {
      const timestamp = Date.now();
      const ttl = Math.floor((timestamp + 7 * 24 * 60 * 60 * 1000) / 1000); // 7 días

      await docClient.send(new PutCommand({
        TableName: process.env.DYNAMODB_TABLE_CACHE,
        Item: {
          cacheId: `cache_${uuidv4()}`,
          cacheKey: cacheKey,
          data: JSON.stringify(destinations),
          createdAt: timestamp,
          ttl: ttl
        }
      }));
      console.log('✅ Cached results:', cacheKey);
    } catch (cacheError) {
      console.error('⚠️ Failed to cache results:', cacheError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Destinations found',
      data: destinations,
      fromCache: false,
      total: destinations.length
    });

  } catch (error) {
    console.error('❌ searchDestinations error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);

    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'API_AUTH_ERROR',
        message: 'Invalid SerpAPI key'
      });
    }

    if (error.response?.status === 429) {
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'SerpAPI rate limit exceeded. Please try again later.'
      });
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return res.status(504).json({
        success: false,
        error: 'TIMEOUT',
        message: 'SerpAPI request timed out'
      });
    }

    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to search destinations'
    });
  }
};

// ===========================================
// NUEVO: BUSCAR VUELOS CON SERPAPI (Google Flights)
// TAREA 86-87
// ===========================================
exports.searchFlights = async (req, res) => {
  try {
    const {
      departure_id,
      arrival_id,
      outbound_date,
      return_date,
      type = '2', // 1: Round trip, 2: One way, 3: Multi-city
      travel_class = '1', // 1: Economy, 2: Premium economy, 3: Business, 4: First
      currency = 'USD',
      adults = 1,
      children = 0,
      infants_in_seat = 0,
      infants_on_lap = 0,
      sort_by = '1',
      stops = '0',
      max_price,
      max_duration,
      hl = 'en',
      gl = 'us',
      deep_search = 'false'
    } = req.query;

    console.log('=== DEBUG searchFlights ===');
    console.log('departure_id:', departure_id);
    console.log('arrival_id:', arrival_id);
    console.log('outbound_date:', outbound_date);
    console.log('type:', type);
    console.log('========================');

    // Validar parámetros requeridos
    if (!departure_id || !arrival_id || !outbound_date) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'departure_id, arrival_id, and outbound_date are required'
      });
    }

    // Buscar en caché
    const cacheKey = `flight_${departure_id}_${arrival_id}_${outbound_date}_${type}`;
    
    try {
      const cachedResult = await docClient.send(new QueryCommand({
        TableName: process.env.DYNAMODB_TABLE_CACHE,
        IndexName: 'cacheKey-index',
        KeyConditionExpression: 'cacheKey = :cacheKey',
        ExpressionAttributeValues: {
          ':cacheKey': cacheKey
        },
        Limit: 1
      }));

      if (cachedResult.Items && cachedResult.Items.length > 0) {
        const cached = cachedResult.Items[0];
        const cacheAge = Date.now() - parseInt(cached.createdAt);
        const cacheTTL = 60 * 60 * 1000; // 1 hora para vuelos

        if (cacheAge < cacheTTL) {
          console.log('✅ Flight cache hit:', cacheKey);
          return res.status(200).json({
            success: true,
            message: 'Flight results from cache',
            data: JSON.parse(cached.data),
            fromCache: true
          });
        }
      }
    } catch (cacheError) {
      console.log('⚠️ Cache not available, continuing with SerpAPI...');
    }

    // Llamar a SerpAPI Google Flights
    const serpApiKey = process.env.SERPAPI_API_KEY;
    
    if (!serpApiKey) {
      console.error('❌ SERPAPI_API_KEY not configured');
      return res.status(500).json({
        success: false,
        error: 'CONFIG_ERROR',
        message: 'SerpAPI key not configured'
      });
    }

    const serpApiUrl = 'https://serpapi.com/search';
    const params = {
      engine: 'google_flights',
      departure_id: departure_id,
      arrival_id: arrival_id,
      outbound_date: outbound_date,
      type: type,
      currency: currency,
      hl: hl,
      gl: gl,
      adults: adults,
      children: children,
      infants_in_seat: infants_in_seat,
      infants_on_lap: infants_on_lap,
      sort_by: sort_by,
      stops: stops,
      deep_search: deep_search,
      api_key: serpApiKey
    };

    // Agregar return_date si es round trip
    if (type === '1' && return_date) {
      params.return_date = return_date;
    }

    // Agregar travel_class
    if (travel_class) {
      params.travel_class = travel_class;
    }

    // Agregar filtros opcionales
    if (max_price) {
      params.max_price = max_price;
    }

    if (max_duration) {
      params.max_duration = max_duration;
    }

    console.log('📤 Calling SerpAPI Google Flights:', {
      ...params,
      api_key: '***hidden***'
    });

    const response = await axios.get(serpApiUrl, {
      params: params,
      timeout: 30000 // 30 segundos para vuelos
    });

    console.log('✅ SerpAPI Flights response status:', response.status);

    // Formatear resultados de vuelos
    const flights = formatFlightResults(response.data);

    if (!flights || flights.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'NO_FLIGHTS',
        message: 'No flights found for your search'
      });
    }

    // Guardar en caché
    try {
      const timestamp = Date.now();
      const ttl = Math.floor((timestamp + 60 * 60 * 1000) / 1000); // 1 hora

      await docClient.send(new PutCommand({
        TableName: process.env.DYNAMODB_TABLE_CACHE,
        Item: {
          cacheId: `cache_${uuidv4()}`,
          cacheKey: cacheKey,
          data: JSON.stringify(flights),
          createdAt: timestamp,
          ttl: ttl
        }
      }));
      console.log('✅ Cached flight results:', cacheKey);
    } catch (cacheError) {
      console.error('⚠️ Failed to cache flight results:', cacheError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Flights found',
      data: flights,
      fromCache: false,
      total: flights.length,
      price_insights: response.data.price_insights || null
    });

  } catch (error) {
    console.error('❌ searchFlights error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error response:', error.response?.data);

    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'API_AUTH_ERROR',
        message: 'Invalid SerpAPI key'
      });
    }

    if (error.response?.status === 429) {
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'SerpAPI rate limit exceeded. Please try again later.'
      });
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return res.status(504).json({
        success: false,
        error: 'TIMEOUT',
        message: 'SerpAPI flight search timed out'
      });
    }

    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to search flights'
    });
  }
};

// ===========================================
// TAREA 87: FORMATEAR RESULTADOS DE SERPAPI (Destinations)
// ===========================================
function formatSerpApiResults(serpData, limit) {
  const results = [];

  const localResults = serpData.local_results || [];
  const places = serpData.places || [];

  const allPlaces = [...localResults, ...places];

  for (let i = 0; i < Math.min(allPlaces.length, limit); i++) {
    const place = allPlaces[i];
    
    results.push({
      id: place.place_id || `place_${i}`,
      name: place.title || place.name || 'Unknown',
      address: place.address || place.formatted_address || '',
      rating: place.rating || null,
      reviews: place.reviews || null,
      type: place.type || 'tourist_attraction',
      coordinates: {
        latitude: place.gps?.latitude || place.coordinates?.lat || null,
        longitude: place.gps?.longitude || place.coordinates?.lng || null
      },
      image: place.thumbnail || place.image || null,
      phone: place.phone || null,
      website: place.website || null,
      hours: place.hours || null,
      price: place.price || null
    });
  }

  console.log('📦 Formatted destinations:', results.length);
  return results;
}

// ===========================================
// NUEVO: FORMATEAR RESULTADOS DE VUELOS
// TAREA 87
// ===========================================
function formatFlightResults(serpData) {
  const flights = [];

  const bestFlights = serpData.best_flights || [];
  const otherFlights = serpData.other_flights || [];

  // Combinar best_flights y other_flights
  const allFlights = [...bestFlights, ...otherFlights];

  for (let i = 0; i < allFlights.length; i++) {
    const flight = allFlights[i];
    
    flights.push({
      id: `flight_${i}`,
      type: flight.type || 'One way',
      price: flight.price || null,
      currency: serpData.search_parameters?.currency || 'USD',
      total_duration: flight.total_duration || null, // in minutes
      carbon_emissions: flight.carbon_emissions || null,
      airline_logo: flight.airline_logo || null,
      departure_token: flight.departure_token || null,
      booking_token: flight.booking_token || null,
      flights: flight.flights?.map(leg => ({
        departure_airport: {
          name: leg.departure_airport?.name || '',
          id: leg.departure_airport?.id || '',
          time: leg.departure_airport?.time || ''
        },
        arrival_airport: {
          name: leg.arrival_airport?.name || '',
          id: leg.arrival_airport?.id || '',
          time: leg.arrival_airport?.time || ''
        },
        duration: leg.duration || null, // in minutes
        airplane: leg.airplane || '',
        airline: leg.airline || '',
        airline_logo: leg.airline_logo || '',
        travel_class: leg.travel_class || 'Economy',
        flight_number: leg.flight_number || '',
        legroom: leg.legroom || '',
        extensions: leg.extensions || [],
        ticket_also_sold_by: leg.ticket_also_sold_by || [],
        overnight: leg.overnight || false,
        often_delayed_by_over_30_min: leg.often_delayed_by_over_30_min || false
      })) || [],
      layovers: flight.layovers?.map(layover => ({
        duration: layover.duration || null,
        name: layover.name || '',
        id: layover.id || '',
        overnight: layover.overnight || false
      })) || []
    });
  }

  console.log('📦 Formatted flights:', flights.length);
  return flights;
}

// ===========================================
// TAREA 89: OBTENER DETALLES DE DESTINO
// ===========================================
exports.getDestinationDetails = async (req, res) => {
  try {
    const { placeId } = req.params;

    if (!placeId) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Place ID is required'
      });
    }

    // TODO: Implementar llamada a SerpAPI para detalles específicos
    res.status(200).json({
      success: true,
      message: 'Destination details (placeholder)',
      data: {
        placeId: placeId,
        name: 'Destination Name',
        description: 'Description will be fetched from SerpAPI'
      }
    });

  } catch (error) {
    console.error('getDestinationDetails error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to get destination details'
    });
  }
};