// gcpService.js

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { PutCommand } = require('@aws-sdk/lib-dynamodb');

// ✅ IMPORTAR función getAirportCode desde archivo externo
const { getAirportCode } = require('../utils/airportCodes');

const docClient = new DynamoDBClient({ region: process.env.AWS_REGION });

// ===========================================
// ✅ UTILIDAD: Construir prompt para Gemini - MEJORADO (English + Budget + Transport)
// ===========================================
function buildGeminiPrompt(tripData, travelers, preferences, budget) {
  var interests = travelers?.flatMap(function(t) { return t.interests; }) || [];
  var ecoFriendly = preferences?.ecoFriendly ? ' (eco-friendly options preferred)' : '';
  
  // ✅ Valores por defecto seguros para budget
  var budgetTotal = budget?.total || 0;
  var budgetCurrency = budget?.currency || 'USD';
  
  // ✅ Budget distribution percentages from Step 2
  var budgetDistribution = preferences?.budgetDistribution || {
    flights: 20,
    hotels: 15,
    food: 30,
    activities: 30,
    transport: 5
  };
  
  return `
You are a professional travel planner assistant. Create a detailed, day-by-day itinerary for a trip to ${tripData?.destination || 'Unknown'}.

## Trip Details:
- Destination: ${tripData?.destination || 'Unknown'}
- Dates: ${tripData?.startDate || 'TBD'} to ${tripData?.endDate || 'TBD'} (${tripData?.duration || 7} days)
- Travelers: ${travelers?.length || 1} (${travelers?.map(function(t) { return t.type; }).join(', ') || 'adult'})
- Interests: ${interests.join(', ') || 'general tourism'}${ecoFriendly}
- Total Budget: ${budgetCurrency}${budgetTotal}
- Budget Distribution:
  • Flights: ${budgetDistribution.flights}%
  • Hotels: ${budgetDistribution.hotels}%
  • Food & Dining: ${budgetDistribution.food}%
  • Activities & Tours: ${budgetDistribution.activities}%
  • Transport: ${budgetDistribution.transport}%

## Available Options:
- Flights: ${Array.isArray(tripData?.flights?.outboundFlights) ? tripData.flights.outboundFlights.length : 0} outbound options
- Hotels: ${Array.isArray(tripData?.hotels?.optimalHotels) ? tripData.hotels.optimalHotels.length : 0} recommended hotels
- Restaurants: ${Array.isArray(tripData?.restaurants) ? tripData.restaurants.length : 0} local dining options
- Attractions: ${Array.isArray(tripData?.attractions) ? tripData.attractions.length : 0} tourist attractions

## Requirements:
1. Create one activity per time slot (morning, afternoon, evening)
2. Include realistic travel times between locations
3. Prioritize walking and public transport${ecoFriendly ? ', and eco-friendly options' : ''}
4. Match activities to traveler interests: ${interests.join(', ')}
5. Respect opening hours and avoid scheduling conflicts
6. Include meal breaks at appropriate times
7. Add buffer time for transitions
8. Stay within total budget: ${budgetCurrency}${budgetTotal}
9. ✅ RESPECT BUDGET DISTRIBUTION: When selecting activities, restaurants, and transport options, ensure the estimated costs align with the budget distribution percentages provided above. For example, if transport is 5% of a $1000 budget, keep transport-related expenses around $50 total.
10. ✅ PROVIDE TRANSPORT GUIDANCE: For each activity transition, recommend the best transport method (walking, metro, taxi, Uber, bus, etc.) based on distance, cost, and local availability.

## Output Format (JSON):
{
  "dailyPlan": [...],
  "summary": {...},
  "budgetBreakdown": {...},
  "recommendations": {...}
}

Return ONLY valid JSON, no markdown, no explanations outside the JSON structure.
`.trim();
}

// ===========================================
// CLASE GCPService
// ===========================================
class GCPService {
  constructor() {
    this.gcpBaseUrl = process.env.GCP_BASE_URL;
    this.gcpApiKey = process.env.GCP_API_KEY?.trim();
    this.timeout = parseInt(process.env.GCP_TIMEOUT) || 180000;
    this.maxRetries = 2;
  }

  // ===========================================
  // UTILIDAD: Hacer request a GCP con autenticación y reintentos
  // ===========================================
  async _callGCPFunction(functionName, payload, retries = 0) {
    var requestId = 'req_' + uuidv4();
    var url = this.gcpBaseUrl + '/' + functionName;
    var startTime = Date.now();

    console.log('📤 [GCP Service] Calling ' + functionName + ' function', {
      requestId: requestId,
      url: url.replace(this.gcpApiKey, '***'),
      payloadSize: JSON.stringify(payload).length
    });

    try {
      var response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.gcpApiKey
        },
        timeout: this.timeout,
        validateStatus: function(status) { return status < 500; }
      });

      var duration = Date.now() - startTime;

      if (response.status >= 400) {
        console.warn('⚠️ [GCP Service] HTTP error response:', {
          requestId: requestId,
          functionName: functionName,
          status: response.status,
          error: response.data?.error,
          message: response.data?.message,
          duration: duration + 'ms'
        });

        if ((response.status >= 500 || response.status === 429) && retries < this.maxRetries) {
          var delay = 2000 * (retries + 1);
          console.log('⏳ [GCP Service] Retrying ' + functionName + ' in ' + delay + 'ms... (attempt ' + (retries + 1) + '/' + this.maxRetries + ')');
          await new Promise(function(resolve) { return setTimeout(resolve, delay); });
          return this._callGCPFunction(functionName, payload, retries + 1);
        }

        throw new Error('GCP API Error: ' + (response.data?.message || response.statusText));
      }

      console.log('✅ [GCP Service] ' + functionName + ' response received', {
        requestId: requestId,
        functionName: functionName,
        duration: duration + 'ms',
        attempts: retries + 1,
        success: response.data?.success
      });

      await this._logGCPCommunication({
        requestId: requestId,
        functionName: functionName,
        status: response.status,
        duration: duration + 'ms',
        attempts: retries + 1,
        requestData: payload,
        responseData: response.data,
        error: null
      });

      return response.data;

    } catch (error) {
      var duration = Date.now() - startTime;

      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
        if (retries < this.maxRetries) {
          var delay = 2000 * (retries + 1);
          console.log('⏳ [GCP Service] Retrying ' + functionName + ' after network error in ' + delay + 'ms... (attempt ' + (retries + 1) + '/' + this.maxRetries + ')');
          await new Promise(function(resolve) { return setTimeout(resolve, delay); });
          return this._callGCPFunction(functionName, payload, retries + 1);
        }
      }

      console.error('❌ [GCP Service] ' + functionName + ' error', {
        requestId: requestId,
        functionName: functionName,
        error: error.message,
        code: error.code,
        status: error.response?.status,
        duration: duration + 'ms',
        attempts: retries + 1
      });

      await this._logGCPCommunication({
        requestId: requestId,
        functionName: functionName,
        status: error.response?.status || 0,
        duration: duration + 'ms',
        attempts: retries + 1,
        requestData: payload,
        responseData: error.response?.data,
        error: error.message
      });

      throw error;
    }
  }

  // ===========================================
  // UTILIDAD: Log a audit_logs en DynamoDB - CORREGIDO
  // ===========================================
  async _logGCPCommunication(logData) {
    try {
      var timestamp = Date.now();
      var logId = 'log_' + uuidv4();

      await docClient.send(new PutCommand({
        TableName: process.env.DYNAMODB_TABLE_LOGS,
        Item: {
          logId: logId,
          timestamp: timestamp,
          tipoEvento: 'gcp_communication',
          resultado: logData.status !== undefined ? logData.status : 'unknown',
          razon: logData.functionName !== undefined ? logData.functionName : 'unknown',
          userId: null,
          metadata: {
            requestId: logData.requestId,
            function: logData.functionName,
            duration: logData.duration,
            attempts: logData.attempts,
            requestData: this._sanitizeRequestData(logData.requestData),
            responseData: this._sanitizeResponseData(logData.responseData),
            error: logData.error !== undefined && logData.error !== null ? logData.error.message : null
          }
        }
      }, {
        // ✅ FIX: Remover undefined values para DynamoDB
        removeUndefinedValues: true
      }));

      console.log('✅ [Audit] GCP communication logged', { logId: logId, functionName: logData.functionName });
    } catch (error) {
      console.error('❌ [Audit] Failed to log GCP communication', {
        error: error.message,
        requestId: logData?.requestId
      });
    }
  }

  // ===========================================
  // UTILIDAD: Sanitizar request data para logs
  // ===========================================
  _sanitizeRequestData(data) {
    if (!data) return null;
    var sanitized = Object.assign({}, data);
    delete sanitized.apiKey;
    delete sanitized.password;
    delete sanitized.token;
    return sanitized;
  }

  // ===========================================
  // UTILIDAD: Sanitizar response data para logs
  // ===========================================
  _sanitizeResponseData(data) {
    if (!data) return null;
    var sanitized = Object.assign({}, data);
    if (sanitized.data && sanitized.data.dailyPlan) {
      sanitized.data.dailyPlanCount = sanitized.data.dailyPlan?.length;
      delete sanitized.data.dailyPlan;
    }
    if (sanitized.itineraryData && sanitized.itineraryData.dailyPlan) {
      sanitized.itineraryData.dailyPlanCount = sanitized.itineraryData.dailyPlan?.length;
      delete sanitized.itineraryData.dailyPlan;
    }
    return sanitized;
  }

  // ===========================================
  // FUNCIONES INDIVIDUALES DE SERPAPI - ACTUALIZADAS CON DEBUG
  // ===========================================

  async searchFlights(origin, destination, startDate, endDate, travelers, travelClass, currency) {
    if (travelers === undefined) travelers = 1;
    
    // ✅ Normalizar travelClass a valores válidos para SerpAPI Google Flights
    // SerpAPI espera: '1'=economy, '2'=premium economy, '3'=business, '4'=first
    var classMap = {
      'economy': '1', '1': '1', 1: '1', '0': '1', 0: '1',  // 0 o '0' → economy (fallback seguro)
      'premium': '2', '2': '2', 2: '2', 'premium_economy': '2',
      'business': '3', '3': '3', 3: '3',
      'first': '4', '4': '4', 4: '4'
    };
    
    // ✅ Convertir a string y mapear, con fallback a '1' (economy)
    travelClass = classMap[String(travelClass)] || '1';
    
    if (currency === undefined) currency = 'USD';
    
    // ✅ DEBUG: Log detallado del origen antes de procesar
    console.log('🔍 [Flights] DEBUG - Origin input:', {
      raw: origin,
      typeof: typeof origin,
      length: origin?.length,
      charCodes: origin ? Array.from(origin).map(c => c.charCodeAt(0)) : null,
      trimmed: origin?.trim(),
      upper: origin?.toUpperCase()?.trim()
    });
    
    // ✅ Usar función importada desde airportCodes.js
    var originCode = getAirportCode(origin);
    var destinationCode = getAirportCode(destination);
    
    // ✅ DEBUG: Log resultado de getAirportCode
    console.log('✈️ [Flights] Airport code resolution:', {
      origin: origin,
      originCode: originCode,
      destination: destination,
      destinationCode: destinationCode
    });
    
    console.log('✈️ [Flights] Parameters:', {
      origin: origin, originCode: originCode,
      destination: destination, destinationCode: destinationCode,
      startDate: startDate,
      endDate: endDate,
      travelers: travelers,
      travelClass: travelClass,
      currency: currency
    });
    
    if (!originCode || !destinationCode) {
      console.error('❌ [Flights] Failed to resolve airport codes:', {
        origin, originCode,
        destination, destinationCode
      });
      throw new Error('Could not resolve airport codes for: origin=' + origin + ', destination=' + destination + '. Please use airport codes (e.g., JFK, LAX) or well-known city names.');
    }
    
    // ✅ El mismo travelClass se usa para outbound y return en la función GCP flights
    return this._callGCPFunction('flights', { 
      origin: originCode, 
      destination: destinationCode, 
      startDate: startDate, 
      endDate: endDate,
      travelers: travelers,
      travelClass: travelClass,
      currency: currency 
    });
  }

  async searchHotels(destination, checkIn, checkOut, travelers, hotelClass, budget) {
    if (travelers === undefined) travelers = 1;
    if (hotelClass === undefined) hotelClass = 'no-preference';
    return this._callGCPFunction('hotels', {
      destination: destination,
      checkIn: checkIn,
      checkOut: checkOut,
      travelers: travelers,
      hotelClass: hotelClass,
      budget: budget
    });
  }

  // ✅ WEATHER: Retornar estructura segura sin llamada externa (Gemini generará guidance)
  async getWeather(destination, startDate, endDate) {
    // ✅ Retornar estructura segura que Gemini usará para generar recomendaciones climáticas
    return Promise.resolve({
      success: true,
      data: {
        forecast: {
          snippet: `Climate guidance for ${destination} during ${startDate} to ${endDate} will be included in your personalized itinerary.`,
          recommendation: 'Check local weather forecast 3-5 days before departure for real-time conditions. Pack accordingly for the season.'
        }
      }
    });
  }

  async getRestaurants(destination, interests, travelers, date) {
    if (interests === undefined) interests = [];
    if (travelers === undefined) travelers = 1;
    return this._callGCPFunction('restaurants', {
      destination: destination,
      interests: interests,
      travelers: travelers,
      date: date
    });
  }

  async getAttractions(destination, interests, duration, date) {
    if (interests === undefined) interests = [];
    if (duration === undefined) duration = 7;
    return this._callGCPFunction('attractions', {
      destination: destination,
      interests: interests,
      duration: duration,
      date: date
    });
  }

  async getTransport(destination) {
    return this._callGCPFunction('transport', { destination: destination });
  }

  // ===========================================
  // ✅ NUEVO: Extraer y consolidar datos
  // ===========================================
  async extractAndConsolidate(tripData, travelers, budget, preferences) {
    var extractionId = 'ext_' + uuidv4();
    var startTime = Date.now();

    console.log('🔍 [Extraction] Starting data extraction', {
      extractionId: extractionId,
      destination: tripData?.destination,
      duration: tripData?.duration
    });

    try {
      var origin = tripData.origin;
      var destination = tripData.destination;
      var startDate = tripData.startDate;
      var endDate = tripData.endDate;
      var duration = tripData.duration || 7;
      var travelersCount = travelers?.length || 1;
      var interests = travelers?.flatMap(function(t) { return t.interests; }) || [];
      var hotelClass = preferences?.hotelClass || 'no-preference';
      var flightClass = preferences?.flightClass || '1';
      var currency = budget?.currency || 'USD';
      var budgetTotal = budget?.total;

      // ✅ DEBUG: Log de datos de entrada
      console.log('🔍 [Extraction] Input data:', {
        origin,
        destination,
        startDate,
        endDate,
        duration,
        travelersCount,
        flightClass,
        hotelClass
      });

      var flightsPromise = this.searchFlights(
        origin, destination, startDate, endDate,
        travelersCount, flightClass, currency
      ).catch(function(e) { return { success: false, error: e.message, data: null }; });
      
      var hotelsPromise = this.searchHotels(
        destination, startDate, endDate,
        travelersCount, hotelClass, budgetTotal
      ).catch(function(e) { return { success: false, error: e.message, data: null }; });
      
      // ✅ Weather: ya retorna estructura segura sin llamada externa
      var weatherPromise = this.getWeather(destination, startDate, endDate)
        .catch(function(e) { return { success: false, error: e.message, data: null }; });
      
      var restaurantsPromise = this.getRestaurants(
        destination, interests, travelersCount, startDate
      ).catch(function(e) { return { success: false, error: e.message, data: null }; });
      
      var attractionsPromise = this.getAttractions(
        destination, interests, duration, startDate
      ).catch(function(e) { return { success: false, error: e.message, data: null }; });
      
      var transportPromise = this.getTransport(destination)
        .catch(function(e) { return { success: false, error: e.message, data: null }; });

      var results = await Promise.allSettled([
        flightsPromise, hotelsPromise, weatherPromise,
        restaurantsPromise, attractionsPromise, transportPromise
      ]);

      var flights = results[0];
      var hotels = results[1];
      var weather = results[2];
      var restaurants = results[3];
      var attractions = results[4];
      var transport = results[5];

      var durationMs = Date.now() - startTime;

      var consolidatedData = {
        tripData: { origin: origin, destination: destination, startDate: startDate, endDate: endDate, duration: duration },
        travelers: travelers || [],
        budget: budget || {},
        preferences: preferences || {},
        flights: flights.status === 'fulfilled' && flights.value?.success ? flights.value.data : null,
        hotels: hotels.status === 'fulfilled' && hotels.value?.success ? hotels.value.data : null,
        weather: weather.status === 'fulfilled' && weather.value?.success ? weather.value.data : null,
        restaurants: restaurants.status === 'fulfilled' && restaurants.value?.success ? (restaurants.value.data?.activities || []) : [],
        attractions: attractions.status === 'fulfilled' && attractions.value?.success 
          ? (attractions.value.data?.activities || attractions.value.data?.attractions || []) 
          : [],
        transport: transport.status === 'fulfilled' && transport.value?.success ? transport.value.data?.transport : null,
        summary: {
          totalFunctions: 6,
          successfulFunctions: [flights, hotels, weather, restaurants, attractions, transport].filter(
            function(r) { return r.status === 'fulfilled' && r.value?.success; }
          ).length,
          totalItems: {
            flights: flights.status === 'fulfilled' && flights.value?.success ? flights.value.data?.outboundFlights?.length || 0 : 0,
            hotels: hotels.status === 'fulfilled' && hotels.value?.success ? hotels.value.data?.optimalHotels?.length || 0 : 0,
            restaurants: restaurants.status === 'fulfilled' && restaurants.value?.success ? restaurants.value.data?.activities?.length || 0 : 0,
            attractions: attractions.status === 'fulfilled' && attractions.value?.success 
              ? ((attractions.value.data?.activities || attractions.value.data?.attractions)?.length || 0) 
              : 0,
            transport: transport.status === 'fulfilled' && transport.value?.success ? transport.value.data?.transport?.options?.length || 0 : 0
          }
        }
      };

      console.log('✅ [Extraction] Data extraction completed', {
        extractionId: extractionId,
        duration: durationMs + 'ms',
        summary: consolidatedData.summary
      });

      return {
        success: true,
        extractionId: extractionId,
        duration: durationMs + 'ms',
        data: consolidatedData
      };

    } catch (error) {
      console.error('❌ [Extraction] Extraction failed:', { error: error.message });
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  // ===========================================
  // ✅ NUEVO: Generar itinerario con Gemini - SIMPLIFICADO
  // ===========================================
  async generateItineraryWithGemini(payload) {
    var itineraryId = 'itin_' + uuidv4();
    var startTime = Date.now();

    console.log('🤖 [Gemini] Starting itinerary generation', {
      itineraryId: itineraryId,
      destination: payload.tripData?.destination
    });

    try {
      // ✅ Construir prompt simple y directo
      var prompt = this._buildSimplePrompt(payload);

      // ✅ Payload para Gemini: solo prompt + datos estructurados
      var geminiPayload = {
        contents: [{ 
          parts: [{ 
            text: prompt 
          }] 
        }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 40000,
          responseMimeType: "application/json"
        }
      };

      // ✅ Llamar directamente a Gemini API
      var geminiApiKey = process.env.GEMINI_API_KEY;
      var geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

      console.log('📤 [Gemini] Calling Gemini API directly...');
      var response = await axios.post(geminiUrl, geminiPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 180000
      });

      var totalDuration = Date.now() - startTime;
      var responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      console.log('📥 [Gemini] Respuesta raw recibida:', {
        finishReason: response.data?.candidates?.[0]?.finishReason,
        tokenCount: response.data?.usageMetadata?.candidatesTokenCount,
        textLength: responseText?.length || 0,
        textPreview: responseText ? responseText.substring(0, 68000) + '...' : 'NO TEXT'
      });

      if (!responseText) {
        throw new Error('No response text from Gemini');
      }

      // ✅ Parsear JSON de respuesta
      var itineraryData;
      try {
        itineraryData = JSON.parse(responseText);
        console.log('✅ [Gemini] JSON parseado exitosamente');
        console.log('📋 [Gemini] Estructura del itinerario parseado:', {
          hasSummary: !!itineraryData?.summary,
          hasDailyPlan: Array.isArray(itineraryData?.dailyPlan),
          dailyPlanLength: itineraryData?.dailyPlan?.length,
          totalActivities: itineraryData?.dailyPlan?.reduce(function(sum, day) { 
            return sum + (day?.activities?.length || 0); 
          }, 0),
          summaryTitle: itineraryData?.summary?.title
        });
      } catch (parseError) {
        var jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          itineraryData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to parse Gemini response as JSON: ' + parseError.message);
        }
      }

      // ✅ Validar estructura mínima
      if (!itineraryData?.summary?.title || !Array.isArray(itineraryData?.dailyPlan)) {
        console.warn('⚠️ [Gemini] Response missing required fields, using fallback');
        itineraryData = this._generateFallbackItinerary(payload);
      }

      console.log('✅ [Gemini] Itinerary generated', {
        itineraryId: itineraryId,
        duration: totalDuration + 'ms',
        days: itineraryData?.dailyPlan?.length,
        activities: itineraryData?.dailyPlan?.reduce(function(sum, day) { 
          return sum + (day?.activities?.length || 0); 
        }, 0)
      });

      return {
        success: true,
        itineraryId: itineraryId,
        duration: totalDuration + 'ms',
        data: itineraryData
      };

    } catch (error) {
      console.error('❌ [Gemini] Generation failed:', { error: error.message });
      
      var fallbackData = this._generateFallbackItinerary(payload);
      
      return {
        success: true,
        itineraryId: 'itin_fallback_' + uuidv4(),
        duration: Date.now() - startTime + 'ms',
        data: fallbackData,
        warning: 'Generated with fallback due to: ' + error.message
      };
    }
  }

  // ===========================================
  // ✅ UTILIDAD: Construir prompt simple y directo - MEJORADO (English + Budget + Transport)
  // ===========================================
  _buildSimplePrompt(payload) {
    var { tripData, travelers, budget, preferences, flights, hotels, restaurants, attractions, weather, transport } = payload;
  
    // ✅ Safe access para flights que puede ser null
    var outboundFlights = flights?.outboundFlights || [];
    var returnFlights = flights?.returnFlights || [];
    var flightPrice = outboundFlights[0]?.price?.amount || 0;
    var flightDuration = outboundFlights[0]?.duration?.formatted || 'N/A';
    
    // ✅ Safe access para weather
    var weatherSnippet = weather?.forecast?.snippet || 'Weather considerations will be included in your itinerary.';
    
    // ✅ Safe access para transport tips (fallback)
    var transportTips = Array.isArray(transport?.tips) ? transport.tips : [];
    
    // ✅ Budget distribution percentages from Step 2
    var budgetDistribution = preferences?.budgetDistribution || {
      flights: 20,
      hotels: 15,
      food: 30,
      activities: 30,
      transport: 5
    };
  
    var extractionData = {
      trip: {
        origin: tripData?.origin,
        destination: tripData?.destination,
        startDate: tripData?.startDate,
        endDate: tripData?.endDate,
        duration: tripData?.duration
      },
      travelers: travelers,
      budget: { 
        total: budget?.total, 
        currency: budget?.currency,
        distribution: budgetDistribution  // ✅ Incluir distribución de presupuesto
      },
      preferences: preferences,
      flights: {
        outbound: outboundFlights.slice(0, 3).map(function(f) {
          return {
            airline: f?.airline?.name,
            price: f?.price?.amount,
            duration: f?.duration?.formatted
          };
        }),
        return: returnFlights.slice(0, 3).map(function(f) {
          return {
            airline: f?.airline?.name,
            price: f?.price?.amount,
            duration: f?.duration?.formatted
          };
        })
      },
      hotels: (hotels?.optimalHotels || []).slice(0, 3).map(function(h) {
        return {
          name: h?.name,
          price: h?.pricePerNight?.amount,
          rating: h?.rating,
          location: h?.location
        };
      }),
      restaurants: (restaurants || []).slice(0, 10).map(function(r) {
        return {
          name: r?.name,
          category: r?.category,
          price: r?.pricePerPerson?.amount,
          rating: r?.rating
        };
      }),
      attractions: (attractions || []).slice(0, 12).map(function(a) {
        return {
          name: a?.name,
          type: a?.type,
          rating: a?.rating
        };
      }),
      weather: weatherSnippet,
      transport: transportTips
    };

    return `You are a professional travel planner assistant. Create a detailed, day-by-day itinerary for a trip to ${tripData?.destination || 'Unknown'}.

## Trip Details:
- Destination: ${tripData?.destination || 'Unknown'}
- Dates: ${tripData?.startDate || 'TBD'} to ${tripData?.endDate || 'TBD'} (${tripData?.duration || 7} days)
- Travelers: ${travelers?.length || 1} (${travelers?.map(function(t) { return t.type; }).join(', ') || 'adult'})
- Interests: ${(travelers?.flatMap(function(t) { return t.interests; }) || []).join(', ') || 'general tourism'}${preferences?.ecoFriendly ? ' (eco-friendly options preferred)' : ''}
- Total Budget: ${budget?.currency || 'USD'}${budget?.total || 0}
- Budget Distribution:
  • Flights: ${budgetDistribution.flights}%
  • Hotels: ${budgetDistribution.hotels}%
  • Food & Dining: ${budgetDistribution.food}%
  • Activities & Tours: ${budgetDistribution.activities}%
  • Transport: ${budgetDistribution.transport}%

## Available Options:
- Flights: ${outboundFlights.length} outbound options available
- Hotels: ${(hotels?.optimalHotels || []).length} recommended hotels
- Restaurants: ${restaurants?.length || 0} local dining options
- Attractions: ${attractions?.length || 0} tourist attractions

## Requirements:
1. Create one activity per time slot (morning, afternoon, evening)
2. Include realistic travel times between locations
3. Prioritize walking and public transport${preferences?.ecoFriendly ? ', and eco-friendly options' : ''}
4. Match activities to traveler interests: ${(travelers?.flatMap(function(t) { return t.interests; }) || []).join(', ')}
5. Respect opening hours and avoid scheduling conflicts
6. Include meal breaks at appropriate times
7. Add buffer time for transitions
8. Stay within total budget: ${budget?.currency || 'USD'}${budget?.total || 0}
9. ✅ RESPECT BUDGET DISTRIBUTION: When selecting activities, restaurants, and transport options, ensure the estimated costs align with the budget distribution percentages provided above. For example, if transport is 5% of a $1000 budget, keep transport-related expenses around $50 total.
10. ✅ PROVIDE TRANSPORT GUIDANCE: For each activity transition, recommend the best transport method (walking, metro, taxi, Uber, bus, etc.) based on distance, cost, and local availability. Include this in the "transport" field of each activity.

## Weather Considerations:
Based on the destination (${tripData?.destination}) and travel dates (${tripData?.startDate} to ${tripData?.endDate}), include in recommendations.weatherConsiderations:
- Typical weather conditions for that season (temperature, rain, etc.)
- Appropriate clothing recommendations
- Tips for best times for outdoor activities
- Alternative activities in case of bad weather

## Transport Guidance:
For each activity in the daily plan, include in the "transport" object:
- fromPrevious: how to get from the previous activity (walking, public-transport, taxi, uber, etc.)
- estimatedTime: approximate travel time (e.g., "15 min", "1h 30m")
- recommendedMethod: the best transport option with brief justification (e.g., "metro - fastest and cheapest option")
- estimatedCost: approximate cost if applicable (e.g., "$2.50 for metro ticket")

## Output Format (JSON ONLY, no markdown, no explanations):
{
  "summary": {
    "title": "Catchy itinerary title",
    "description": "Brief description of the trip",
    "destination": "${tripData?.destination}",
    "duration": ${tripData?.duration || 7},
    "totalBudget": ${budget?.total || 0},
    "currency": "${budget?.currency || 'USD'}",
    "travelDates": { "start": "${tripData?.startDate}", "end": "${tripData?.endDate}" }
  },
  "dailyPlan": [
    {
      "day": 1,
      "date": "${tripData?.startDate}",
      "theme": "Day theme",
      "activities": [
        {
          "startTime": "HH:MM",
          "endTime": "HH:MM", 
          "type": "attraction|restaurant|transport|hotel",
          "name": "Place name",
          "description": "Brief description",
          "location": "Area/neighborhood",
          "price": { "amount": 0, "currency": "USD", "formatted": "$0" },
          "duration": 90,
          "crowdLevel": "quiet|moderate|busy",
          "transport": {
            "fromPrevious": "walking|public-transport|taxi|uber|bus|metro",
            "estimatedTime": "X min",
            "recommendedMethod": "Brief justification for this transport choice",
            "estimatedCost": { "amount": 0, "currency": "USD", "formatted": "$0" }
          }
        }
      ],
      "dailySummary": "Summary of the day"
    }
  ],
  "budgetBreakdown": {
    "flights": 0,
    "hotels": 0,
    "food": 0,
    "activities": 0,
    "transport": 0,
    "total": 0
  },
  "recommendations": {
    "packingTips": ["tip1", "tip2"],
    "localCustoms": ["custom1", "custom2"],
    "bestTimeToVisit": "Recommendation based on climate and season",
    "weatherConsiderations": "Guidance: June in Tokyo is warm and humid (73-83°F) with occasional rain. Pack light, breathable clothing and a compact umbrella.",
    "transportGuidance": "General transport tips for ${tripData?.destination}: e.g., 'The metro is the most efficient way to get around. Buy a day pass for unlimited travel. Taxis are available but can be expensive during rush hour.'"
  }
}

## Critical Rules:
- Return ONLY valid JSON, no markdown, no text before or after
- Use the data provided in extractionData when possible
- If data is missing, use reasonable default values
- Ensure dailyPlan has exactly ${tripData?.duration || 7} days
- ✅ Include realistic weatherConsiderations based on destination and dates
- ✅ Include transport recommendations for each activity with method, time, and cost
- ✅ Respect budget distribution percentages when estimating activity costs

Generate now:`.trim();
  }

  // ===========================================
  // ✅ UTILIDAD: Fallback determinístico si Gemini falla
  // ===========================================
  _generateFallbackItinerary(payload) {
    var { tripData, hotels, restaurants, attractions, budget } = payload;
    var duration = tripData?.duration || 7;
    var startDate = tripData?.startDate ? new Date(tripData.startDate) : new Date();
  
    var bestHotel = (hotels?.optimalHotels || [])[0] || {
      name: 'Local Hotel',
      pricePerNight: { amount: 100, currency: 'USD', formatted: '$100' },
      rating: 4,
      location: tripData?.destination
    };
  
    var dailyPlan = [];
    for (var day = 1; day <= duration; day++) {
      var date = new Date(startDate);
      date.setDate(date.getDate() + day - 1);
      var dateStr = date.toISOString().split('T')[0];
    
      dailyPlan.push({
        day: day,
        date: dateStr,
        theme: day === 1 ? 'Arrival & Explore' : day === duration ? 'Departure' : 'Discovery',
        activities: [
          {
            startTime: '09:00',
            endTime: '11:00',
            type: 'attraction',
            name: (attractions || [])[day % ((attractions || []).length || 1)]?.name || 'Local Exploration',
            description: 'Explore local attractions',
            location: tripData?.destination,
            price: { amount: 0, currency: 'USD', formatted: '$0' },
            duration: 120,
            crowdLevel: 'moderate',
            transport: { fromPrevious: null, estimatedTime: '15 min', recommendedMethod: 'walking' }
          },
          {
            startTime: '12:00',
            endTime: '13:30',
            type: 'restaurant',
            name: (restaurants || [])[day % ((restaurants || []).length || 1)]?.name || 'Local Restaurant',
            description: 'Lunch break',
            location: tripData?.destination,
            price: { amount: 25, currency: 'USD', formatted: '$25' },
            duration: 90,
            crowdLevel: 'moderate',
            transport: { fromPrevious: 'walking', estimatedTime: '10 min', recommendedMethod: 'walking' }
          },
          {
            startTime: '14:00',
            endTime: '17:00',
            type: 'attraction',
            name: (attractions || [])[(day + 1) % ((attractions || []).length || 1)]?.name || 'Cultural Site',
            description: 'Afternoon activity',
            location: tripData?.destination,
            price: { amount: 15, currency: 'USD', formatted: '$15' },
            duration: 180,
            crowdLevel: 'busy',
            transport: { fromPrevious: 'public-transport', estimatedTime: '20 min', recommendedMethod: 'public-transport' }
          }
        ],
        dailySummary: 'Day ' + day + ' in ' + (tripData?.destination || 'destination')
      });
    }
  
    return {
      summary: {
        title: duration + '-Day ' + (tripData?.destination || 'Trip') + ' Itinerary',
        description: 'A personalized trip to ' + (tripData?.destination || 'destination'),
        destination: tripData?.destination,
        duration: duration,
        totalBudget: budget?.total || 0,
        currency: budget?.currency || 'USD',
        travelDates: { start: tripData?.startDate, end: tripData?.endDate }
      },
      dailyPlan: dailyPlan,
      budgetBreakdown: {
        flights: 0,
        hotels: (bestHotel?.pricePerNight?.amount || 100) * duration,
        food: 50 * duration,
        activities: 30 * duration,
        transport: 20 * duration,
        total: (bestHotel?.pricePerNight?.amount || 100) * duration + 100 * duration
      },
      recommendations: {
        packingTips: ['Comfortable walking shoes', 'Weather-appropriate clothing'],
        localCustoms: ['Learn basic greetings', 'Carry cash for small purchases'],
        bestTimeToVisit: 'Check local weather before travel',
        weatherConsiderations: 'Weather guidance will be provided based on your destination and travel dates.'
      }
    };
  }

  // ===========================================
  // FUNCION PRINCIPAL: Generar Itinerario Completo
  // ===========================================
  async generateFullItinerary(tripData, travelers, budget, preferences) {
    var itineraryId = 'itin_' + uuidv4();
    var startTime = Date.now();

    console.log('🚀 [GCP Service] Starting full itinerary generation', {
      itineraryId: itineraryId,
      destination: tripData?.destination,
      duration: tripData?.duration,
      travelers: travelers?.length
    });

    try {
      console.log('📤 [GCP Service] Calling extraction...');
      var extractionResult = await this.extractAndConsolidate(tripData, travelers, budget, preferences);
      
      if (!extractionResult.success) {
        throw new Error('Extraction failed: ' + extractionResult.error);
      }

      console.log('🤖 [GCP Service] Calling Gemini itinerary...');
      var itineraryPayload = {
        tripData: extractionResult.data.tripData,
        travelers: extractionResult.data.travelers,
        budget: extractionResult.data.budget,
        preferences: extractionResult.data.preferences,
        flights: extractionResult.data.flights,
        hotels: extractionResult.data.hotels,
        restaurants: extractionResult.data.restaurants,
        attractions: extractionResult.data.attractions,
        weather: extractionResult.data.weather,
        transport: extractionResult.data.transport
      };

      var itineraryResult = await this.generateItineraryWithGemini(itineraryPayload);

      if (!itineraryResult.success) {
        throw new Error('Gemini generation failed: ' + itineraryResult.error);
      }

      var totalDuration = Date.now() - startTime;

      console.log('✅ [GCP Service] Full itinerary generated successfully', {
        itineraryId: itineraryId,
        totalDuration: totalDuration + 'ms',
        days: itineraryResult.data?.dailyPlan?.length
      });

      return {
        success: true,
        itineraryId: itineraryId,
        totalDuration: totalDuration + 'ms',
        extraction: {
          summary: extractionResult.data.summary,
          duration: extractionResult.duration
        },
        itinerary: {
          id: itineraryResult.itineraryId,
          dailyPlan: itineraryResult.data?.dailyPlan,
          summary: itineraryResult.data?.summary,
          recommendations: itineraryResult.data?.recommendations
        }
      };

    } catch (error) {
      var totalDuration = Date.now() - startTime;

      console.error('❌ [GCP Service] Full itinerary generation failed:', {
        itineraryId: itineraryId,
        error: error.message,
        code: error.code,
        totalDuration: totalDuration + 'ms'
      });

      throw error;
    }
  }

  // ===========================================
  // FUNCION: Generar itinerario con datos ya enriquecidos
  // ===========================================
  async generateItineraryFromEnrichedData(consolidatedData) {
    var itineraryId = 'itin_' + uuidv4();
    var startTime = Date.now();

    console.log('🚀 [GCP Service] Generating itinerary from enriched data', {
      itineraryId: itineraryId,
      destination: consolidatedData.tripData?.destination
    });

    try {
      var itineraryResult = await this.generateItineraryWithGemini(consolidatedData);

      var totalDuration = Date.now() - startTime;

      console.log('✅ [GCP Service] Itinerary generated successfully', {
        itineraryId: itineraryId,
        totalDuration: totalDuration + 'ms',
        days: itineraryResult.data?.dailyPlan?.length
      });

      return {
        success: true,
        itineraryId: itineraryId,
        totalDuration: totalDuration + 'ms',
        data: itineraryResult.data
      };

    } catch (error) {
      console.error('❌ [GCP Service] Itinerary generation failed:', {
        itineraryId: itineraryId,
        error: error.message
      });
      throw error;
    }
  }

  // ===========================================
  // 🧪 FUNCION DE PRUEBA: Consolidar datos sin IA
  // ===========================================
  async testConsolidateData(tripData, travelers, budget, preferences) {
    return this.extractAndConsolidate(tripData, travelers, budget, preferences);
  }
}

// ✅ Exportar instancia singleton
var gcpServiceInstance = new GCPService();

// ✅ Exportar funciones para uso en controllers
gcpServiceInstance.extractAndConsolidate = gcpServiceInstance.extractAndConsolidate.bind(gcpServiceInstance);
gcpServiceInstance.generateItineraryWithGemini = gcpServiceInstance.generateItineraryWithGemini.bind(gcpServiceInstance);
gcpServiceInstance.testConsolidateData = gcpServiceInstance.testConsolidateData.bind(gcpServiceInstance);

module.exports = gcpServiceInstance;